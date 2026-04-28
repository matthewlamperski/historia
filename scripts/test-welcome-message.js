/**
 * Manually triggers the welcome-message flow for a given user UID, mirroring
 * what the deployed `onUserCreate` Cloud Function does on signup.
 *
 * Use this to test delivery against an existing user (e.g. yourself) without
 * having to actually sign up a brand-new account. The deployed
 * `onMessageCreate` trigger will fire the FCM push + notifications doc
 * automatically when this script writes the message.
 *
 * Usage:
 *   node scripts/test-welcome-message.js <recipientUid>
 *   node scripts/test-welcome-message.js MsgaoumnlwSbZZYgHFGMRKZPlCs2
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  '../../landmarks/historia-application-firebase-adminsdk-fbsvc-5232516847.json'
);

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`Service account key not found at ${SERVICE_ACCOUNT_PATH}`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
});

const db = admin.firestore();

const recipientUid = process.argv[2];
if (!recipientUid) {
  console.error('Usage: node scripts/test-welcome-message.js <recipientUid>');
  process.exit(1);
}

function isEmojiOnly(text) {
  const t = text.trim();
  if (!t) return false;
  return /^[\p{Emoji}\s]+$/u.test(t);
}

function buildPreview(text, max = 140) {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

async function getOrCreateDirectConversation(senderId, recipientId) {
  const existing = await db
    .collection('conversations')
    .where('participants', 'array-contains', senderId)
    .get();

  for (const doc of existing.docs) {
    const data = doc.data();
    const participants = Array.isArray(data.participants) ? data.participants : [];
    const isDirect = data.type === 'direct' || (!data.type && participants.length === 2);
    if (
      isDirect &&
      participants.length === 2 &&
      participants.includes(senderId) &&
      participants.includes(recipientId)
    ) {
      return { id: doc.id, created: false };
    }
  }

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

  return { id: ref.id, created: true };
}

(async () => {
  console.log(`💌  Triggering welcome message for recipient ${recipientUid}\n`);

  const configSnap = await db.doc('config/welcomeMessage').get();
  if (!configSnap.exists) {
    console.error('❌ config/welcomeMessage does not exist');
    process.exit(1);
  }
  const config = configSnap.data();

  if (config.enabled === false) {
    console.error('❌ Welcome message is disabled (enabled === false). Aborting.');
    process.exit(1);
  }

  const senderId = (config.senderId ?? '').trim();
  const text = config.text ?? '';

  if (!senderId) {
    console.error('❌ config/welcomeMessage.senderId is empty.');
    process.exit(1);
  }
  if (!text.trim()) {
    console.error('❌ config/welcomeMessage.text is empty.');
    process.exit(1);
  }
  if (senderId === recipientUid) {
    console.error('❌ Sender and recipient are the same UID. Aborting.');
    process.exit(1);
  }

  // Verify sender + recipient exist
  const [senderSnap, recipientSnap] = await Promise.all([
    db.collection('users').doc(senderId).get(),
    db.collection('users').doc(recipientUid).get(),
  ]);
  if (!senderSnap.exists) {
    console.error(`❌ Sender user doc users/${senderId} does not exist.`);
    process.exit(1);
  }
  if (!recipientSnap.exists) {
    console.error(`❌ Recipient user doc users/${recipientUid} does not exist.`);
    process.exit(1);
  }

  const senderData = senderSnap.data();
  const recipientData = recipientSnap.data();
  console.log(`👤  Sender:    ${senderData.name || '(no name)'} @${senderData.username || '(no handle)'} (${senderId})`);
  console.log(`👤  Recipient: ${recipientData.name || '(no name)'} @${recipientData.username || '(no handle)'} (${recipientUid})`);
  console.log('');

  const { id: conversationId, created } = await getOrCreateDirectConversation(
    senderId,
    recipientUid
  );
  console.log(
    `💬  Conversation: ${conversationId} ${created ? '(created)' : '(reused existing)'}`
  );

  const now = admin.firestore.Timestamp.now();

  const messageRef = await db
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
  console.log(`✉️   Message written: ${messageRef.id} (${text.length} chars)`);

  await db
    .collection('conversations')
    .doc(conversationId)
    .update({
      lastMessage: buildPreview(text),
      lastMessageType: 'text',
      lastMessageSenderId: senderId,
      lastMessageTimestamp: now,
      updatedAt: now,
      [`unreadCount.${recipientUid}`]: admin.firestore.FieldValue.increment(1),
      [`unreadCount.${senderId}`]: 0,
    });
  console.log('🔔  Conversation last-message + unreadCount updated');

  console.log('');
  console.log('✅  Done. The deployed `onMessageCreate` trigger will:');
  console.log('     1. Write a notifications/{auto} doc for the recipient');
  console.log('     2. Send an FCM push (if recipient has a registered fcmToken)');
  console.log('');
  console.log('   Open the Historia app on the recipient device — Doug\'s welcome');
  console.log('   DM should appear in the Messages tab within a few seconds.');
  process.exit(0);
})().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
