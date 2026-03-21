// Firebase imports with error handling
let firestore: any = null;
let storage: any = null;

try {
  firestore = require('@react-native-firebase/firestore').default;
  storage = require('@react-native-firebase/storage').default;
} catch {
  console.warn('Firebase modules not available, using mock data only');
}

import { COLLECTIONS } from './firebaseConfig';
import { Post, Comment, CreatePostData, CreateCommentData, User, Landmark } from '../types';
import { landmarksService } from './landmarksService';

// Random profile pictures for demo users
const randomAvatars = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face&auto=format',
  'https://images.unsplash.com/photo-1494790108755-2616b9d4c3a0?w=150&h=150&fit=crop&crop=face&auto=format',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face&auto=format',
];

// Mock data for development
const mockUsers: User[] = [
  {
    id: 'mock-user-1',
    name: 'Alex Rivera',
    username: 'alex_rivera',
    email: 'alex@historia.app',
    avatar: randomAvatars[0],
    followerCount: 245,
    followingCount: 189,
    postCount: 32,
    isVerified: false,
    companions: ['mock-user-2', 'mock-user-3'],
    visitedLandmarks: ['1', '2', '3'],
    bookmarkedLandmarks: ['4', '5'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-user-2',
    name: 'Sarah Chen',
    username: 'sarahc_photo',
    email: 'sarah@historia.app',
    avatar: randomAvatars[1],
    followerCount: 567,
    followingCount: 234,
    postCount: 78,
    isVerified: true,
    companions: ['mock-user-1'],
    visitedLandmarks: ['1', '2', '4'],
    bookmarkedLandmarks: ['3', '6'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-user-3',
    name: 'Marcus Johnson',
    username: 'marcus_j',
    email: 'marcus@historia.app',
    avatar: randomAvatars[2],
    followerCount: 123,
    followingCount: 298,
    postCount: 15,
    isVerified: false,
    companions: ['mock-user-1', 'mock-user-4'],
    visitedLandmarks: ['2', '3', '5'],
    bookmarkedLandmarks: ['1'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-user-4',
    name: 'Emma Davis',
    username: 'emma_explorer',
    email: 'emma@historia.app',
    avatar: randomAvatars[3],
    followerCount: 891,
    followingCount: 456,
    postCount: 134,
    isVerified: true,
    companions: ['mock-user-3'],
    visitedLandmarks: ['1', '3', '4', '5', '6'],
    bookmarkedLandmarks: ['2'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockPosts: Post[] = [
  {
    id: '1',
    userId: 'mock-user-1',
    user: mockUsers[0],
    content: 'Welcome to Historia! Just discovered this amazing historical landmark downtown. The architecture is incredible! 🏛️',
    images: [],
    landmarkId: '1',
    commentCount: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '2',
    userId: 'mock-user-2',
    user: mockUsers[1],
    content: 'Beautiful day for exploring history! Found this gem tucked away in the old quarter. The stories these walls could tell... 📸',
    images: [],
    landmarkId: '2',
    commentCount: 1,
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      address: 'San Francisco, CA',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: '3',
    userId: 'mock-user-3',
    user: mockUsers[2],
    content: 'Just finished reading about the Civil War battle that took place here in 1863. Standing where history happened gives me chills. 🪖',
    images: [],
    commentCount: 2,
    location: {
      latitude: 39.8283,
      longitude: -98.5795,
      address: 'Gettysburg, PA',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
  },
  {
    id: '4',
    userId: 'mock-user-4',
    user: mockUsers[3],
    content: 'The preservation work being done at this 18th-century mansion is incredible. History lives on through dedicated people! 🏡',
    images: [],
    landmarkId: '5',
    commentCount: 0,
    location: {
      latitude: 40.7589,
      longitude: -73.9851,
      address: 'New York, NY',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
  },
  {
    id: '5',
    userId: 'mock-user-1',
    user: mockUsers[0],
    content: 'Weekend trip to explore Native American heritage sites. Learning so much about the rich history of this land. 🪶',
    images: [],
    commentCount: 5,
    location: {
      latitude: 36.0544,
      longitude: -112.1401,
      address: 'Grand Canyon, AZ',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
];

// Mock comments data
const mockComments: Comment[] = [
  // Comments for post 1
  {
    id: 'comment-1-1',
    postId: '1',
    userId: 'mock-user-2',
    user: mockUsers[1],
    content: 'Amazing architecture! I love how they preserved the original stonework.',
    likes: ['mock-user-1'],
    createdAt: new Date(Date.now() - 1000 * 60 * 25), // 25 minutes ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 25),
  },
  {
    id: 'comment-1-2',
    postId: '1',
    userId: 'mock-user-3',
    user: mockUsers[2],
    content: 'Which landmark is this? I would love to visit!',
    likes: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 20), // 20 minutes ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 20),
  },
  {
    id: 'comment-1-3',
    postId: '1',
    userId: 'mock-user-1',
    user: mockUsers[0],
    content: 'It is the old courthouse downtown! Definitely worth a visit.',
    likes: ['mock-user-2', 'mock-user-3'],
    createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 15),
  },

  // Comments for post 2
  {
    id: 'comment-2-1',
    postId: '2',
    userId: 'mock-user-4',
    user: mockUsers[3],
    content: 'The old quarter has so much character! Great find.',
    likes: ['mock-user-2'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1.5), // 1.5 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 1.5),
  },

  // Comments for post 3
  {
    id: 'comment-3-1',
    postId: '3',
    userId: 'mock-user-2',
    user: mockUsers[1],
    content: 'Gettysburg is such a powerful place to visit. The history really comes alive.',
    likes: ['mock-user-1', 'mock-user-4'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
  {
    id: 'comment-3-2',
    postId: '3',
    userId: 'mock-user-4',
    user: mockUsers[3],
    content: 'I did the battlefield tour last summer. Absolutely incredible experience.',
    likes: ['mock-user-3'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4.5), // 4.5 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4.5),
  },

  // Comments for post 5
  {
    id: 'comment-5-1',
    postId: '5',
    userId: 'mock-user-3',
    user: mockUsers[2],
    content: 'Native American history is so rich and often overlooked. Thanks for sharing!',
    likes: ['mock-user-1', 'mock-user-2'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20), // 20 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
  },
  {
    id: 'comment-5-2',
    postId: '5',
    userId: 'mock-user-2',
    user: mockUsers[1],
    content: 'The Grand Canyon has such deep cultural significance. Beautiful photos!',
    likes: ['mock-user-4'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18), // 18 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
  },
  {
    id: 'comment-5-3',
    postId: '5',
    userId: 'mock-user-4',
    user: mockUsers[3],
    content: 'I learned so much about the Ancestral Puebloans when I visited. Fascinating!',
    likes: ['mock-user-1'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 16), // 16 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 16),
  },
  {
    id: 'comment-5-4',
    postId: '5',
    userId: 'mock-user-1',
    user: mockUsers[0],
    content: 'The park rangers were amazing guides. So knowledgeable!',
    likes: ['mock-user-3', 'mock-user-4'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 14), // 14 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 14),
  },
  {
    id: 'comment-5-5',
    postId: '5',
    userId: 'mock-user-3',
    user: mockUsers[2],
    content: 'Adding this to my must-visit list! 🏜️',    likes: [],    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
  },
];

let mockPostsData = [...mockPosts];
let mockCommentsData = [...mockComments];

class PostsService {
  private isFirebaseAvailable(): boolean {
    try {
      // Check if Firebase modules are loaded and functional
      if (!firestore || !storage) {
        return false;
      }
      // Try to access Firestore - if it fails, we'll use mock data
      firestore();
      return true;
    } catch {
      console.log('Firebase not available, using mock data');
      return false;
    }
  }

  // Get posts with pagination (for infinite scrolling)
  async getPosts(limit: number = 20, lastPostId?: string): Promise<Post[]> {
    if (!this.isFirebaseAvailable()) {
      // Return mock data for development
      await new Promise<void>(resolve => setTimeout(resolve, 500)); // Simulate network delay
      return mockPostsData.slice(0, limit);
    }

    try {
      let query = firestore()
        .collection(COLLECTIONS.POSTS)
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (lastPostId) {
        const lastDoc = await firestore()
          .collection(COLLECTIONS.POSTS)
          .doc(lastPostId)
          .get();
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();

      const posts = await Promise.all(
        snapshot.docs.map(async (doc: any) => {
          const data = doc.data();

          // Get user data
          const userDoc = await firestore()
            .collection(COLLECTIONS.USERS)
            .doc(data.userId)
            .get();

          const user = { id: data.userId, ...userDoc.data() } as User;

          // Get landmark data if present
          let landmark: Landmark | undefined;
          if (data.landmarkId) {
            landmark = await landmarksService.getLandmark(data.landmarkId) || undefined;
          }

          return {
            id: doc.id,
            ...data,
            user,
            landmark,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          } as Post;
        })
      );

      return posts;
    } catch (error) {
      console.error('Error fetching posts:', error);
      // Fallback to mock data on error
      return mockPostsData.slice(0, limit);
    }
  }

  // Get posts near a location
  async getPostsNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    limit: number = 20
  ): Promise<Post[]> {
    try {
      // For a production app, you'd want to use a geospatial query service like Firebase Extensions
      // For now, we'll get all posts and filter client-side (not efficient for large datasets)
      const snapshot = await firestore()
        .collection(COLLECTIONS.POSTS)
        .where('location', '!=', null)
        .orderBy('location')
        .orderBy('createdAt', 'desc')
        .limit(limit * 2) // Get more than needed to account for filtering
        .get();

      const posts = await Promise.all(
        snapshot.docs.map(async (doc: any) => {
          const data = doc.data();
          
          // Calculate distance (simple approximation)
          if (data.location) {
            const distance = this.calculateDistance(
              latitude,
              longitude,
              data.location.latitude,
              data.location.longitude
            );

            if (distance <= radiusKm) {
              // Get user data
              const userDoc = await firestore()
                .collection(COLLECTIONS.USERS)
                .doc(data.userId)
                .get();

              const user = { id: data.userId, ...userDoc.data() } as User;

              return {
                id: doc.id,
                ...data,
                user,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
              } as Post;
            }
          }
          return null;
        })
      );

      return posts.filter(post => post !== null).slice(0, limit);
    } catch (error) {
      console.error('Error fetching posts near location:', error);
      throw error;
    }
  }

  // Create a new post
  async createPost(postData: CreatePostData, userId: string, currentUser?: User): Promise<Post> {
    // Validate photo limit (max 10 photos)
    if (postData.images && postData.images.length > 10) {
      throw new Error('Maximum 10 photos allowed per post');
    }

    if (!this.isFirebaseAvailable()) {
      // Mock implementation
      await new Promise<void>(resolve => setTimeout(resolve, 1000)); // Simulate upload delay
      const user = currentUser || mockUsers.find(u => u.id === userId) || mockUsers[0];

      let landmark: Landmark | undefined;
      if (postData.landmarkId) {
        landmark = await landmarksService.getLandmark(postData.landmarkId) || undefined;
      }

      const newPost: Post = {
        id: Date.now().toString(),
        userId,
        user: user,
        content: postData.content,
        images: postData.images || [],
        landmarkId: postData.landmarkId,
        landmark,
        commentCount: 0,
        location: postData.location,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPostsData.unshift(newPost);
      return newPost;
    }

    try {
      const now = firestore.Timestamp.now();

      const newPost = {
        userId,
        content: postData.content,
        images: postData.images || [],
        landmarkId: postData.landmarkId || null,
        commentCount: 0,
        location: postData.location || null,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await firestore()
        .collection(COLLECTIONS.POSTS)
        .add(newPost);

      // Use the passed user object if available, otherwise fetch from Firestore
      let user: User;
      if (currentUser) {
        user = currentUser;
      } else {
        const userDoc = await firestore()
          .collection(COLLECTIONS.USERS)
          .doc(userId)
          .get();
        user = { id: userId, ...userDoc.data() } as User;
      }

      // Get landmark data if present
      let landmark: Landmark | undefined;
      if (postData.landmarkId) {
        landmark = await landmarksService.getLandmark(postData.landmarkId) || undefined;
      }

      return {
        id: docRef.id,
        ...newPost,
        user,
        landmark,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      } as Post;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  // Get posts from companions (for companion filter)
  async getCompanionPosts(
    companionIds: string[],
    limit: number = 20,
    lastPostId?: string
  ): Promise<Post[]> {
    if (!this.isFirebaseAvailable()) {
      // Return mock data filtered by companion IDs
      await new Promise<void>(resolve => setTimeout(resolve, 500));
      const companionPosts = mockPostsData.filter(post =>
        companionIds.includes(post.userId)
      );
      return companionPosts.slice(0, limit);
    }

    try {
      if (companionIds.length === 0) return [];

      let query = firestore()
        .collection(COLLECTIONS.POSTS)
        .where('userId', 'in', companionIds.slice(0, 10)) // Firestore 'in' query supports max 10 values
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (lastPostId) {
        const lastDoc = await firestore()
          .collection(COLLECTIONS.POSTS)
          .doc(lastPostId)
          .get();
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();

      const posts = await Promise.all(
        snapshot.docs.map(async (doc: any) => {
          const data = doc.data();

          // Get user data
          const userDoc = await firestore()
            .collection(COLLECTIONS.USERS)
            .doc(data.userId)
            .get();

          const user = { id: data.userId, ...userDoc.data() } as User;

          // Get landmark data if present
          let landmark: Landmark | undefined;
          if (data.landmarkId) {
            landmark = await landmarksService.getLandmark(data.landmarkId) || undefined;
          }

          return {
            id: doc.id,
            ...data,
            user,
            landmark,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          } as Post;
        })
      );

      return posts;
    } catch (error) {
      console.error('Error fetching companion posts:', error);
      throw error;
    }
  }

  // Get comments for a post
  async getComments(postId: string, limit: number = 20): Promise<Comment[]> {
    if (!this.isFirebaseAvailable()) {
      // Mock implementation - return mock comments for the post
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      
      const postComments = mockCommentsData
        .filter(comment => comment.postId === postId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
      
      return postComments;
    }

    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.COMMENTS)
        .where('postId', '==', postId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const comments = await Promise.all(
        snapshot.docs.map(async (doc: any) => {
          const data = doc.data();
          
          // Get user data
          const userDoc = await firestore()
            .collection(COLLECTIONS.USERS)
            .doc(data.userId)
            .get();

          const user = { id: data.userId, ...userDoc.data() } as User;

          return {
            id: doc.id,
            ...data,
            user,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          } as Comment;
        })
      );

      return comments;
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }

  // Create a comment
  async createComment(commentData: CreateCommentData, userId: string): Promise<Comment> {
    if (!this.isFirebaseAvailable()) {
      // Mock implementation
      await new Promise<void>(resolve => setTimeout(resolve, 500));
      
      // Find the user for this comment
      const user = mockUsers.find(u => u.id === userId) || mockUsers[0];
      
      const newComment: Comment = {
        id: `comment-${Date.now()}`,
        postId: commentData.postId,
        userId,
        user,
        content: commentData.content,
        likes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Add comment to mock data
      mockCommentsData.push(newComment);
      
      // Update post comment count
      const postIndex = mockPostsData.findIndex(p => p.id === commentData.postId);
      if (postIndex !== -1) {
        mockPostsData[postIndex].commentCount++;
      }
      
      return newComment;
    }

    try {
      const now = firestore.Timestamp.now();
      
      const newComment = {
        postId: commentData.postId,
        userId,
        content: commentData.content,
        likes: [],
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await firestore()
        .collection(COLLECTIONS.COMMENTS)
        .add(newComment);

      // Update post comment count
      await firestore()
        .collection(COLLECTIONS.POSTS)
        .doc(commentData.postId)
        .update({
          commentCount: firestore.FieldValue.increment(1),
        });

      // Get user data
      const userDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .get();

      const user = { id: userId, ...userDoc.data() } as User;

      return {
        id: docRef.id,
        ...newComment,
        user,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      } as Comment;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  // Upload image to Firebase Storage (mock for development)
  async uploadImage(uri: string, userId: string): Promise<string> {
    if (!this.isFirebaseAvailable()) {
      // Mock implementation - just return the local URI
      await new Promise<void>(resolve => setTimeout(resolve, 2000)); // Simulate upload delay
      return uri;
    }

    try {
      const timestamp = Date.now();
      const imageName = `posts/${userId}/${timestamp}.jpg`;
      
      const reference = storage().ref(imageName);
      await reference.putFile(uri);
      
      const downloadURL = await reference.getDownloadURL();
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      // Return the local URI as fallback
      return uri;
    }
  }

  // Helper method to calculate distance between two points
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const postsService = new PostsService();