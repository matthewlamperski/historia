/**
 * Historia Points Config Seed Script
 *
 * - Uploads challenge-coin PNGs (src/assets/achievements/1.png ... 9.png) to
 *   Firebase Storage at levels/{levelId}.png with long-lived cache headers.
 * - Writes the `config/points` Firestore document with the canonical level
 *   definitions and earning rules.
 *
 * Idempotent: if a Storage object already exists with the same MD5, the upload
 * is skipped. The Firestore doc is rewritten every run with serverTimestamp.
 *
 * Usage:
 *   node scripts/seed-points-config.js
 *
 * Requires the service account key at:
 *   ../landmarks/historia-application-firebase-adminsdk-fbsvc-5232516847.json
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const admin = require('firebase-admin');

const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  '../../landmarks/historia-application-firebase-adminsdk-fbsvc-5232516847.json'
);
const STORAGE_BUCKET = 'historia-application.firebasestorage.app';
const ASSETS_DIR = path.resolve(__dirname, '../src/assets/achievements');
const CONFIG_DOC_PATH = 'config/points';
const SIGNED_URL_EXPIRES = Date.UTC(2099, 0, 1);

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`Service account key not found at ${SERVICE_ACCOUNT_PATH}`);
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: STORAGE_BUCKET,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// ─── Level definitions (formerly src/constants/levels.ts) ────────────────────

/** @type {{ id: string, name: string, minPoints: number, maxPoints: number | null, color: string, icon: string, sourceFile: string, order: number, rewards: { id: string, title: string }[] }[]} */
const LEVEL_DEFINITIONS = [
  {
    id: 'historia_initiate',
    name: 'Historia Initiate',
    minPoints: 0,
    maxPoints: 99,
    color: '#9ca3af',
    icon: 'seedling',
    sourceFile: '1.png',
    order: 1,
    rewards: [
      { id: 'shop_15_off', title: 'Get 15% off your order at shophistoria.com' },
      { id: 'digital_coin', title: 'Digital Challenge Coin' },
    ],
  },
  {
    id: 'history_keeper',
    name: 'History Keeper',
    minPoints: 100,
    maxPoints: 249,
    color: '#92400e',
    icon: 'book',
    sourceFile: '2.png',
    order: 2,
    rewards: [
      { id: 'shop_20_off', title: 'Get 20% off your order at shophistoria.com' },
      { id: 'digital_coin', title: 'Digital Challenge Coin' },
    ],
  },
  {
    id: 'patriotic_chronicler',
    name: 'Patriotic Chronicler',
    minPoints: 250,
    maxPoints: 499,
    color: '#b45309',
    icon: 'feather',
    sourceFile: '3.png',
    order: 3,
    rewards: [
      { id: 'shop_25_off', title: 'Get 25% off your order at shophistoria.com' },
      { id: 'digital_coin', title: 'Digital Challenge Coin' },
    ],
  },
  {
    id: 'heritage_ambassador',
    name: 'Heritage Ambassador',
    minPoints: 500,
    maxPoints: 999,
    color: '#6b7280',
    icon: 'scroll',
    sourceFile: '4.png',
    order: 4,
    rewards: [
      { id: 'tervis_tumbler', title: 'Historia branded Made in USA 16oz Tervis tumbler' },
      { id: 'limited_access', title: 'Exclusive access to limited-edition items & pre-sale drops' },
      { id: 'digital_coin', title: 'Digital Challenge Coin' },
    ],
  },
  {
    id: 'gratitude_guardian',
    name: 'Gratitude Guardian',
    minPoints: 1000,
    maxPoints: 2499,
    color: '#d97706',
    icon: 'shield-heart',
    sourceFile: '5.png',
    order: 5,
    rewards: [
      { id: 'gift_card_50', title: '$50 gift card at shophistoria.com' },
      { id: 'limited_access', title: 'Exclusive access to limited-edition items & pre-sale drops' },
      { id: 'digital_coin', title: 'Digital Challenge Coin' },
    ],
  },
  {
    id: 'liberty_sentinel',
    name: 'Liberty Sentinel',
    minPoints: 2500,
    maxPoints: 3499,
    color: '#2563eb',
    icon: 'shield',
    sourceFile: '6.png',
    order: 6,
    rewards: [
      { id: 'gift_card_100', title: '$100 gift card at shophistoria.com' },
      { id: 'members_gift', title: 'Complimentary members gift of the year' },
      { id: 'limited_access', title: 'Exclusive access to limited-edition items & pre-sale drops' },
      { id: 'digital_coin', title: 'Digital Challenge Coin' },
    ],
  },
  {
    id: 'legacy_defender',
    name: 'Legacy Defender',
    minPoints: 3500,
    maxPoints: 4999,
    color: '#7c3aed',
    icon: 'shield-halved',
    sourceFile: '7.png',
    order: 7,
    rewards: [
      { id: 'museum_tour', title: 'Complimentary tour at any available museum, historic site, or manufacturer for yourself and/or family' },
      { id: 'event_invite', title: 'Invitation to exclusive member-only events' },
      { id: 'members_gift', title: 'Complimentary members gift of the year' },
      { id: 'limited_access', title: 'Exclusive access to limited-edition items & pre-sale drops' },
      { id: 'digital_coin', title: 'Digital Challenge Coin' },
    ],
  },
  {
    id: 'legendary_historian',
    name: 'Legendary Historian',
    minPoints: 5000,
    maxPoints: 9999,
    color: '#b91c1c',
    icon: 'star',
    sourceFile: '8.png',
    order: 8,
    rewards: [
      { id: 'tee_or_sweatshirt', title: 'Premium Historia branded Made in USA T-shirt or Sweatshirt' },
      { id: 'event_invite', title: 'Invitation to exclusive member-only events' },
      { id: 'members_gift', title: 'Complimentary members gift of the year' },
      { id: 'limited_access', title: 'Exclusive access to limited-edition items & pre-sale drops' },
      { id: 'digital_coin', title: 'Digital Challenge Coin' },
    ],
  },
  {
    id: 'eternal_steward',
    name: 'Eternal Steward',
    minPoints: 10000,
    maxPoints: null,
    color: '#92400e',
    icon: 'crown',
    sourceFile: '9.png',
    order: 9,
    rewards: [
      { id: 'lifetime_15_off', title: 'Lifetime 15% off all future purchases at shophistoria.com' },
      { id: 'eternal_certificate', title: 'Eternal Steward Certificate & Physical Historia Challenge Coin' },
      { id: 'permanent_top_tier', title: 'Permanent top-tier status' },
      { id: 'circle_invites', title: 'Invitations to exclusive "Eternal Steward Circle" events and advisory input opportunities' },
      { id: 'name_recognition', title: 'Personalized legacy name recognition on the Historia Eternal Steward Cup' },
      { id: 'members_gift', title: 'Complimentary members gift of the year' },
      { id: 'limited_access', title: 'Exclusive access to limited-edition items & pre-sale drops' },
      { id: 'digital_coin', title: 'Digital Challenge Coin' },
    ],
  },
];

const EARNING_RULES = {
  postBasePoints: 5,
  postPerMediaPoints: 1,
  dailyPostCap: 10,
  referralPoints: 20,
  siteVisitPoints: 20,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fileMd5(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(buf).digest('base64');
}

async function uploadCoinImage(level) {
  const localPath = path.join(ASSETS_DIR, level.sourceFile);
  if (!fs.existsSync(localPath)) {
    throw new Error(`Source image missing: ${localPath}`);
  }

  const remotePath = `levels/${level.id}.png`;
  const file = bucket.file(remotePath);
  const localMd5 = fileMd5(localPath);

  let needsUpload = true;
  try {
    const [meta] = await file.getMetadata();
    if (meta && meta.md5Hash === localMd5) {
      needsUpload = false;
      console.log(`  = unchanged: ${remotePath}`);
    }
  } catch {
    // file does not exist
  }

  if (needsUpload) {
    await bucket.upload(localPath, {
      destination: remotePath,
      contentType: 'image/png',
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
    console.log(`  ✓ uploaded: ${remotePath}`);
  }

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: SIGNED_URL_EXPIRES,
  });

  return { imageUrl: signedUrl, imageStoragePath: remotePath };
}

// ─── Main seed ───────────────────────────────────────────────────────────────

async function seed() {
  console.log('🪙  Seeding Historia points config\n');

  console.log(`📦  Uploading coin images to gs://${STORAGE_BUCKET}/levels/`);
  const levelsForFirestore = [];
  for (const def of LEVEL_DEFINITIONS) {
    const { imageUrl, imageStoragePath } = await uploadCoinImage(def);
    levelsForFirestore.push({
      id: def.id,
      name: def.name,
      minPoints: def.minPoints,
      maxPoints: def.maxPoints,
      color: def.color,
      icon: def.icon,
      imageUrl,
      imageStoragePath,
      order: def.order,
      rewards: def.rewards,
    });
  }
  console.log(`✅  Uploaded ${levelsForFirestore.length} coin images\n`);

  // Determine the next version number (bump from existing if present)
  const existing = await db.doc(CONFIG_DOC_PATH).get();
  const previousVersion = existing.exists ? existing.get('version') : null;
  const nextVersion = typeof previousVersion === 'number' ? previousVersion + 1 : 1;

  console.log(`📝  Writing ${CONFIG_DOC_PATH} (version ${nextVersion})`);
  await db.doc(CONFIG_DOC_PATH).set({
    version: nextVersion,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    levels: levelsForFirestore,
    earning: EARNING_RULES,
  });
  console.log('✅  Firestore doc written\n');

  console.log('🎉  Done.');
  console.log(`    levels:       ${levelsForFirestore.length}`);
  console.log(`    earning keys: ${Object.keys(EARNING_RULES).join(', ')}`);
  console.log(`    version:      ${nextVersion}`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
