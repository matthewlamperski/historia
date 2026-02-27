// User types
export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
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
  reporterName?: string;
  reportedId: string;
  reportedType: ReportedType;
  reportedUserId: string;
  reportedUserName?: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  contentSnapshot: ReportContentSnapshot;
  resolution?: ReportResolution;
  createdAt: Date;
  updatedAt: Date;
}

// User Ban types
export type BanType = 'temporary' | 'permanent';

export interface UserBan {
  id: string;
  userId: string;
  userName?: string;
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
  targetUserName?: string;
  action: ModerationActionType;
  adminId: string;
  reason: string;
  createdAt: Date;
}

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  POSTS: 'posts',
  COMMENTS: 'comments',
  REPORTS: 'reports',
  BLOCKS: 'blocks',
  USER_BANS: 'userBans',
  MODERATION_ACTIONS: 'moderationActions',
} as const;

// Dashboard stats
export interface DashboardStats {
  pendingReports: number;
  reportsToday: number;
  activeBans: number;
  totalUsers: number;
}
