/**
 * Historia Welcome Message Seed Script
 *
 * Writes (or merges into) the `config/welcomeMessage` Firestore document used
 * by the `onUserCreate` Cloud Function to send a founder welcome message to
 * each new user.
 *
 * Idempotent — re-running preserves any admin-edited `text` / `senderId` /
 * `enabled` because the script always writes with `{ merge: true }` AND only
 * sets fields that are missing on the existing doc. To force-overwrite the
 * default body, pass `--force` and the script will overwrite `text`.
 *
 * Usage:
 *   node scripts/seed-welcome-message.js
 *   node scripts/seed-welcome-message.js --force          (overwrite text)
 *   node scripts/seed-welcome-message.js --sender <uid>   (set Doug's UID)
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
const DOC_PATH = 'config/welcomeMessage';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const senderArgIdx = args.indexOf('--sender');
const SENDER_OVERRIDE = senderArgIdx >= 0 ? args[senderArgIdx + 1] : null;

// Whitespace, blank lines, and bullet-like dashes preserved verbatim.
// Edits to this default require `--force`. Day-to-day edits should happen in
// the admin web-app or directly in the Firebase Console.
const DEFAULT_TEXT = `Hey there! I'm Doug, founder of Historia! We're excited to have you here! You've joined a global community of not only history lovers but also people who want to make new connections, be lifelong learners, and find joy through gratitude.

So what's next?


Bookmark your favorite museums, historic sites, and manufacturers and set off on your first adventure (there's over 20,000 sites to choose from!)
Make your first post and share your favorite discovery, hidden gem, and what kind of positive impact the site had on you. Continue posting about anything relevant to history, historic sites, museums, or American manufacturing
We'll show you who else is exploring Historia in your area so that you can connect with them and get inspired by their adventures


Upgrading to Historia Pro at only $1.99/month gives you access to the Explore Historia Rewards Program.

Leveling up = discounts & gift cards at shophistoria.com, free site experiences, American-made gifts, and more.

Here's how to earn points:

Visiting museums, historic sites, and manufacturers = 20 points each
Posting written content = 5 points
Photo/video uploads = 1 point each


The Historia Hack: Refer & Earn
Invite friends to join Historia Pro and you both receive 20 points…not bad!

Share the app far and wide and let's honor history together!

With gratitude,
Doug`;

async function seed() {
  console.log(`💌  Seeding ${DOC_PATH}`);

  const ref = db.doc(DOC_PATH);
  const existing = await ref.get();
  const existingData = existing.exists ? existing.data() : {};

  const update = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // text — overwrite only on --force or first-time seed
  if (FORCE || !existingData?.text) {
    update.text = DEFAULT_TEXT;
    console.log(`  ${FORCE ? '✓ overwrote' : '✓ initialized'} text (${DEFAULT_TEXT.length} chars)`);
  } else {
    console.log('  = text preserved (use --force to overwrite)');
  }

  // senderId — set from --sender flag, or leave existing, or default to empty
  if (SENDER_OVERRIDE) {
    update.senderId = SENDER_OVERRIDE;
    console.log(`  ✓ senderId set to ${SENDER_OVERRIDE}`);
  } else if (existingData?.senderId) {
    console.log(`  = senderId preserved (${existingData.senderId})`);
  } else {
    update.senderId = '';
    console.log(
      "  ⚠️  senderId initialized to empty string — set Doug's UID via --sender or in the admin editor"
    );
  }

  // enabled — default to true on first seed, otherwise preserve
  if (typeof existingData?.enabled === 'boolean') {
    console.log(`  = enabled preserved (${existingData.enabled})`);
  } else {
    update.enabled = true;
    console.log('  ✓ enabled initialized to true');
  }

  await ref.set(update, { merge: true });

  console.log('🎉  Done.');
  if (!update.senderId && !existingData?.senderId) {
    console.log(
      '\nNEXT STEP: open Firestore Console → config/welcomeMessage and set\n' +
        '`senderId` to Doug\'s Firebase Auth UID, or re-run with --sender <uid>.\n' +
        'Until then, the onUserCreate trigger will safely no-op.\n'
    );
  }
  process.exit(0);
}

seed().catch(err => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
