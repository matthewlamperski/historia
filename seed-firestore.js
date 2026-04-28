/**
 * Historia Firestore Seed Script
 *
 * Creates demo users (with Firebase Auth accounts), posts, comments, conversations,
 * messages, visits, referrals, and handles using the exact field shapes the app writes.
 *
 * Usage:
 *   node seed-firestore.js
 *
 * Requires the service account key file in the project root.
 * All demo users share the password: TestPass123!
 *
 * To clear seeded data, run:
 *   node seed-firestore.js --clear
 */

const admin = require('firebase-admin');
const serviceAccount = require('./historia-application-firebase-adminsdk-fbsvc-5232516847.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const SEED_PASSWORD = 'TestPass123!';
const CLEAR_MODE = process.argv.includes('--clear');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ago(ms) {
  return admin.firestore.Timestamp.fromDate(new Date(Date.now() - ms));
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── Demo user definitions ────────────────────────────────────────────────────

const DEMO_USERS = [
  {
    email: 'alex@demo.historia.app',
    name: 'Alex Rivera',
    username: 'alex_rivera',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format',
    isVerified: false,
    bio: 'History enthusiast exploring America\'s landmarks one site at a time.',
    location: 'Cincinnati, OH',
    followerCount: 245,
    followingCount: 189,
    isPremium: false,
    pointsBalance: 120,
  },
  {
    email: 'sarah@demo.historia.app',
    name: 'Sarah Chen',
    username: 'sarahc_photo',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9d4c3a0?w=150&h=150&fit=crop&crop=face&auto=format',
    isVerified: true,
    bio: 'Photographer and history lover. Capturing the past through a modern lens.',
    location: 'Boston, MA',
    followerCount: 567,
    followingCount: 234,
    isPremium: true,
    pointsBalance: 1450,
  },
  {
    email: 'marcus@demo.historia.app',
    name: 'Marcus Johnson',
    username: 'marcus_j',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face&auto=format',
    isVerified: false,
    bio: 'Civil War buff. Learning our history so we don\'t repeat it.',
    location: 'Gettysburg, PA',
    followerCount: 123,
    followingCount: 298,
    isPremium: false,
    pointsBalance: 60,
  },
  {
    email: 'emma@demo.historia.app',
    name: 'Emma Davis',
    username: 'emma_explorer',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format',
    isVerified: true,
    bio: 'Visited 47 National Historic Landmarks and counting!',
    location: 'New York, NY',
    followerCount: 891,
    followingCount: 456,
    isPremium: true,
    pointsBalance: 3200,
  },
];

// ─── Clear mode ───────────────────────────────────────────────────────────────

async function clearSeedData(uids) {
  console.log('🗑️  Clearing seeded data...\n');

  // Delete auth accounts
  for (const uid of uids) {
    try {
      await auth.deleteUser(uid);
      console.log(`  ✓ Deleted auth user: ${uid}`);
    } catch (e) {
      console.log(`  - Auth user not found: ${uid}`);
    }
  }

  // For Firestore docs, we'd need to store the UIDs somewhere.
  // Instead, this prints instructions for manual cleanup.
  console.log('\n⚠️  To clear Firestore data, delete the following collections in the Firebase console:');
  console.log('   - users (demo accounts only)');
  console.log('   - posts');
  console.log('   - comments');
  console.log('   - conversations');
  console.log('   - visits');
  console.log('   - referrals');
  console.log('   - handles (demo handles only)');
  console.log('   - subscriptions (demo user docs only)');
}

// ─── Main seed ────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting Historia seed...\n');

  // ── Step 1: Create Auth accounts + Firestore user docs ──────────────────────
  console.log('👥 Creating users...');
  const uids = {};

  for (const def of DEMO_USERS) {
    let uid;
    try {
      // Try to create new auth account
      const userRecord = await auth.createUser({
        email: def.email,
        password: SEED_PASSWORD,
        displayName: def.name,
        photoURL: def.avatar,
      });
      uid = userRecord.uid;
      console.log(`  ✓ Created auth account: ${def.email} (uid: ${uid})`);
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        // Get existing UID
        const existing = await auth.getUserByEmail(def.email);
        uid = existing.uid;
        console.log(`  ~ Auth account already exists: ${def.email} (uid: ${uid})`);
      } else {
        throw err;
      }
    }

    uids[def.username] = uid;
    const referralCode = generateReferralCode();

    // Firestore user doc — exact shape from userService.createUserProfile
    await db.collection('users').doc(uid).set({
      name: def.name,
      username: def.username,
      email: def.email,
      avatar: def.avatar,
      followerCount: def.followerCount,
      followingCount: def.followingCount,
      postCount: 0, // will be updated after posts are created
      isVerified: def.isVerified,
      companions: [],
      visitedLandmarks: [],
      bookmarkedLandmarks: [],
      isPremium: def.isPremium,
      pointsBalance: def.pointsBalance,
      subscriptionStatus: def.isPremium ? 'active' : 'free',
      referralCode,
      bio: def.bio,
      location: def.location,
      website: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Handle doc — exact shape from handleService.reserveHandle
    await db.collection('handles').doc(def.username).set({
      userId: uid,
      createdAt: new Date().toISOString(),
    });

    // Subscription doc — exact shape from subscriptionService
    await db.collection('subscriptions').doc(uid).set({
      userId: uid,
      tier: def.isPremium ? 'premium' : 'free',
      status: def.isPremium ? 'active' : 'free',
      isOnTrial: false,
      trialStartDate: null,
      trialEndDate: null,
      subscriptionStartDate: def.isPremium ? new Date(Date.now() - 30 * DAY).toISOString() : null,
      subscriptionEndDate: def.isPremium ? new Date(Date.now() + 335 * DAY).toISOString() : null,
      productId: def.isPremium ? 'historia_pro_monthly' : null,
      transactionId: def.isPremium ? `demo_txn_${uid.slice(0, 8)}` : null,
      platform: def.isPremium ? 'ios' : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const alexId = uids['alex_rivera'];
  const sarahId = uids['sarahc_photo'];
  const marcusId = uids['marcus_j'];
  const emmaId = uids['emma_explorer'];

  console.log(`✅ Created ${DEMO_USERS.length} users\n`);

  // ── Step 2: Posts ────────────────────────────────────────────────────────────
  console.log('📝 Creating posts...');

  const posts = [
    {
      userId: alexId,
      content: 'Just checked in at the Lincoln Memorial. Standing here knowing Lincoln delivered the Gettysburg Address — this place gives me chills every time. A must-visit.',
      images: [],
      landmarkId: null,
      commentCount: 0,
      location: { latitude: 38.8893, longitude: -77.0502, address: 'Washington, D.C.' },
      createdAt: ago(30 * MINUTE),
      updatedAt: ago(30 * MINUTE),
    },
    {
      userId: sarahId,
      content: 'The Old North Church in Boston is everything. This is where Paul Revere\'s midnight ride began — "One if by land, two if by sea." History doesn\'t get more American than this. 📸🕯️',
      images: [],
      landmarkId: null,
      commentCount: 0,
      location: { latitude: 42.3665, longitude: -71.0543, address: 'Boston, MA' },
      createdAt: ago(2 * HOUR),
      updatedAt: ago(2 * HOUR),
    },
    {
      userId: marcusId,
      content: 'Gettysburg battlefield. Walked the entire 3-day route. 51,000 casualties in three days changed the course of the Civil War. Every American should come here at least once. 🪖',
      images: [],
      landmarkId: null,
      commentCount: 0,
      location: { latitude: 39.8116, longitude: -77.2302, address: 'Gettysburg, PA' },
      createdAt: ago(5 * HOUR),
      updatedAt: ago(5 * HOUR),
    },
    {
      userId: emmaId,
      content: 'Landmark #47 checked off my list — the Thomas Edison National Historical Park in New Jersey. The lab where the lightbulb, phonograph, and motion pictures were invented. The man\'s genius was truly breathtaking. 💡',
      images: [],
      landmarkId: null,
      commentCount: 0,
      location: { latitude: 40.7831, longitude: -74.2402, address: 'West Orange, NJ' },
      createdAt: ago(10 * HOUR),
      updatedAt: ago(10 * HOUR),
    },
    {
      userId: alexId,
      content: 'Exploring Native American heritage at Mesa Verde. The cliff dwellings of the Ancestral Puebloans date back 1,400 years. We are custodians of an incredibly deep history. 🪶',
      images: [],
      landmarkId: null,
      commentCount: 0,
      location: { latitude: 37.1853, longitude: -108.4617, address: 'Mesa Verde, CO' },
      createdAt: ago(24 * HOUR),
      updatedAt: ago(24 * HOUR),
    },
    {
      userId: sarahId,
      content: 'The Independence Hall in Philadelphia feels sacred. The Declaration of Independence and the Constitution were both debated and adopted in this very room. Every brick here is a piece of America\'s soul.',
      images: [],
      landmarkId: null,
      commentCount: 0,
      location: { latitude: 39.9489, longitude: -75.1500, address: 'Philadelphia, PA' },
      createdAt: ago(2 * DAY),
      updatedAt: ago(2 * DAY),
    },
  ];

  const postIds = [];
  for (const post of posts) {
    const ref = await db.collection('posts').add(post);
    postIds.push(ref.id);
    console.log(`  ✓ Created post: ${ref.id}`);
  }

  // Update post counts
  await db.collection('users').doc(alexId).update({ postCount: 2 });
  await db.collection('users').doc(sarahId).update({ postCount: 2 });
  await db.collection('users').doc(marcusId).update({ postCount: 1 });
  await db.collection('users').doc(emmaId).update({ postCount: 1 });

  console.log(`✅ Created ${posts.length} posts\n`);

  // ── Step 3: Comments ─────────────────────────────────────────────────────────
  console.log('💬 Creating comments...');

  const comments = [
    // On post 0 (Alex at Lincoln Memorial)
    { postId: postIds[0], userId: sarahId, content: 'One of my favorite places in DC. The Reflecting Pool view at sunrise is unforgettable.', likes: [], createdAt: ago(20 * MINUTE), updatedAt: ago(20 * MINUTE) },
    { postId: postIds[0], userId: marcusId, content: 'Lincoln\'s second inaugural address is engraved on the north wall. Read every word — it will move you.', likes: [], createdAt: ago(15 * MINUTE), updatedAt: ago(15 * MINUTE) },
    // On post 1 (Sarah at Old North Church)
    { postId: postIds[1], userId: emmaId, content: 'The belfry tour is worth it! You can see the harbor from up there.', likes: [], createdAt: ago(90 * MINUTE), updatedAt: ago(90 * MINUTE) },
    // On post 2 (Marcus at Gettysburg)
    { postId: postIds[2], userId: alexId, content: 'Did you do the auto tour or the ranger-led walk? Highly recommend the ranger program.', likes: [], createdAt: ago(4 * HOUR), updatedAt: ago(4 * HOUR) },
    { postId: postIds[2], userId: emmaId, content: 'The Cyclorama painting at the Visitor Center is incredible — 377 feet of immersive battle scene.', likes: [], createdAt: ago(3.5 * HOUR), updatedAt: ago(3.5 * HOUR) },
    // On post 4 (Alex at Mesa Verde)
    { postId: postIds[4], userId: sarahId, content: 'Cliff Palace is the jewel of Mesa Verde. Book your tour early — it sells out fast!', likes: [], createdAt: ago(20 * HOUR), updatedAt: ago(20 * HOUR) },
  ];

  for (const comment of comments) {
    const ref = await db.collection('comments').add(comment);
    // Increment post commentCount
    await db.collection('posts').doc(comment.postId).update({
      commentCount: admin.firestore.FieldValue.increment(1),
    });
    console.log(`  ✓ Created comment: ${ref.id}`);
  }

  console.log(`✅ Created ${comments.length} comments\n`);

  // ── Step 4: Conversations + Messages ─────────────────────────────────────────
  console.log('💌 Creating conversations...');

  // Direct conversation: Alex ↔ Sarah
  const convRef1 = await db.collection('conversations').add({
    participants: [alexId, sarahId],
    participantDetails: [
      { id: alexId, name: 'Alex Rivera', username: 'alex_rivera', avatar: DEMO_USERS[0].avatar, isVerified: false },
      { id: sarahId, name: 'Sarah Chen', username: 'sarahc_photo', avatar: DEMO_USERS[1].avatar, isVerified: true },
    ],
    lastMessage: 'See you there! It\'s going to be amazing.',
    lastMessageSenderId: sarahId,
    lastMessageTimestamp: ago(5 * MINUTE),
    unreadCount: { [alexId]: 1, [sarahId]: 0 },
    type: 'direct',
    createdAt: ago(2 * DAY),
    updatedAt: ago(5 * MINUTE),
  });
  console.log(`  ✓ Created direct conversation: ${convRef1.id}`);

  const msgs1 = [
    { senderId: alexId, text: 'Hey! Are you going to the Gettysburg preservation event next month?', ago: 2 * HOUR },
    { senderId: sarahId, text: 'Yes! I\'ve been looking forward to it for weeks. Are you bringing your camera?', ago: 1.5 * HOUR },
    { senderId: alexId, text: 'Of course. I want to document the cannon restoration ceremony.', ago: HOUR },
    { senderId: sarahId, text: 'See you there! It\'s going to be amazing.', ago: 5 * MINUTE },
  ];

  for (const msg of msgs1) {
    await db.collection('conversations').doc(convRef1.id).collection('messages').add({
      conversationId: convRef1.id,
      senderId: msg.senderId,
      text: msg.text,
      images: [],
      postReference: null,
      likes: [],
      isEmojiOnly: false,
      readBy: [msg.senderId],
      timestamp: ago(msg.ago),
      updatedAt: ago(msg.ago),
    });
  }

  // Group conversation: Alex, Marcus, Emma
  const convRef2 = await db.collection('conversations').add({
    participants: [alexId, marcusId, emmaId],
    participantDetails: [
      { id: alexId, name: 'Alex Rivera', username: 'alex_rivera', avatar: DEMO_USERS[0].avatar, isVerified: false },
      { id: marcusId, name: 'Marcus Johnson', username: 'marcus_j', avatar: DEMO_USERS[2].avatar, isVerified: false },
      { id: emmaId, name: 'Emma Davis', username: 'emma_explorer', avatar: DEMO_USERS[3].avatar, isVerified: true },
    ],
    lastMessage: 'I\'ll share my notes from the last trip!',
    lastMessageSenderId: emmaId,
    lastMessageTimestamp: ago(3 * HOUR),
    unreadCount: { [alexId]: 2, [marcusId]: 2, [emmaId]: 0 },
    type: 'group',
    name: 'Landmark Hunters 🏛️',
    createdBy: alexId,
    createdAt: ago(7 * DAY),
    updatedAt: ago(3 * HOUR),
  });
  console.log(`  ✓ Created group conversation: ${convRef2.id}`);

  const msgs2 = [
    { senderId: alexId, text: 'Anyone planning a road trip this spring? I\'m thinking the Freedom Trail in Boston.', ago: 5 * HOUR },
    { senderId: marcusId, text: 'I\'m in! I\'ve been meaning to do the full 2.5-mile walk for years.', ago: 4.5 * HOUR },
    { senderId: emmaId, text: 'Count me in. I have some insider tips on the best stops.', ago: 4 * HOUR },
    { senderId: emmaId, text: 'I\'ll share my notes from the last trip!', ago: 3 * HOUR },
  ];

  for (const msg of msgs2) {
    await db.collection('conversations').doc(convRef2.id).collection('messages').add({
      conversationId: convRef2.id,
      senderId: msg.senderId,
      text: msg.text,
      images: [],
      postReference: null,
      likes: [],
      isEmojiOnly: false,
      readBy: [msg.senderId],
      timestamp: ago(msg.ago),
      updatedAt: ago(msg.ago),
    });
  }

  console.log(`✅ Created 2 conversations with ${msgs1.length + msgs2.length} messages\n`);

  // ── Step 5: Visits ────────────────────────────────────────────────────────────
  console.log('📍 Creating visits...');

  const visits = [
    { userId: alexId, landmarkId: 'lincoln_memorial', coords: { latitude: 38.8893, longitude: -77.0502 }, ago: 30 * MINUTE },
    { userId: alexId, landmarkId: 'mesa_verde', coords: { latitude: 37.1853, longitude: -108.4617 }, ago: 24 * HOUR },
    { userId: sarahId, landmarkId: 'old_north_church', coords: { latitude: 42.3665, longitude: -71.0543 }, ago: 2 * HOUR },
    { userId: sarahId, landmarkId: 'independence_hall', coords: { latitude: 39.9489, longitude: -75.1500 }, ago: 2 * DAY },
    { userId: marcusId, landmarkId: 'gettysburg', coords: { latitude: 39.8116, longitude: -77.2302 }, ago: 5 * HOUR },
    { userId: emmaId, landmarkId: 'thomas_edison_nhp', coords: { latitude: 40.7831, longitude: -74.2402 }, ago: 10 * HOUR },
  ];

  for (const visit of visits) {
    const ref = await db.collection('visits').add({
      userId: visit.userId,
      landmarkId: visit.landmarkId,
      visitedAt: ago(visit.ago),
      verificationLocation: visit.coords,
      notes: null,
      photos: [],
      createdAt: ago(visit.ago),
    });
    // Update user's visitedLandmarks array
    await db.collection('users').doc(visit.userId).update({
      visitedLandmarks: admin.firestore.FieldValue.arrayUnion(visit.landmarkId),
    });
    console.log(`  ✓ Created visit: ${ref.id}`);
  }

  console.log(`✅ Created ${visits.length} visits\n`);

  // ── Step 6: Referral (Alex referred Marcus) ──────────────────────────────────
  console.log('🎁 Creating referral...');

  const alexDoc = await db.collection('users').doc(alexId).get();
  const alexReferralCode = alexDoc.data().referralCode;

  await db.collection('referrals').add({
    referrerId: alexId,
    referredId: marcusId,
    referralCode: alexReferralCode,
    status: 'completed',
    createdAt: ago(7 * DAY),
    completedAt: ago(7 * DAY),
  });

  console.log(`  ✓ Created referral: alex_rivera → marcus_j (code: ${alexReferralCode})`);
  console.log('✅ Created 1 referral\n');

  // ── Done ──────────────────────────────────────────────────────────────────────
  console.log('🎉 Seed complete!\n');
  console.log('Demo accounts (password for all: TestPass123!)');
  console.log('──────────────────────────────────────────────');
  for (const def of DEMO_USERS) {
    console.log(`  ${def.name.padEnd(18)} ${def.email}`);
  }
  console.log('\nFirestore data created:');
  console.log(`  ${DEMO_USERS.length} users  ·  ${posts.length} posts  ·  ${comments.length} comments`);
  console.log(`  2 conversations  ·  ${msgs1.length + msgs2.length} messages  ·  ${visits.length} visits  ·  1 referral`);

  process.exit(0);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

if (CLEAR_MODE) {
  // To clear, you'd need to pass the UIDs — for now just print instructions
  console.log('To clear seeded data, delete demo user documents from the Firebase console.');
  console.log('Demo emails:');
  DEMO_USERS.forEach(u => console.log(`  - ${u.email}`));
  process.exit(0);
} else {
  seed().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
}
