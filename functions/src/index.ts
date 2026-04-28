import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { RewardRequest, RewardTier } from './types';
import { createShopifyDiscount, addShopifyCustomerToMarketing } from './shopify';
import { sendRewardEmail, sendSubscriptionWelcomeEmail } from './email';

export { askBede } from './bede';
export { onUserCreate } from './welcome';
export {
  appleAssnWebhook,
  googlePlayRtdnWebhook,
  validateReceipt,
} from './subscriptions';

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

admin.initializeApp();
const db = admin.firestore();

// ---------------------------------------------------------------------------
// Firestore collection names
// ---------------------------------------------------------------------------

const COLLECTIONS = {
  REWARD_TIERS: 'rewardTiers',
  USER_REWARDS: 'userRewards',
  SUBSCRIPTIONS: 'subscriptions',
  USERS: 'users',
} as const;

interface SubscriptionRecord {
  status?: 'free' | 'trial' | 'active' | 'expired' | 'cancelled';
  subscriptionEndDate?: string | null;
  trialEndDate?: string | null;
  gracePeriodExpiresDate?: string | null;
  referralBonusExpiry?: string;
}

/**
 * Mirrors `subscriptionService.isPremiumActive` on the client. Lenient — see
 * `bede.ts` and `src/services/subscriptionService.ts` for the rationale.
 */
function isPremium(record: SubscriptionRecord | null | undefined): boolean {
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

// ---------------------------------------------------------------------------
// HTTP Function: processRewards
//
// POST /processRewards
// Body: { "points": 750, "email": "user@example.com" }
//
// Logic:
//   1. Fetch all rewardTiers where pointsRequired <= points
//   2. Skip tiers already claimed by this email
//   3. For each new tier: create Shopify discount code, email it, record claim
//   4. Return list of newly issued rewards
// ---------------------------------------------------------------------------

export const processRewards = onRequest(
  {
    cors: true,
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Use POST.' });
      return;
    }

    // ─── Auth: require a valid Firebase ID token ───
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
      console.warn('processRewards: invalid ID token', err);
      res.status(401).json({ error: 'Invalid or expired Firebase ID token.' });
      return;
    }

    const { points, email } = (req.body ?? {}) as Partial<RewardRequest>;

    if (typeof points !== 'number' || !email || typeof email !== 'string') {
      res.status(400).json({
        error: 'Request body must include { points: number, email: string }',
      });
      return;
    }

    // ─── Premium gate: only Pro subscribers can redeem rewards ───
    // Free users can earn points but cannot convert them to Shopify codes.
    try {
      const subSnap = await db.collection(COLLECTIONS.SUBSCRIPTIONS).doc(uid).get();
      const subRecord = (subSnap.exists ? subSnap.data() : null) as SubscriptionRecord | null;
      if (!isPremium(subRecord)) {
        res.status(403).json({
          error:
            'Reward redemption requires a Historia Pro subscription. Upgrade to Pro to redeem your points.',
          requiresUpgrade: true,
        });
        return;
      }
    } catch (premiumErr) {
      console.error('processRewards: premium check failed', premiumErr);
      res.status(500).json({ error: 'Could not verify subscription status.' });
      return;
    }

    // Sanity-check: the email in the body must match the authenticated user's
    // email so a Pro user can't redeem on someone else's behalf.
    try {
      const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
      const storedEmail = (userSnap.data()?.email ?? '') as string;
      if (storedEmail.toLowerCase().trim() !== email.toLowerCase().trim()) {
        res.status(403).json({ error: 'Email mismatch.' });
        return;
      }
    } catch {
      // If user doc is missing, fail closed
      res.status(403).json({ error: 'User profile not found.' });
      return;
    }

    const emailKey = email.toLowerCase().trim();

    try {
      // 1. All tiers the user's balance reaches
      const tiersSnap = await db
        .collection(COLLECTIONS.REWARD_TIERS)
        .where('pointsRequired', '<=', points)
        .orderBy('pointsRequired', 'asc')
        .get();

      if (tiersSnap.empty) {
        res.status(200).json({ message: 'No rewards unlocked at this point level', newRewards: [] });
        return;
      }

      // 2. Rewards already claimed by this user
      const claimedSnap = await db
        .collection(COLLECTIONS.USER_REWARDS)
        .doc(emailKey)
        .collection('claimed')
        .get();

      const alreadyClaimed = new Set(claimedSnap.docs.map((d) => d.id));

      // 3. Process each unclaimed tier
      const newRewards: Array<{ name: string; type: string; code: string }> = [];
      const errors: Array<{ tierId: string; error: string }> = [];

      for (const doc of tiersSnap.docs) {
        if (alreadyClaimed.has(doc.id)) continue;

        const tier: RewardTier = { id: doc.id, ...(doc.data() as Omit<RewardTier, 'id'>) };

        try {
          // Create Shopify price rule + discount code
          const { code, priceRuleId, discountCodeId } = await createShopifyDiscount(tier);

          // Email the code to the user
          await sendRewardEmail({ email: emailKey, tier, code });

          // Persist the claim so it's never issued twice
          await db
            .collection(COLLECTIONS.USER_REWARDS)
            .doc(emailKey)
            .collection('claimed')
            .doc(doc.id)
            .set({
              claimedAt: admin.firestore.FieldValue.serverTimestamp(),
              tierId: doc.id,
              tierName: tier.name,
              tierDescription: tier.description,
              type: tier.type,
              code,
              shopifyPriceRuleId: priceRuleId,
              shopifyDiscountCodeId: discountCodeId,
              pointsAtClaim: points,
            });

          newRewards.push({ name: tier.name, type: tier.type, code });

          console.info(`Reward issued: tier=${doc.id} email=${emailKey} code=${code}`);
        } catch (tierErr) {
          const msg = tierErr instanceof Error ? tierErr.message : String(tierErr);
          console.error(`Failed to process tier ${doc.id} for ${emailKey}:`, msg);
          errors.push({ tierId: doc.id, error: msg });
        }
      }

      const hasNew = newRewards.length > 0;
      res.status(200).json({
        message: hasNew
          ? `${newRewards.length} new reward(s) issued`
          : 'All eligible rewards already claimed',
        newRewards,
        ...(errors.length > 0 && { errors }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('processRewards fatal error:', msg);
      res.status(500).json({ error: 'Internal server error', detail: msg });
    }
  },
);

// ---------------------------------------------------------------------------
// HTTP Function: sendSubscriptionWelcome
//
// POST /sendSubscriptionWelcome
// Body: { "email": "user@example.com", "firstName"?: "Alex" }
//
// Sends the Historia Pro welcome email and subscribes the customer to the
// Shopify marketing list. Shopify subscription is best-effort — email delivery
// is the primary goal and will succeed even if the Shopify step fails.
// ---------------------------------------------------------------------------

export const sendSubscriptionWelcome = onRequest(
  {
    cors: true,
    region: 'us-central1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Use POST.' });
      return;
    }

    // Require Firebase ID token so we can guard idempotency by uid.
    const authHeader = req.get('authorization') ?? '';
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    let authedUid: string | null = null;
    if (tokenMatch) {
      try {
        const decoded = await admin.auth().verifyIdToken(tokenMatch[1]);
        authedUid = decoded.uid;
      } catch {
        // Fall through; idempotency check below will be best-effort by email.
      }
    }

    const { email, firstName, lastName } = (req.body ?? {}) as {
      email?: string;
      firstName?: string;
      lastName?: string;
    };

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Request body must include { email: string }' });
      return;
    }

    const emailKey = email.toLowerCase().trim();
    const redditUrl = process.env.REDDIT_COMMUNITY_URL ?? 'https://www.reddit.com/r/ExploreHistoria';

    // Idempotency guard: if we already sent the welcome email for this user,
    // skip the email + Shopify steps. The flag lives on the subscription doc
    // (set after a successful send below) so this is best-effort but safe.
    if (authedUid) {
      try {
        const subSnap = await db
          .collection(COLLECTIONS.SUBSCRIPTIONS)
          .doc(authedUid)
          .get();
        if (subSnap.exists && subSnap.get('welcomeEmailSentAt')) {
          console.info(
            `sendSubscriptionWelcome: skip — already sent for uid=${authedUid} at ${subSnap.get('welcomeEmailSentAt')}`,
          );
          res.status(200).json({ message: 'Welcome email already sent', skipped: true });
          return;
        }
      } catch (err) {
        console.warn('sendSubscriptionWelcome: idempotency check failed (continuing)', err);
      }
    }

    let shopifyResult: { customerId: string; created: boolean } | null = null;
    let shopifyError: string | null = null;

    try {
      shopifyResult = await addShopifyCustomerToMarketing({
        email: emailKey,
        firstName,
        lastName,
      });
    } catch (err) {
      shopifyError = err instanceof Error ? err.message : String(err);
      console.error(`Shopify marketing subscribe failed for ${emailKey}:`, shopifyError);
    }

    try {
      await sendSubscriptionWelcomeEmail({ email: emailKey, firstName, redditUrl });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Welcome email send failed for ${emailKey}:`, msg);
      res.status(500).json({ error: 'Failed to send welcome email', detail: msg });
      return;
    }

    // Mark the welcome as sent so future calls no-op.
    if (authedUid) {
      await db
        .collection(COLLECTIONS.SUBSCRIPTIONS)
        .doc(authedUid)
        .set(
          { welcomeEmailSentAt: new Date().toISOString() },
          { merge: true },
        )
        .catch(err =>
          console.warn(`sendSubscriptionWelcome: flag write failed for ${authedUid}`, err),
        );
    }

    res.status(200).json({
      message: 'Welcome email sent',
      shopify: shopifyResult,
      ...(shopifyError && { shopifyError }),
    });
  },
);

// ---------------------------------------------------------------------------
// Firestore Trigger: onMessageCreate
//
// Fires when a new message is written to
//   conversations/{conversationId}/messages/{messageId}
//
// For every recipient (participants minus the sender):
//   1. Write a notifications/{auto} doc so the in-app bell picks it up.
//   2. Read users/{recipientId}.fcmToken and send an FCM push. The push
//      carries a data payload the client uses to deep-link into the
//      correct ChatScreen when tapped.
//
// Failures per recipient are isolated via Promise.allSettled so a single
// stale token can't break delivery for everyone else in a group thread.
// ---------------------------------------------------------------------------

const MESSAGE_PREVIEW_MAX = 140;

function buildMessagePreview(data: FirebaseFirestore.DocumentData): string {
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  if (text) {
    return text.length > MESSAGE_PREVIEW_MAX
      ? `${text.slice(0, MESSAGE_PREVIEW_MAX - 1)}…`
      : text;
  }
  const landmarkName = data.landmarkReference?.name;
  if (typeof landmarkName === 'string' && landmarkName) {
    return `📍 ${landmarkName}`;
  }
  const images = Array.isArray(data.images) ? data.images.length : 0;
  const videos = Array.isArray(data.videos) ? data.videos.length : 0;
  if (videos > 0) return videos === 1 ? '🎥 Video' : `🎥 ${videos} videos`;
  if (images > 0) return images === 1 ? '📷 Photo' : `📷 ${images} photos`;
  if (data.postReference) return '📎 Shared a post';
  return 'New message';
}

export const onMessageCreate = onDocumentCreated(
  {
    document: 'conversations/{conversationId}/messages/{messageId}',
    region: 'us-central1',
    memory: '256MiB',
  },
  async event => {
    const snap = event.data;
    if (!snap) return;

    const message = snap.data();
    const { conversationId } = event.params;
    const senderId: string | undefined = message.senderId;
    if (!senderId) return;

    // Load conversation + sender in parallel
    const [conversationSnap, senderSnap] = await Promise.all([
      db.collection('conversations').doc(conversationId).get(),
      db.collection('users').doc(senderId).get(),
    ]);

    const conversation = conversationSnap.data();
    if (!conversation) {
      console.warn(`onMessageCreate: conversation ${conversationId} not found`);
      return;
    }

    const participants: string[] = Array.isArray(conversation.participants)
      ? conversation.participants
      : [];
    const recipients = participants.filter(uid => uid && uid !== senderId);
    if (recipients.length === 0) return;

    const sender = senderSnap.data() ?? {};
    const senderName: string =
      sender.name || sender.displayName || sender.username || 'Someone';
    const senderAvatar: string | undefined = sender.avatar || sender.photoURL;
    const senderUsername: string | undefined = sender.username;

    const isGroup = conversation.type === 'group';
    const groupName: string | undefined = conversation.name;
    const previewText = buildMessagePreview(message);
    const title = isGroup && groupName ? groupName : senderName;
    const body = isGroup ? `${senderName}: ${previewText}` : previewText;

    const dataPayload: Record<string, string> = {
      type: 'new_message',
      conversationId,
      senderId,
      senderName,
    };
    if (senderAvatar) dataPayload.senderAvatar = senderAvatar;
    if (senderUsername) dataPayload.senderUsername = senderUsername;

    const results = await Promise.allSettled(
      recipients.map(async recipientId => {
        // 1. In-app notification doc
        await db.collection('notifications').add({
          recipientId,
          senderId,
          senderName,
          senderAvatar: senderAvatar ?? null,
          senderUsername: senderUsername ?? null,
          type: 'new_message',
          referenceId: conversationId,
          previewText,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 2. FCM push
        const recipientSnap = await db.collection('users').doc(recipientId).get();
        const recipientData = recipientSnap.data();
        const token: string | undefined = recipientData?.fcmToken;
        if (!token) {
          console.info(`onMessageCreate: no fcmToken for ${recipientId} — skipping push`);
          return;
        }

        try {
          await admin.messaging().send({
            token,
            notification: { title, body },
            data: dataPayload,
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                  'mutable-content': 1,
                },
              },
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'historia_default',
                sound: 'default',
              },
            },
          });
        } catch (err: unknown) {
          const code = (err as { code?: string })?.code ?? '';
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`FCM send failed for ${recipientId}:`, code, msg);
          // Clear stale/unregistered tokens so we stop retrying them.
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument'
          ) {
            await db
              .collection('users')
              .doc(recipientId)
              .update({ fcmToken: admin.firestore.FieldValue.delete() })
              .catch(e => console.warn('Failed to clear stale token:', e));
          }
        }
      }),
    );

    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      console.warn(`onMessageCreate: ${failed}/${results.length} recipients failed`);
    }
  },
);
