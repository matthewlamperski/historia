import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Main: undefined;
  Profile: { userId: string };
  ProfileView: { userId: string };
  PostDetail: { post: Post };
  Settings: undefined;
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

// User types (example)
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

// Post types
export interface Post {
  id: string;
  userId: string;
  user: User;
  content: string;
  images: string[];
  likes: string[]; // array of user IDs who liked
  commentCount: number;
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
