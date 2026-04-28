import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { COLLECTIONS } from './firebaseConfig';
import { Post, Comment, CreatePostData, CreateCommentData, User } from '../types';
import { pointsService } from './pointsService';
import { getEarning } from './pointsConfigCache';

class PostsService {
  // Get posts with pagination (for infinite scrolling)
  async getPosts(limit: number = 20, lastPostId?: string): Promise<Post[]> {
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
        })
      );

      return posts;
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  }

  // Get posts by a specific user
  async getPostsByUser(userId: string, limit: number = 30): Promise<Post[]> {
    try {
      const [snapshot, userDoc] = await Promise.all([
        firestore()
          .collection(COLLECTIONS.POSTS)
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .get(),
        firestore().collection(COLLECTIONS.USERS).doc(userId).get(),
      ]);

      const user = { id: userId, ...userDoc.data() } as User;

      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          user,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as Post;
      });
    } catch (error) {
      console.error('Error fetching user posts:', error);
      throw error;
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
      const snapshot = await firestore()
        .collection(COLLECTIONS.POSTS)
        .where('location', '!=', null)
        .orderBy('location')
        .orderBy('createdAt', 'desc')
        .limit(limit * 2)
        .get();

      const posts = await Promise.all(
        snapshot.docs.map(async (doc: any) => {
          const data = doc.data();

          if (data.location) {
            const distance = this.calculateDistance(
              latitude,
              longitude,
              data.location.latitude,
              data.location.longitude
            );

            if (distance <= radiusKm) {
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

      return posts.filter(post => post !== null).slice(0, limit) as Post[];
    } catch (error) {
      console.error('Error fetching posts near location:', error);
      throw error;
    }
  }

  // Create a new post
  async createPost(postData: CreatePostData, userId: string, currentUser?: User): Promise<Post> {
    if (postData.images && postData.images.length > 10) {
      throw new Error('Maximum 10 photos allowed per post');
    }
    if (postData.videos && postData.videos.length > 3) {
      throw new Error('Maximum 3 videos allowed per post');
    }

    try {
      const now = firestore.Timestamp.now();

      const resolvedLandmarkId = postData.landmarkTag?.id || postData.landmarkId || null;
      const newPost = {
        userId,
        content: postData.content,
        images: postData.images || [],
        videos: postData.videos || [],
        landmarkId: resolvedLandmarkId,
        landmarkTag: postData.landmarkTag || null,
        commentCount: 0,
        location: postData.location || null,
        _geoloc: postData.location
          ? { lat: postData.location.latitude, lng: postData.location.longitude }
          : null,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await firestore()
        .collection(COLLECTIONS.POSTS)
        .add(newPost);

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

      const returnPost = {
        id: docRef.id,
        ...newPost,
        user,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      } as Post;

      // Award points for post creation (non-blocking, respects daily limit).
      // Earning rules come from the dynamic points config; skip if unavailable.
      const earning = getEarning();
      if (earning) {
        pointsService.canEarnPostPoints(userId, earning.dailyPostCap).then(canEarn => {
          if (canEarn) {
            const imageCount = postData.images?.length ?? 0;
            const videoCount = postData.videos?.length ?? 0;
            const pts =
              earning.postBasePoints +
              (imageCount + videoCount) * earning.postPerMediaPoints;
            return pointsService.awardPoints(userId, pts, 'post_creation');
          }
        }).catch(console.error);
      } else {
        console.warn('[postsService] earning rules unavailable; post created without point award');
      }

      return returnPost;
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
    try {
      if (companionIds.length === 0) return [];

      let query = firestore()
        .collection(COLLECTIONS.POSTS)
        .where('userId', 'in', companionIds.slice(0, 10))
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

      await firestore()
        .collection(COLLECTIONS.POSTS)
        .doc(commentData.postId)
        .update({
          commentCount: firestore.FieldValue.increment(1),
        });

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

  // Upload image to Firebase Storage
  async uploadImage(uri: string, userId: string): Promise<string> {
    try {
      const timestamp = Date.now();
      const rand = Math.random().toString(36).slice(2, 7);
      const imageName = `posts/${userId}/${timestamp}_${rand}.jpg`;

      const reference = storage().ref(imageName);
      await reference.putFile(uri);

      const downloadURL = await reference.getDownloadURL();
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  // Upload video to Firebase Storage
  async uploadVideo(uri: string, userId: string): Promise<string> {
    try {
      const timestamp = Date.now();
      const rand = Math.random().toString(36).slice(2, 7);
      const videoName = `posts/${userId}/videos/${timestamp}_${rand}.mp4`;

      const reference = storage().ref(videoName);
      await reference.putFile(uri);

      const downloadURL = await reference.getDownloadURL();
      return downloadURL;
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
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
