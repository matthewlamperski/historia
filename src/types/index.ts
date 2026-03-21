import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Main: undefined;
  Profile: { userId: string };
  ProfileView: { userId: string };
  PostDetail: { post: Post };
  ChatScreen: { conversationId: string; otherUserId?: string };
  Settings: undefined;
  BlockedUsers: undefined;
  Subscription: undefined;
  Bookmarks: undefined;
  EditProfile: undefined;
  // Add more screens as needed
};

export type TabParamList = {
  Map: undefined;
  Feed: undefined;
  Messages: undefined;
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
  | 'POINT_REDEMPTIONS';

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
  visitedLandmarks: string[]; // array of landmark IDs visited
  bookmarkedLandmarks: string[]; // array of landmark IDs bookmarked
  // Subscription fields (optional for backwards compatibility with existing data)
  isPremium?: boolean;
  pointsBalance?: number;
  subscriptionStatus?: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
}

// Post types
export interface Post {
  id: string;
  userId: string;
  user: User;
  content: string;
  images: string[];
  commentCount: number;
  landmarkId?: string; // optional landmark ID if post is about a landmark
  landmark?: Landmark; // optional populated landmark data
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
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
  landmarkId?: string; // optional landmark ID
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

// Create Comment types
export interface CreateCommentData {
  postId: string;
  content: string;
}

// Landmark types
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
  images: string[];
  historicalSignificance: string;
  visitingHours?: string;
  website?: string;
  address: string;
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
  lastMessageSenderId: string;
  lastMessageTimestamp: Date;
  unreadCount: { [userId: string]: number };
  type: 'direct' | 'group';
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
  postReference?: {
    postId: string;
    content: string;
    images: string[];
    userId: string;
    userName: string;
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
  postReference?: {
    postId: string;
    content: string;
    images: string[];
    userId: string;
    userName: string;
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
