/**
 * Seeds the `admins/{uid}` Firestore collection used by Firestore rules
 * and the admin web app to gate writes on `config/*`, `rewardTiers/*`,
 * `blogPosts/*`, and `admins/*`.
 *
 * AUTH MODEL
 *   The gate is "presence-only" — if `admins/{uid}` exists, that user is
 *   an admin. The `role` field below is for self-documentation and future
 *   flexibility (e.g. a 'moderator' tier later); rules currently ignore
 *   it and only check `exists()`.
 *
 * To ADD an admin:
 *   1. Add their Firebase Auth UID to ADMIN_UIDS below.
 *   2. Run: node scripts/seed-admins.js
 *
 * To REMOVE an admin:
 *   Delete the doc in Firebase Console → Firestore → admins → {uid}.
 *   (Removing from ADMIN_UIDS alone won't take effect — re-running this
 *   script never deletes docs.)
 *
 * Mirrors the ADMIN_UIDS set in src/utils/admin.ts (mobile app).
 *
 * Idempotent: re-running is safe — existing docs are merged, not duplicated.
 *
 * Usage:
 *   node scripts/seed-admins.js
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

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

// Mirrors ADMIN_UIDS in src/utils/admin.ts
const ADMIN_UIDS = [
  'MsgaoumnlwSbZZYgHFGMRKZPlCs2',
  'HzIGqkeYhVbuiZogz34nPpIVMKW2',
  '0gYuyq2FvyWNNZYoAhCiMI2jODY2',
];

async function seed() {
  console.log(`👮  Seeding ${ADMIN_UIDS.length} admin doc(s) in Firestore`);

  for (const uid of ADMIN_UIDS) {
    await db.collection('admins').doc(uid).set(
      {
        role: 'admin',
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
        addedBy: 'seed-admins.js',
      },
      { merge: true }
    );
    console.log(`  ✓ admins/${uid}  (role: admin)`);
  }

  console.log('🎉  Done.');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
