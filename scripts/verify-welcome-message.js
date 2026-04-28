/**
 * Verifies that config/welcomeMessage is correctly populated and that
 * the configured senderId actually has a users/{uid} doc.
 *
 * Usage: node scripts/verify-welcome-message.js
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

(async () => {
  const snap = await db.doc('config/welcomeMessage').get();
  if (!snap.exists) {
    console.error('❌  config/welcomeMessage does not exist');
    process.exit(1);
  }

  const data = snap.data();
  console.log('📄  config/welcomeMessage');
  console.log(`    enabled:      ${data.enabled}`);
  console.log(`    senderId:     ${data.senderId || '(empty)'}`);
  console.log(`    text length:  ${(data.text || '').length} chars`);
  console.log(`    updatedAt:    ${data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt}`);
  console.log('');

  if (data.senderId) {
    const senderSnap = await db.collection('users').doc(data.senderId).get();
    if (senderSnap.exists) {
      const u = senderSnap.data();
      console.log(`👤  Sender resolved: ${u.name || '(no name)'} @${u.username || '(no handle)'} (${data.senderId})`);
    } else {
      console.error(`❌  Sender UID ${data.senderId} has NO users/{uid} doc — function will skip!`);
      process.exit(1);
    }
  }

  console.log('');
  console.log('--- text preview (first 240 chars) ---');
  console.log(`${(data.text || '').slice(0, 240)}${data.text.length > 240 ? '…' : ''}`);
  console.log('--- end preview ---');

  console.log('');
  console.log('✅  config/welcomeMessage is ready. Deploy the function next.');
  process.exit(0);
})();
