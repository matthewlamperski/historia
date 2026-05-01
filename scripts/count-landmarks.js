/**
 * Read-only Firestore count + sample. Does NOT hit Google Places.
 *
 * Outputs:
 *   - total landmarks
 *   - populated (already enriched) vs not
 *   - one sample populated doc
 *   - one sample unpopulated doc
 *   - inventory of all top-level keys seen across populated docs
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

admin.initializeApp({ credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('landmarks').get();
  const total = snap.size;

  let populated = 0;
  let unpopulated = 0;
  const populatedKeys = new Set();
  const unpopulatedKeys = new Set();
  let samplePopulated = null;
  let sampleUnpopulated = null;

  snap.forEach(doc => {
    const d = doc.data();
    if (d.populated === true) {
      populated++;
      Object.keys(d).forEach(k => populatedKeys.add(k));
      if (!samplePopulated) samplePopulated = { id: doc.id, ...d };
    } else {
      unpopulated++;
      Object.keys(d).forEach(k => unpopulatedKeys.add(k));
      if (!sampleUnpopulated) sampleUnpopulated = { id: doc.id, ...d };
    }
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total landmarks:  ${total}`);
  console.log(`Already enriched: ${populated}`);
  console.log(`Need enrichment:  ${unpopulated}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\nKeys seen across POPULATED docs:');
  console.log('  ', [...populatedKeys].sort().join(', '));

  console.log('\nKeys seen across UNPOPULATED docs:');
  console.log('  ', [...unpopulatedKeys].sort().join(', '));

  if (samplePopulated) {
    console.log('\nSample populated doc:');
    console.log(JSON.stringify(samplePopulated, null, 2));
  }
  if (sampleUnpopulated) {
    console.log('\nSample unpopulated doc:');
    console.log(JSON.stringify(sampleUnpopulated, null, 2));
  }

  process.exit(0);
})().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
