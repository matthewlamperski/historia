const admin = require('firebase-admin');
const serviceAccount = require('./historia-application-firebase-adminsdk-fbsvc-5232516847.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Mock Users
const mockUsers = [
  {
    id: 'mock-user-id',
    name: 'Demo User',
    username: 'demo_user',
    email: 'demo@historia.app',
    avatar: 'https://i.pravatar.cc/150?img=1',
    followerCount: 100,
    followingCount: 80,
    postCount: 25,
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-user-1',
    name: 'Alex Rivera',
    username: 'alex_rivera',
    email: 'alex@historia.app',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format',
    followerCount: 245,
    followingCount: 189,
    postCount: 32,
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-user-2',
    name: 'Sarah Chen',
    username: 'sarahc_photo',
    email: 'sarah@historia.app',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9d4c3a0?w=150&h=150&fit=crop&crop=face&auto=format',
    followerCount: 567,
    followingCount: 234,
    postCount: 78,
    isVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-user-3',
    name: 'Marcus Johnson',
    username: 'marcus_j',
    email: 'marcus@historia.app',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face&auto=format',
    followerCount: 123,
    followingCount: 298,
    postCount: 15,
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-user-4',
    name: 'Emma Davis',
    username: 'emma_explorer',
    email: 'emma@historia.app',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format',
    followerCount: 891,
    followingCount: 456,
    postCount: 134,
    isVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'other-user-1',
    name: 'Alice Smith',
    username: 'alice_s',
    email: 'alice@historia.app',
    avatar: 'https://i.pravatar.cc/150?img=5',
    followerCount: 342,
    followingCount: 156,
    postCount: 56,
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock Posts
const mockPosts = [
  {
    id: '1',
    userId: 'mock-user-1',
    content: 'Welcome to Historia! Just discovered this amazing historical landmark downtown. The architecture is incredible! 🏛️',
    images: [],
    likes: ['mock-user-2', 'mock-user-3'],
    commentCount: 3,
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 30)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 30)),
  },
  {
    id: '2',
    userId: 'mock-user-2',
    content: 'Beautiful day for exploring history! Found this gem tucked away in the old quarter. The stories these walls could tell... 📸',
    images: [],
    likes: ['mock-user-1'],
    commentCount: 1,
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      address: 'San Francisco, CA',
    },
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 2)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 2)),
  },
  {
    id: '3',
    userId: 'mock-user-3',
    content: 'Just finished reading about the Civil War battle that took place here in 1863. Standing where history happened gives me chills. 🪖',
    images: [],
    likes: ['mock-user-1', 'mock-user-4'],
    commentCount: 2,
    location: {
      latitude: 39.8283,
      longitude: -98.5795,
      address: 'Gettysburg, PA',
    },
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 6)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 6)),
  },
  {
    id: '4',
    userId: 'mock-user-4',
    content: 'The preservation work being done at this 18th-century mansion is incredible. History lives on through dedicated people! 🏡',
    images: [],
    likes: ['mock-user-2'],
    commentCount: 0,
    location: {
      latitude: 40.7589,
      longitude: -73.9851,
      address: 'New York, NY',
    },
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 12)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 12)),
  },
  {
    id: '5',
    userId: 'mock-user-1',
    content: 'Weekend trip to explore Native American heritage sites. Learning so much about the rich history of this land. 🪶',
    images: [],
    likes: ['mock-user-2', 'mock-user-3', 'mock-user-4'],
    commentCount: 5,
    location: {
      latitude: 36.0544,
      longitude: -112.1401,
      address: 'Grand Canyon, AZ',
    },
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24)),
  },
];

// Mock Comments
const mockComments = [
  {
    id: 'comment-1-1',
    postId: '1',
    userId: 'mock-user-2',
    content: 'Amazing architecture! I love how they preserved the original stonework.',
    likes: ['mock-user-1'],
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 25)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 25)),
  },
  {
    id: 'comment-1-2',
    postId: '1',
    userId: 'mock-user-3',
    content: 'Which landmark is this? I would love to visit!',
    likes: [],
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 20)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 20)),
  },
  {
    id: 'comment-1-3',
    postId: '1',
    userId: 'mock-user-1',
    content: 'It is the old courthouse downtown! Definitely worth a visit.',
    likes: ['mock-user-2', 'mock-user-3'],
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 15)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 15)),
  },
  {
    id: 'comment-2-1',
    postId: '2',
    userId: 'mock-user-4',
    content: 'The old quarter has so much character! Great find.',
    likes: ['mock-user-2'],
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 1.5)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 1.5)),
  },
  {
    id: 'comment-3-1',
    postId: '3',
    userId: 'mock-user-2',
    content: 'Gettysburg is such a powerful place to visit. The history really comes alive.',
    likes: ['mock-user-1', 'mock-user-4'],
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 5)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 5)),
  },
  {
    id: 'comment-3-2',
    postId: '3',
    userId: 'mock-user-4',
    content: 'I did the battlefield tour last summer. Absolutely incredible experience.',
    likes: ['mock-user-3'],
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 4.5)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 4.5)),
  },
  {
    id: 'comment-5-1',
    postId: '5',
    userId: 'mock-user-3',
    content: 'Native American history is so rich and often overlooked. Thanks for sharing!',
    likes: ['mock-user-1', 'mock-user-2'],
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 20)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 20)),
  },
  {
    id: 'comment-5-2',
    postId: '5',
    userId: 'mock-user-2',
    content: 'The Grand Canyon has such deep cultural significance. Beautiful photos!',
    likes: ['mock-user-4'],
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 18)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 18)),
  },
  {
    id: 'comment-5-3',
    postId: '5',
    userId: 'mock-user-4',
    content: 'I learned so much about the Ancestral Puebloans when I visited. Fascinating!',
    likes: ['mock-user-1'],
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 16)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 16)),
  },
  {
    id: 'comment-5-4',
    postId: '5',
    userId: 'mock-user-1',
    content: 'The park rangers were amazing guides. So knowledgeable!',
    likes: ['mock-user-3', 'mock-user-4'],
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 14)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 14)),
  },
  {
    id: 'comment-5-5',
    postId: '5',
    userId: 'mock-user-3',
    content: 'Adding this to my must-visit list! 🏜️',
    likes: [],
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 12)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 12)),
  },
];

// Mock Conversations
const mockConversations = [
  {
    id: 'mock-conv-1',
    participants: ['mock-user-id', 'other-user-1'],
    participantDetails: [
      mockUsers.find(u => u.id === 'mock-user-id'),
      mockUsers.find(u => u.id === 'other-user-1'),
    ],
    lastMessage: 'Hey! How are you?',
    lastMessageSenderId: 'other-user-1',
    lastMessageTimestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 15)),
    unreadCount: { 'mock-user-id': 2, 'other-user-1': 0 },
    type: 'direct',
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 15)),
  },
];

// Mock Messages
const mockMessages = [
  {
    id: 'mock-msg-1',
    conversationId: 'mock-conv-1',
    senderId: 'mock-user-id',
    text: 'Hello! 👋',
    images: [],
    likes: [],
    isEmojiOnly: true,
    readBy: ['mock-user-id', 'mock-user-1'],
    timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 30)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 30)),
  },
  {
    id: 'mock-msg-2',
    conversationId: 'mock-conv-1',
    senderId: 'mock-user-1',
    text: 'Hey! How are you?',
    images: [],
    likes: ['mock-user-id'],
    isEmojiOnly: false,
    readBy: ['mock-user-1'],
    timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 15)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 15)),
  },
];

async function seedFirestore() {
  console.log('🌱 Starting Firestore seeding...\n');

  try {
    // Upload Users
    console.log('👥 Uploading users...');
    for (const user of mockUsers) {
      await db.collection('users').doc(user.id).set(user);
      console.log(`  ✓ Created user: ${user.name} (${user.id})`);
    }
    console.log(`✅ Uploaded ${mockUsers.length} users\n`);

    // Upload Posts
    console.log('📝 Uploading posts...');
    for (const post of mockPosts) {
      await db.collection('posts').doc(post.id).set(post);
      console.log(`  ✓ Created post: ${post.id} by user ${post.userId}`);
    }
    console.log(`✅ Uploaded ${mockPosts.length} posts\n`);

    // Upload Comments
    console.log('💬 Uploading comments...');
    for (const comment of mockComments) {
      await db.collection('comments').doc(comment.id).set(comment);
      console.log(`  ✓ Created comment: ${comment.id} on post ${comment.postId}`);
    }
    console.log(`✅ Uploaded ${mockComments.length} comments\n`);

    // Upload Conversations
    console.log('💌 Uploading conversations...');
    for (const conversation of mockConversations) {
      await db.collection('conversations').doc(conversation.id).set(conversation);
      console.log(`  ✓ Created conversation: ${conversation.id}`);
    }
    console.log(`✅ Uploaded ${mockConversations.length} conversations\n`);

    // Upload Messages
    console.log('💭 Uploading messages...');
    for (const message of mockMessages) {
      await db
        .collection('conversations')
        .doc(message.conversationId)
        .collection('messages')
        .doc(message.id)
        .set(message);
      console.log(`  ✓ Created message: ${message.id} in conversation ${message.conversationId}`);
    }
    console.log(`✅ Uploaded ${mockMessages.length} messages\n`);

    console.log('🎉 Firestore seeding completed successfully!');
    console.log('\nSummary:');
    console.log(`  - ${mockUsers.length} users`);
    console.log(`  - ${mockPosts.length} posts`);
    console.log(`  - ${mockComments.length} comments`);
    console.log(`  - ${mockConversations.length} conversations`);
    console.log(`  - ${mockMessages.length} messages`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
    process.exit(1);
  }
}

// Run the seeding
seedFirestore();
