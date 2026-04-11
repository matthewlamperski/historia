/**
 * Seed Cincinnati landmarks into Firestore.
 * Clears existing landmarks collection first, then writes the 6 demo landmarks
 * with the exact field shape the app expects (nested coordinates object).
 *
 * Usage:
 *   node seed-landmarks.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./historia-application-firebase-adminsdk-fbsvc-5232516847.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const LANDMARKS = [
  {
    id: 'cincinnati-museum-center',
    name: 'Cincinnati Museum Center at Union Terminal',
    description:
      "A magnificent Art Deco train station built in 1933, now serving as a museum complex. This iconic landmark represents the golden age of railroad travel and houses multiple museums including the Museum of Natural History & Science, Cincinnati History Museum, and Duke Energy Children's Museum.",
    shortDescription: 'Historic Art Deco train station, now a museum complex',
    coordinates: { latitude: 39.1097, longitude: -84.5386 },
    yearBuilt: 1933,
    category: 'building',
    images: ['https://images.unsplash.com/photo-1580407196238-dac33f57c410?w=500'],
    historicalSignificance:
      "One of the finest examples of Art Deco architecture in the United States and a symbol of Cincinnati's transportation heritage.",
    visitingHours: '10:00 AM - 5:00 PM',
    website: 'https://www.cincymuseum.org',
    address: '1301 Western Ave, Cincinnati, OH 45203',
  },
  {
    id: 'roebling-suspension-bridge',
    name: 'Roebling Suspension Bridge',
    description:
      'Completed in 1866, this suspension bridge was a prototype for the Brooklyn Bridge. Designed by John Augustus Roebling, it spans the Ohio River connecting Cincinnati, Ohio to Covington, Kentucky.',
    shortDescription: 'Historic suspension bridge prototype for Brooklyn Bridge',
    coordinates: { latitude: 39.0936, longitude: -84.5092 },
    yearBuilt: 1866,
    category: 'monument',
    images: ['https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=500'],
    historicalSignificance:
      'Engineering marvel and prototype for the more famous Brooklyn Bridge, representing 19th-century innovation.',
    visitingHours: 'Open 24 hours',
    address: 'Roebling Bridge, Cincinnati, OH 45202',
  },
  {
    id: 'fountain-square',
    name: 'Fountain Square',
    description:
      "The heart of downtown Cincinnati, featuring the iconic Tyler Davidson Fountain. This public square has been the city's gathering place since 1871 and hosts numerous events throughout the year.",
    shortDescription: "Downtown's central gathering place with historic fountain",
    coordinates: { latitude: 39.1014, longitude: -84.5124 },
    yearBuilt: 1871,
    category: 'site',
    images: ['https://images.unsplash.com/photo-1573160813959-df05c1b8b5c4?w=500'],
    historicalSignificance:
      "Central to Cincinnati's civic life for over 150 years, symbolizing the city's community spirit.",
    visitingHours: 'Open 24 hours',
    website: 'https://myfountainsquare.com',
    address: '520 Vine St, Cincinnati, OH 45202',
  },
  {
    id: 'cincinnati-observatory',
    name: 'Cincinnati Observatory',
    description:
      'Founded in 1842, this is one of the oldest professional observatories in the United States. Known as the "Birthplace of American Astronomy," it played a crucial role in the development of astronomical science in America.',
    shortDescription: "America's oldest professional observatory",
    coordinates: { latitude: 39.1386, longitude: -84.4214 },
    yearBuilt: 1842,
    category: 'building',
    images: ['https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=500'],
    historicalSignificance:
      'Birthplace of American Astronomy and site of many important astronomical discoveries.',
    visitingHours: 'Thu-Sat 7:30 PM - 10:30 PM',
    website: 'https://cincinnatiobservatory.org',
    address: '3489 Observatory Pl, Cincinnati, OH 45208',
  },
  {
    id: 'taft-museum-of-art',
    name: 'Taft Museum of Art',
    description:
      "A historic house museum and art collection housed in a beautiful 1820s Federal-style mansion. The museum contains one of the finest small art collections in America, including works by European and American masters.",
    shortDescription: '1820s mansion housing premier art collection',
    coordinates: { latitude: 39.1043, longitude: -84.5059 },
    yearBuilt: 1820,
    category: 'building',
    images: ['https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=500'],
    historicalSignificance:
      "One of Cincinnati's most elegant historic homes and important cultural institution.",
    visitingHours: 'Wed-Sun 11:00 AM - 4:00 PM',
    website: 'https://taftmuseum.org',
    address: '316 Pike St, Cincinnati, OH 45202',
  },
  {
    id: 'william-howard-taft-site',
    name: 'William Howard Taft National Historic Site',
    description:
      'The birthplace and boyhood home of William Howard Taft, the 27th President of the United States and 10th Chief Justice. This Greek Revival house provides insight into the early life of this important American figure.',
    shortDescription: 'Birthplace of President and Chief Justice William Howard Taft',
    coordinates: { latitude: 39.1191, longitude: -84.5081 },
    yearBuilt: 1835,
    category: 'site',
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500'],
    historicalSignificance:
      'Birthplace of the only person to serve as both President and Chief Justice of the United States.',
    visitingHours: '10:00 AM - 4:00 PM (seasonal)',
    website: 'https://www.nps.gov/wiho',
    address: '2038 Auburn Ave, Cincinnati, OH 45219',
  },
];

async function clearLandmarks() {
  const snapshot = await db.collection('landmarks').get();
  if (snapshot.empty) {
    console.log('  No existing landmarks to clear.');
    return;
  }
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`  Deleted ${snapshot.docs.length} existing landmark(s).`);
}

async function seed() {
  console.log('🗑️  Clearing existing landmarks...');
  await clearLandmarks();

  console.log('📍 Uploading Cincinnati landmarks...');
  const batch = db.batch();
  for (const landmark of LANDMARKS) {
    const { id, ...data } = landmark;
    const ref = db.collection('landmarks').doc(id);
    batch.set(ref, data);
    console.log(`  ✓ ${landmark.name}`);
  }
  await batch.commit();

  console.log(`\n✅ Done — ${LANDMARKS.length} landmarks uploaded.`);
  console.log('   IDs: ' + LANDMARKS.map(l => l.id).join(', '));
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
