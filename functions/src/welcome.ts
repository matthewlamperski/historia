import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { sendAccountWelcomeEmail } from './email';

const WELCOME_DOC_PATH = 'config/welcomeMessage';

interface WelcomeMessageDoc {
  /** Firebase Auth UID of the founder/sender (e.g. Doug's account). */
  senderId?: string;
  /** Message body. Whitespace, newlines, and line breaks are preserved verbatim. */
  text?: string;
  /** Kill-switch — when false, the function logs and skips. */
  enabled?: boolean;
}

function isEmojiOnly(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /^[\p{Emoji}\s]+$/u.test(t);
}

function buildPreview(text: string, max = 140): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * Find an existing direct conversation between two users, or create a new one.
 * Mirrors the shape produced by `messagingService.getOrCreateConversation`
 * in the mobile app so the conversation list / chat screen render identically.
 */
async function getOrCreateDirectConversation(
  db: FirebaseFirestore.Firestore,
  senderId: string,
  recipientId: string
): Promise<string> {
  // Look up an existing direct conversation that includes both participants.
  const existing = await db
    .collection('conversations')
    .where('participants', 'array-contains', senderId)
    .get();

  for (const doc of existing.docs) {
    const data = doc.data();
    const participants: string[] = Array.isArray(data.participants) ? data.participants : [];
    const isDirect = data.type === 'direct' || (!data.type && participants.length === 2);
    if (
      isDirect &&
      participants.length === 2 &&
      participants.includes(senderId) &&
      participants.includes(recipientId)
    ) {
      return doc.id;
    }
  }

  // Build participantDetails from the user docs (matches mobile schema).
  const [senderSnap, recipientSnap] = await Promise.all([
    db.collection('users').doc(senderId).get(),
    db.collection('users').doc(recipientId).get(),
  ]);

  const participantDetails = [
    { id: senderId, ...(senderSnap.data() ?? {}) },
    { id: recipientId, ...(recipientSnap.data() ?? {}) },
  ];

  const now = admin.firestore.Timestamp.now();
  const ref = await db.collection('conversations').add({
    participants: [senderId, recipientId],
    participantDetails,
    lastMessage: '',
    lastMessageSenderId: senderId,
    lastMessageTimestamp: now,
    unreadCount: { [senderId]: 0, [recipientId]: 0 },
    type: 'direct',
    createdAt: now,
    updatedAt: now,
  });

  return ref.id;
}

/**
 * Send the founder welcome message to a brand-new user.
 *
 * Trigger: a new document at `users/{userId}` is created (the mobile app
 * writes this immediately after Firebase Auth account creation in
 * `authStore.ts`).
 *
 * Behavior: reads `config/welcomeMessage`. If enabled and a non-empty
 * `text` + `senderId` are configured, it ensures a direct conversation
 * exists between the sender and the new user, writes a single message
 * matching the shape produced by the mobile app's messaging service,
 * and updates the conversation's last-message + unread fields.
 *
 * The existing `onMessageCreate` trigger handles FCM push and the
 * notifications-collection write automatically — no extra work here.
 *
 * Idempotency: writes `welcomeMessageSentAt` on the user doc as a guard.
 * If the trigger fires twice for the same user (rare, but Firestore
 * triggers are at-least-once), the second invocation no-ops.
 */
export const onUserCreate = onDocumentCreated(
  {
    document: 'users/{userId}',
    region: 'us-central1',
    memory: '256MiB',
  },
  async event => {
    const snap = event.data;
    if (!snap) return;

    const { userId } = event.params;
    const userData = snap.data();
    const db = admin.firestore();

    // ─── Step 1: send the transactional welcome email (Resend) ────────────
    // Independent of the in-app founder message below — even if the in-app
    // welcome is disabled or misconfigured, every new user should still get
    // the brand welcome email. Idempotency lives on its own flag.
    const userEmail = (userData?.email ?? '').trim();
    const alreadyEmailed = Boolean(userData?.welcomeEmailSentAt);
    if (userEmail && !alreadyEmailed) {
      const fullName: string =
        (userData?.name ?? userData?.displayName ?? '').trim();
      const firstName = fullName ? fullName.split(/\s+/)[0] : undefined;
      try {
        await sendAccountWelcomeEmail({ email: userEmail, firstName });
        await db
          .collection('users')
          .doc(userId)
          .update({
            welcomeEmailSentAt: admin.firestore.Timestamp.now(),
          });
        console.info(`onUserCreate: account welcome email sent to ${userEmail}`);
      } catch (err) {
        // Non-fatal — the in-app message still ships and we'll retry on
        // the next account-doc write that triggers this function (rare).
        console.error(
          `onUserCreate: failed to send welcome email to ${userEmail}:`,
          err,
        );
      }
    } else if (!userEmail) {
      console.warn(
        `onUserCreate: user ${userId} has no email on profile — skipping welcome email`,
      );
    }

    // ─── Step 2: send the in-app founder welcome message ──────────────────
    if (userData?.welcomeMessageSentAt) {
      console.info(`onUserCreate: user ${userId} already received in-app welcome — skipping`);
      return;
    }

    const configSnap = await db.doc(WELCOME_DOC_PATH).get();
    if (!configSnap.exists) {
      console.warn(`onUserCreate: ${WELCOME_DOC_PATH} does not exist — skipping`);
      return;
    }

    const config = configSnap.data() as WelcomeMessageDoc;

    if (config.enabled === false) {
      console.info('onUserCreate: welcome message disabled in config — skipping');
      return;
    }

    const senderId = (config.senderId ?? '').trim();
    const text = config.text ?? '';

    if (!senderId) {
      console.warn(`onUserCreate: ${WELCOME_DOC_PATH}.senderId is empty — skipping`);
      return;
    }
    if (!text.trim()) {
      console.warn(`onUserCreate: ${WELCOME_DOC_PATH}.text is empty — skipping`);
      return;
    }
    if (senderId === userId) {
      // Edge case: the founder created their own account. No self-message.
      console.info(`onUserCreate: skipping welcome — sender and recipient are the same (${userId})`);
      return;
    }

    // Confirm sender's user doc exists so participantDetails is well-formed.
    const senderSnap = await db.collection('users').doc(senderId).get();
    if (!senderSnap.exists) {
      console.error(
        `onUserCreate: configured senderId ${senderId} has no users/{uid} doc — aborting`
      );
      return;
    }

    let conversationId: string;
    try {
      conversationId = await getOrCreateDirectConversation(db, senderId, userId);
    } catch (err) {
      console.error('onUserCreate: failed to get/create conversation', err);
      return;
    }

    const now = admin.firestore.Timestamp.now();

    try {
      await db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .add({
          conversationId,
          senderId,
          text,
          images: [],
          videos: [],
          postReference: null,
          landmarkReference: null,
          likes: [],
          isEmojiOnly: isEmojiOnly(text),
          readBy: [senderId],
          timestamp: now,
          updatedAt: now,
        });

      await db
        .collection('conversations')
        .doc(conversationId)
        .update({
          lastMessage: buildPreview(text),
          lastMessageType: 'text',
          lastMessageSenderId: senderId,
          lastMessageTimestamp: now,
          updatedAt: now,
          [`unreadCount.${userId}`]: admin.firestore.FieldValue.increment(1),
          [`unreadCount.${senderId}`]: 0,
        });

      // Idempotency guard for any future re-invocation.
      await db.collection('users').doc(userId).update({
        welcomeMessageSentAt: now,
      });

      console.info(
        `onUserCreate: welcome message delivered — conversation=${conversationId} recipient=${userId}`
      );
    } catch (err) {
      console.error(`onUserCreate: failed to send welcome message to ${userId}:`, err);
    }
  },
);
