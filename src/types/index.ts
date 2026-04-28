import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Main: undefined;
  Profile: { userId: string };
  ProfileView: { userId: string };
  PostDetail: { post: Post };
  ChatScreen: { conversationId: string; otherUserId?: string; otherUserName?: string; otherUserAvatar?: string; otherUserUsername?: string; pendingLandmarkId?: string };
  Settings: undefined;
  BlockedUsers: undefined;
  MutedUsers: undefined;
  Subscription: undefined;
  Bookmarks: undefined;
  EditProfile: undefined;
  OfflineMaps: undefined;
  NewConversation: { shareLandmarkId?: string } | undefined;
  NewGroup: undefined;
  LandmarkDetail: { landmarkId: string };
  AskBede: { landmarkId: string; landmarkName: string };
  GroupInfo: { conversationId: string };
  ChooseHandle: undefined;
  Notifications: undefined;
  Levels: { userId: string };
  FAQ: undefined;
  FollowList: { userId: string; mode: 'following' | 'followers' };
  CompanionsList: { userId: string };
  SetHometown: undefined;
  NearbyUsers: undefined;
  Auth: undefined;
  // Add more screens as needed
};

export type TabParamList = {
  Map: undefined;
  Feed: undefined;
  Messages: undefined;
  Shop: undefined;
  Profile: undefined;
};

export type RootStackScreenProps<Screen extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, Screen>;

export type TabScreenProps<Screen extends keyof TabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList, Screen>,
    NativeStackScreenProps<RootStackParamList>
  >;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

// Common component props
export interface BaseComponentProps {
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
}

// Button variants
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

// Text variants
export type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'caption'
  | 'label';

// Input types
export type InputVariant = 'default' | 'filled' | 'outline';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// API Response types
export interface ApiResponse<T = any> {
  data: T;
  message: string;
  success: boolean;
}

export class ApiError extends Error {
  constructor(message: string, public code: number, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

// Subscription types
export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionStatus = 'free' | 'trial' | 'active' | 'expired' | 'cancelled';

export type PremiumFeature =
  | 'OFFLINE_MAPS'
  | 'BONUS_POINTS'
  | 'GRATITUDE_REFLECTIONS'
  | 'UNLIMITED_BOOKMARKS'
  | 'ACHIEVEMENT_BADGES'
  | 'POINT_REDEMPTIONS'
  | 'ASK_BEDE';

export interface SubscriptionRecord {
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isOnTrial: boolean;
  trialStartDate: string | null;
  trialEndDate: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  productId: string | null;
  transactionId: string | null;
  platform: 'ios' | 'android' | null;
  referralBonusExpiry?: string | null; // ISO date — user gets premium until this date via referral

  // ─── Lifecycle fields populated by webhook handlers / receipt validation ───
  /** Apple's stable subscription ID across all renewals. Required to match incoming webhook events to a user. */
  originalTransactionId?: string | null;
  /** Google Play purchase token. Required to query Google Play Subscriptions:get for status. */
  purchaseToken?: string | null;
  /** Latest signed receipt blob (Apple) — kept for re-verification on demand. */
  latestReceipt?: string | null;
  /** When the billing-retry grace period ends. During this window we may keep the user as premium per Apple/Google guidance. */
  gracePeriodExpiresDate?: string | null;
  /** Apple/Google flag for whether the subscription will auto-renew. False after user cancels. */
  autoRenewStatus?: boolean | null;
  /** When the user cancelled. May still be active until subscriptionEndDate. */
  cancellationDate?: string | null;
  /** Apple/Google reason code for cancellation/revocation. */
  cancellationReason?: string | null;
  /** 'production' | 'sandbox' — distinguishes test purchases from real ones. */
  environment?: 'production' | 'sandbox' | null;
  /** Set by sendSubscriptionWelcome the first time the welcome email is sent — ensures we never email twice. */
  welcomeEmailSentAt?: string | null;

  createdAt: string;
  updatedAt: string;
}

// User types (example)
export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isVerified: boolean;
  companions: string[]; // array of user IDs who are companions
  // Bookmark/visit counts stored on user doc for display (actual data in subcollections)
  bookmarkCount?: number;
  visitedLandmarks?: string[]; // @deprecated — use users/{id}/visited subcollection
  bookmarkedLandmarks?: string[]; // @deprecated — use users/{id}/bookmarks subcollection
  // Subscription fields (optional for backwards compatibility with existing data)
  isPremium?: boolean;
  pointsBalance?: number;
  subscriptionStatus?: SubscriptionStatus;
  fcmToken?: string; // Firebase Cloud Messaging token for push notifications
  referralCode?: string; // Unique referral code for this user
  hometown?: {
    latitude: number;
    longitude: number;
    city: string; // Display name, e.g. "Cincinnati, OH"
  };
  createdAt: string;
  updatedAt: string;
}

// Referral types
export type ReferralStatus = 'pending' | 'completed' | 'invalid';

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string | null;
  referralCode: string;
  status: ReferralStatus;
  createdAt: Date;
  completedAt: Date | null;
}

// Ask Bede AI assistant
export interface BedeSource {
  title: string;
  url: string;
}

export interface BedeMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: Date;
  sources?: BedeSource[];
}

export interface BedeUsage {
  date: string; // YYYY-MM-DD
  count: number;
  dailyLimit: number;
  remaining: number;
}

// Notification types
export type NotificationType =
  | 'companion_request'
  | 'companion_accepted'
  | 'new_message';

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderUsername?: string;
  type: NotificationType;
  referenceId: string; // companion request doc ID, or conversationId for new_message
  previewText?: string; // short preview (used for message notifications)
  isRead: boolean;
  createdAt: Date;
}

// Minimal landmark snapshot saved alongside a post for fast feed rendering
export interface LandmarkTag {
  id: string;           // Algolia objectID / Firestore landmark doc ID
  name: string;
  category: Landmark['category'];
}

// Post types
export interface Post {
  id: string;
  userId: string;
  user: User;
  content: string;
  images: string[];
  videos?: string[];
  commentCount: number;
  landmarkId?: string; // optional landmark ID if post is about a landmark
  landmark?: Landmark; // optional populated landmark data (legacy)
  landmarkTag?: LandmarkTag; // minimal snapshot for feed display
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
  };
  _geoloc?: {
    lat: number;
    lng: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Comment types
export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user: User;
  content: string;
  likes: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Create Post types
export interface CreatePostData {
  content: string;
  images?: string[];
  videos?: string[];
  landmarkId?: string; // optional landmark ID (legacy)
  landmarkTag?: LandmarkTag; // preferred: minimal snapshot + id
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
  };
}

// Create Comment types
export interface CreateCommentData {
  postId: string;
  content: string;
}

// Landmark types
export type LandmarkType = 'museum' | 'historic_site' | 'manufacturer';

export interface Landmark {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  yearBuilt?: number;
  category: 'monument' | 'building' | 'site' | 'battlefield' | 'other';
  landmarkType?: LandmarkType;
  images: string[];
  historicalSignificance: string;
  visitingHours?: string;
  website?: string;
  address: string;
  // Location context (from Algolia/Firestore)
  city?: string;
  state?: string;
  // Google Places enrichment — present once a user first taps this landmark
  populated?: boolean;
  phone?: string;
  googleMapsUri?: string;
  rating?: number;
  ratingCount?: number;
  openingHours?: string[]; // e.g. ["Monday: 9:00 AM – 5:00 PM", ...]
  wheelchair?: boolean;
  editorialSummary?: string; // short description from Google Places editorialSummary
}

// Offline map pack metadata (stored in AsyncStorage)
export interface OfflinePackMeta {
  packName: string;       // unique key used by MapLibre offlineManager
  landmarkId: string;
  landmarkName: string;
  downloadedAt: string;   // ISO date string
  estimatedSizeMB: number;
}

// Firebase timestamp type
export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
}

// Conversation types
export interface Conversation {
  id: string;
  participants: string[];
  participantDetails: User[];
  lastMessage: string;
  lastMessageType?: 'text' | 'image';
  lastMessageSenderId: string;
  lastMessageTimestamp: Date;
  unreadCount: { [userId: string]: number };
  type: 'direct' | 'group';
  name?: string;       // required for group conversations
  createdBy?: string;  // userId of creator (groups only)
  createdAt: Date;
  updatedAt: Date;
}

// Message types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  text: string;
  images: string[];
  videos?: string[];
  postReference?: {
    postId: string;
    content: string;
    images: string[];
    userId: string;
    userName: string;
  };
  landmarkReference?: {
    landmarkId: string;
    name: string;
    category: Landmark['category'];
    image?: string;
    address?: string;
  };
  likes: string[];
  isEmojiOnly: boolean;
  readBy: string[];
  timestamp: Date;
  updatedAt: Date;
}

// Create Message types
export interface CreateMessageData {
  conversationId: string;
  text: string;
  images?: string[];
  videos?: string[];
  postReference?: {
    postId: string;
    content: string;
    images: string[];
    userId: string;
    userName: string;
  };
  landmarkReference?: {
    landmarkId: string;
    name: string;
    category: Landmark['category'];
    image?: string;
    address?: string;
  };
}

// Create Conversation types
export interface CreateConversationData {
  participantIds: string[];
  initialMessage?: string;
}

// Visit types
export interface Visit {
  id: string;
  userId: string;
  landmarkId: string;
  landmark?: Landmark; // populated landmark data
  visitedAt: Date;
  verificationLocation: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
  photos?: string[];
  createdAt: Date;
}

// Companion Request types
export interface CompanionRequest {
  id: string;
  senderId: string;
  sender?: User; // populated sender data
  receiverId: string;
  receiver?: User; // populated receiver data
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

// Auth Navigation types
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type AuthStackScreenProps<Screen extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, Screen>;

// Auth State types
export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  providerId: string;
}

// Report types
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'inappropriate_content'
  | 'impersonation'
  | 'other';

export type ReportedType = 'user' | 'post' | 'comment' | 'message';

export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

export interface ReportContentSnapshot {
  content?: string;
  images?: string[];
  userName?: string;
}

export interface ReportResolution {
  action: string;
  adminId: string;
  adminNotes?: string;
  resolvedAt: Date;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedId: string; // userId, postId, commentId, or messageId
  reportedType: ReportedType;
  reportedUserId: string; // Author of reported content
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  contentSnapshot: ReportContentSnapshot;
  resolution?: ReportResolution;
  createdAt: Date;
  updatedAt: Date;
}

// Block types
export interface Block {
  id: string; // Format: "{blockerId}_{blockedId}"
  blockerId: string;
  blockedId: string;
  createdAt: Date;
}

// Mute types
export interface Mute {
  id: string; // Format: "{muterId}_{mutedId}"
  muterId: string;
  mutedId: string;
  createdAt: Date;
}

// User Ban types
export type BanType = 'temporary' | 'permanent';

export interface UserBan {
  id: string; // Same as userId
  userId: string;
  isBanned: boolean;
  banType: BanType;
  banExpiresAt?: Date;
  banReason: string;
  bannedBy: string;
  bannedAt: Date;
}

// Moderation Action types
export type ModerationActionType =
  | 'warning'
  | 'content_removed'
  | 'temporary_ban'
  | 'permanent_ban';

export interface ModerationAction {
  id: string;
  reportId?: string;
  targetUserId: string;
  action: ModerationActionType;
  adminId: string;
  reason: string;
  createdAt: Date;
}

// Create Report data
export interface CreateReportData {
  reportedId: string;
  reportedType: ReportedType;
  reportedUserId: string;
  reason: ReportReason;
  description?: string;
  contentSnapshot: ReportContentSnapshot;
}
