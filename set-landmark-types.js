/**
 * set-landmark-types.js
 *
 * One-time backfill script: reads every document in the `landmarks` collection
 * and sets `landmarkType` based on the name:
 *
 *   - name contains "museum" (case-insensitive) → 'museum'
 *   - everything else                            → 'historic_site'
 *
 * The Firestore → Algolia extension will automatically sync the updated
 * `landmarkType` field to the Algolia index.
 *
 * Usage:
 *   node set-landmark-types.js
 *
 * Requires the service account key file in the project root.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./historia-application-firebase-adminsdk-fbsvc-5232516847.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const BATCH_SIZE = 400; // well under Firestore's 500-op limit

function detectType(name = '', description = '') {
  const haystack = (name + ' ' + description).toLowerCase();
  if (haystack.includes('museum')) return 'museum';
  return 'historic_site';
}

async function run() {
  console.log('Fetching all landmarks…');
  const snapshot = await db.collection('landmarks').get();
  console.log(`Found ${snapshot.size} landmark documents.`);

  let batch = db.batch();
  let opCount = 0;
  let batchCount = 0;
  let museumCount = 0;
  let siteCount = 0;
  let skippedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip if already correctly set (re-running is safe but avoids unnecessary writes)
    const detected = detectType(data.name, data.shortDescription);
    if (data.landmarkType === detected) {
      skippedCount++;
      continue;
    }

    batch.update(doc.ref, { landmarkType: detected });
    opCount++;
    if (detected === 'museum') museumCount++;
    else siteCount++;

    if (opCount === BATCH_SIZE) {
      await batch.commit();
      batchCount++;
      console.log(`  Committed batch ${batchCount} (${opCount} ops)`);
      batch = db.batch();
      opCount = 0;
    }
  }

  // Commit any remaining ops
  if (opCount > 0) {
    await batch.commit();
    batchCount++;
    console.log(`  Committed batch ${batchCount} (${opCount} ops)`);
  }

  console.log('\nDone!');
  console.log(`  Museums:       ${museumCount}`);
  console.log(`  Historic sites: ${siteCount}`);
  console.log(`  Already set (skipped): ${skippedCount}`);
  console.log(`  Total batches: ${batchCount}`);
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
