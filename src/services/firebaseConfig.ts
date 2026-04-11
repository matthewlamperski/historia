// React Native Firebase auto-initializes from native config files:
// - iOS: GoogleService-Info.plist
// - Android: google-services.json
// No need to call initializeApp() manually

import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';

// Export Firebase services
export { firestore, storage, auth };
export default firestore;

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  POSTS: 'posts',
  COMMENTS: 'comments',
  LANDMARKS: 'landmarks',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  VISITS: 'visits',
  COMPANION_REQUESTS: 'companionRequests',
  // Moderation collections
  REPORTS: 'reports',
  BLOCKS: 'blocks',
  USER_BANS: 'userBans',
  MODERATION_ACTIONS: 'moderationActions',
  // Subscription
  SUBSCRIPTIONS: 'subscriptions',
  // Gratitude journal
  JOURNAL: 'journal',
  // Notifications
  NOTIFICATIONS: 'notifications',
  // Referrals
  REFERRALS: 'referrals',
  // Mutes
  MUTES: 'mutes',
  // Follows: users/{userId}/following/{targetId}  &  users/{userId}/followers/{followerId}
  FOLLOWING: 'following',
  FOLLOWERS: 'followers',
  // User subcollections: users/{userId}/{subcollection}/{docId}
  BOOKMARKS: 'bookmarks',
  VISITED: 'visited',
} as const;