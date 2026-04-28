// One-shot seed: upload 3 hero images to Storage and write 3 blogPosts docs.
// Idempotent on re-run: writes are deterministic doc IDs, replaces existing.

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const SERVICE_ACCOUNT_PATH =
  '/Users/matthewlamperski/lampdev/historia/landmarks/historia-application-firebase-adminsdk-fbsvc-5232516847.json';

admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
  storageBucket: 'historia-application.firebasestorage.app',
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

const posts = JSON.parse(fs.readFileSync('/tmp/historia-blog/posts.json', 'utf8'));

// Map by file order (image1→post1, etc). image4 unused.
const HERO_IMAGE = {
  'the-story-behind-explore-historia': 'image1.jpg',
  'everyday-drives-meaningful-adventures': 'image2.jpg',
  'gratitude-media': 'image3.jpg',
};

async function uploadHero(slug, srcFilename) {
  const local = path.join('/tmp/historia-blog/images', srcFilename);
  const ext = path.extname(srcFilename).slice(1);
  const stamp = Date.now();
  const dest = `blog/${slug}-${stamp}.${ext}`;

  await bucket.upload(local, {
    destination: dest,
    metadata: {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      cacheControl: 'public, max-age=86400',
    },
    public: true,
  });
  await bucket.file(dest).makePublic();
  // Public URL — bucket allows anonymous read of blog/* via Storage rules,
  // and we set object ACL to public-read above.
  return `https://storage.googleapis.com/${bucket.name}/${dest}`;
}

async function main() {
  console.log(`📝  Seeding ${posts.length} blog post(s)\n`);
  const now = Date.now();
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    process.stdout.write(`  ${p.slug} ... `);

    const heroSrc = HERO_IMAGE[p.slug];
    const heroImageUrl = heroSrc ? await uploadHero(p.slug, heroSrc) : '';

    // Stagger publishedAt by 1s so the ordering on /blog is stable.
    // Earlier-in-doc posts get HIGHER timestamps so they appear first
    // when sorted by publishedAt desc.
    const publishedMs = now - i * 1000;
    const publishedAt = admin.firestore.Timestamp.fromMillis(publishedMs);
    const createdAt = admin.firestore.Timestamp.fromMillis(publishedMs);
    const updatedAt = admin.firestore.Timestamp.fromMillis(publishedMs);

    const docId = `seed-${p.slug}`;
    await db.collection('blogPosts').doc(docId).set(
      {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        body: p.body,
        heroImageUrl,
        authorName: 'The Historia team',
        status: 'published',
        publishedAt,
        createdAt,
        updatedAt,
      },
      { merge: false }
    );
    console.log(`✓  hero: ${heroImageUrl ? 'uploaded' : 'none'}`);
  }
  console.log('\n🎉  Done. View the collection at:');
  console.log(`   https://console.firebase.google.com/project/historia-application/firestore/data/~2FblogPosts\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
