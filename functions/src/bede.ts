import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { GoogleGenAI, Content } from '@google/genai';

// ---------------------------------------------------------------------------
// Gemini API key — pulled from Firebase Secret Manager at runtime.
// Set with:  firebase functions:secrets:set GEMINIAPI_KEY
// ---------------------------------------------------------------------------
const GEMINI_API_KEY = defineSecret('GEMINIAPI_KEY');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MODEL_ID = 'gemini-2.5-flash';
const FREE_DAILY_LIMIT = 10;
const HISTORY_TURNS = 8; // number of prior (user + assistant) messages fed back to Gemini
const MAX_OUTPUT_TOKENS = 800;
const MAX_USER_MESSAGE_LEN = 1000;
const MAX_SOURCES_RETURNED = 6;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LandmarkRecord {
  name?: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  yearBuilt?: number;
  historicalSignificance?: string;
  editorialSummary?: string;
  visitingHours?: string;
}

interface SubscriptionRecord {
  status?: 'free' | 'trial' | 'active' | 'expired' | 'cancelled';
  subscriptionEndDate?: string | null;
  trialEndDate?: string | null;
  gracePeriodExpiresDate?: string | null;
  referralBonusExpiry?: string;
}

interface BedeSource {
  title: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function todayKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Mirrors `subscriptionService.isPremiumActive` on the client. Lenient by
 * design — trusts `status` field, only revokes access on a clearly-past
 * subscriptionEndDate. Lifecycle webhooks update status on real events.
 */
function isPremium(record: SubscriptionRecord | null): boolean {
  if (!record) return false;
  const now = new Date();

  if (record.status === 'active') {
    if (!record.subscriptionEndDate) return true;
    const end = new Date(record.subscriptionEndDate).getTime();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    if (end + ONE_DAY_MS > now.getTime()) return true;
    if (record.gracePeriodExpiresDate && new Date(record.gracePeriodExpiresDate) > now) {
      return true;
    }
    return false;
  }
  if (record.status === 'trial') {
    if (record.trialEndDate && record.subscriptionEndDate) {
      const trialEnd = new Date(record.trialEndDate).getTime();
      const subEnd = new Date(record.subscriptionEndDate).getTime();
      if (trialEnd <= now.getTime() && subEnd <= now.getTime()) return false;
    }
    return true;
  }
  if (record.gracePeriodExpiresDate && new Date(record.gracePeriodExpiresDate) > now) {
    return true;
  }
  if (record.referralBonusExpiry && new Date(record.referralBonusExpiry) > now) {
    return true;
  }
  return false;
}

function buildSystemPrompt(landmark: LandmarkRecord): string {
  const lines: string[] = [
    "You are Bede, a warm and knowledgeable guide to America's historical landmarks, featured inside the Historia app.",
    'Named after the Venerable Bede (672–735) — the monk often called the Father of English History — you approach every place with curiosity, historical rigor, and a touch of dry wit.',
    '',
    'You are speaking with a user who is currently looking at:',
    '',
    `  Name: ${landmark.name ?? 'Unknown landmark'}`,
  ];

  if (landmark.category) lines.push(`  Category: ${landmark.category}`);

  const locationParts = [landmark.address, landmark.city, landmark.state].filter(Boolean);
  if (locationParts.length > 0) lines.push(`  Location: ${locationParts.join(', ')}`);

  if (landmark.yearBuilt != null) lines.push(`  Established: ${landmark.yearBuilt}`);
  if (landmark.editorialSummary) lines.push(`  Overview: ${landmark.editorialSummary}`);
  if (landmark.description) lines.push(`  Description: ${landmark.description}`);
  if (landmark.historicalSignificance) {
    lines.push(`  Historical significance: ${landmark.historicalSignificance}`);
  }

  lines.push(
    '',
    'Guidelines:',
    "  • You have a Google Search tool. USE IT for any question about live or recent information — visiting hours, ticket prices, phone numbers, websites, current events, what's open today, recent news. Always search before answering these.",
    '  • For historical questions, lean on well-documented sources. If a fact is contested, say so. If you genuinely do not know, say so plainly — never invent.',
    '  • Keep replies tight: 1–3 short paragraphs for most questions. Longer only when the user asks for depth.',
    '  • Light Markdown is fine — **bold** for names, `-` for lists. No headers.',
    '  • When a question drifts away from history, museums, or this landmark, gently steer back: "A fine question — but one for another chapter. About ' +
      (landmark.name ?? 'this place') +
      ': …"',
    '  • Never mention you are an AI, a language model, or that you are Gemini. You are Bede.',
    '  • You may note when something is contested by historians. Always prefer nuance over neat narrative.',
  );

  return lines.join('\n');
}

/**
 * Pull a clean { title, url } list from Gemini's groundingMetadata.
 * Dedupes by URL and caps at MAX_SOURCES_RETURNED entries.
 */
function extractSources(metadata: unknown): BedeSource[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const meta = metadata as { groundingChunks?: unknown[] };
  if (!Array.isArray(meta.groundingChunks)) return [];

  const seen = new Set<string>();
  const out: BedeSource[] = [];

  for (const chunk of meta.groundingChunks) {
    if (!chunk || typeof chunk !== 'object') continue;
    const web = (chunk as { web?: { uri?: string; title?: string } }).web;
    if (!web || !web.uri) continue;
    if (seen.has(web.uri)) continue;
    seen.add(web.uri);
    out.push({
      url: web.uri,
      title: (web.title ?? '').trim() || new URL(web.uri).hostname,
    });
    if (out.length >= MAX_SOURCES_RETURNED) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// askBede — HTTP endpoint
//
// POST /askBede
// Headers:
//   Authorization: Bearer <Firebase ID token>
// Body:
//   { "landmarkId": "abc", "message": "When was this built?" }
//
// Returns:
//   200 { reply, sources, remainingToday, dailyLimit, isPremium }
//   400 validation error
//   401 missing / invalid token
//   404 landmark not found
//   429 daily cap reached
//   500 internal
// ---------------------------------------------------------------------------
export const askBede = onRequest(
  {
    cors: true,
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '512MiB',
    secrets: [GEMINI_API_KEY],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Use POST.' });
      return;
    }

    // ---- Auth ----
    const authHeader = req.get('authorization') ?? '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      res.status(401).json({ error: 'Missing Authorization: Bearer <idToken> header.' });
      return;
    }

    let uid: string;
    try {
      const decoded = await admin.auth().verifyIdToken(match[1]);
      uid = decoded.uid;
    } catch (err) {
      console.warn('askBede: invalid ID token', err);
      res.status(401).json({ error: 'Invalid or expired Firebase ID token.' });
      return;
    }

    // ---- Input validation ----
    const { landmarkId, message } = (req.body ?? {}) as {
      landmarkId?: string;
      message?: string;
    };
    if (!landmarkId || typeof landmarkId !== 'string') {
      res.status(400).json({ error: 'Body must include `landmarkId` string.' });
      return;
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Body must include non-empty `message` string.' });
      return;
    }
    const userMessage = message.trim().slice(0, MAX_USER_MESSAGE_LEN);

    const db = admin.firestore();

    try {
      // ---- Load landmark + subscription in parallel ----
      const [landmarkSnap, subSnap] = await Promise.all([
        db.collection('landmarks').doc(landmarkId).get(),
        db.collection('subscriptions').doc(uid).get(),
      ]);

      if (!landmarkSnap.exists) {
        res.status(404).json({ error: 'Landmark not found.' });
        return;
      }
      const landmark = landmarkSnap.data() as LandmarkRecord;
      const subscription = (subSnap.exists ? subSnap.data() : null) as SubscriptionRecord | null;
      const premium = isPremium(subscription);
      const dailyLimit = premium ? null : FREE_DAILY_LIMIT;

      // ---- Daily usage cap (atomic transaction) — free users only ----
      const usageRef = db.collection('users').doc(uid).collection('bedeUsage').doc(todayKey());
      let remainingToday: number | null = null;
      if (!premium) {
        try {
          await db.runTransaction(async tx => {
            const snap = await tx.get(usageRef);
            const current = snap.exists ? (snap.data()?.count as number | undefined) ?? 0 : 0;
            if (current >= FREE_DAILY_LIMIT) {
              throw new Error('OVER_LIMIT');
            }
            tx.set(
              usageRef,
              {
                date: todayKey(),
                count: current + 1,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
            remainingToday = FREE_DAILY_LIMIT - (current + 1);
          });
        } catch (txErr) {
          if (txErr instanceof Error && txErr.message === 'OVER_LIMIT') {
            res.status(429).json({
              error: `You've used your ${FREE_DAILY_LIMIT} free Bede messages for today. Upgrade to Historia Pro for unlimited, or come back tomorrow.`,
              remainingToday: 0,
              dailyLimit: FREE_DAILY_LIMIT,
              isPremium: premium,
            });
            return;
          }
          throw txErr;
        }
      }

      // ---- Load prior conversation (last HISTORY_TURNS messages) ----
      const chatRef = db.collection('users').doc(uid).collection('bedeChats').doc(landmarkId);
      const messagesRef = chatRef.collection('messages');
      const historySnap = await messagesRef
        .orderBy('createdAt', 'desc')
        .limit(HISTORY_TURNS)
        .get();

      const historyDocs = historySnap.docs.map(d => d.data() as { role: string; text: string });
      historyDocs.reverse(); // chronological order

      // Gemini history must start with a user turn. Trim leading assistant turn(s).
      while (historyDocs.length > 0 && historyDocs[0].role !== 'user') {
        historyDocs.shift();
      }
      const history: Content[] = historyDocs.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }));

      // ---- Persist the user message before calling Gemini ----
      await messagesRef.add({
        role: 'user',
        text: userMessage,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ---- Call Gemini with Google Search grounding ----
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
      const contents: Content[] = [
        ...history,
        { role: 'user', parts: [{ text: userMessage }] },
      ];

      let reply = '';
      let sources: BedeSource[] = [];
      try {
        const result = await ai.models.generateContent({
          model: MODEL_ID,
          contents,
          config: {
            systemInstruction: buildSystemPrompt(landmark),
            temperature: 0.7,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            tools: [{ googleSearch: {} }],
          },
        });

        reply = (result.text ?? '').trim();

        // Pull citations from the first candidate's groundingMetadata
        const candidate = result.candidates?.[0];
        sources = extractSources(candidate?.groundingMetadata);
      } catch (geminiErr) {
        const msg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
        console.error('askBede: Gemini call failed', msg);
        // Refund the usage counter since we couldn't answer
        if (!premium) {
          await usageRef
            .set(
              { count: admin.firestore.FieldValue.increment(-1) },
              { merge: true },
            )
            .catch(() => {});
        }
        res.status(502).json({ error: 'Bede could not reach the archives. Please try again in a moment.' });
        return;
      }

      if (!reply) {
        reply = "I'm afraid I have no words for that just now. Try rephrasing and I'll do my best.";
      }

      // ---- Persist the assistant reply (with sources) + bump parent doc metadata ----
      const assistantDoc: Record<string, unknown> = {
        role: 'assistant',
        text: reply,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (sources.length > 0) {
        assistantDoc.sources = sources;
      }

      await Promise.all([
        messagesRef.add(assistantDoc),
        chatRef.set(
          {
            landmarkId,
            landmarkName: landmark.name ?? 'Landmark',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            messageCount: admin.firestore.FieldValue.increment(2),
          },
          { merge: true },
        ),
      ]);

      res.status(200).json({
        reply,
        sources,
        remainingToday,
        dailyLimit,
        isPremium: premium,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('askBede: fatal error', msg);
      res.status(500).json({ error: 'Internal server error.', detail: msg });
    }
  },
);
