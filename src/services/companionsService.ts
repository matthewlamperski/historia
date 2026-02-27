// Firebase imports with error handling
let firestore: any = null;

try {
  firestore = require('@react-native-firebase/firestore').default;
} catch {
  console.warn('Firebase modules not available, using mock data only');
}

import { COLLECTIONS } from './firebaseConfig';
import { CompanionRequest, User } from '../types';

// Mock users for companions
const mockUsers: User[] = [
  {
    id: 'mock-companion-1',
    name: 'Sarah Chen',
    username: 'sarahc_photo',
    email: 'sarah@historia.app',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9d4c3a0?w=150&h=150&fit=crop&crop=face',
    followerCount: 567,
    followingCount: 234,
    postCount: 78,
    isVerified: true,
    companions: [],
    visitedLandmarks: [],
    bookmarkedLandmarks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-companion-2',
    name: 'Marcus Johnson',
    username: 'marcus_j',
    email: 'marcus@historia.app',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    followerCount: 123,
    followingCount: 298,
    postCount: 15,
    isVerified: false,
    companions: [],
    visitedLandmarks: [],
    bookmarkedLandmarks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockRequests: CompanionRequest[] = [
  {
    id: 'request-1',
    senderId: 'mock-companion-1',
    sender: mockUsers[0],
    receiverId: 'mock-user-id',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
];

class CompanionsService {
  private isFirebaseAvailable(): boolean {
    try {
      if (!firestore) return false;
      firestore();
      return true;
    } catch {
      return false;
    }
  }

  // Send a companion request
  async sendCompanionRequest(
    senderId: string,
    receiverId: string
  ): Promise<CompanionRequest> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 500));

      const request: CompanionRequest = {
        id: `request-${Date.now()}`,
        senderId,
        receiverId,
        sender: mockUsers[0],
        receiver: mockUsers[1],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('Sent companion request:', request);
      return request;
    }

    try {
      // Check if request already exists
      const existingSnapshot = await firestore()
        .collection(COLLECTIONS.COMPANION_REQUESTS)
        .where('senderId', '==', senderId)
        .where('receiverId', '==', receiverId)
        .where('status', '==', 'pending')
        .get();

      if (!existingSnapshot.empty) {
        throw new Error('Companion request already exists');
      }

      // Check if already companions
      const senderDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(senderId)
        .get();

      const companions = senderDoc.data()?.companions || [];
      if (companions.includes(receiverId)) {
        throw new Error('Already companions');
      }

      const now = firestore.Timestamp.now();

      const requestData = {
        senderId,
        receiverId,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await firestore()
        .collection(COLLECTIONS.COMPANION_REQUESTS)
        .add(requestData);

      // Fetch sender and receiver data
      const receiverDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(receiverId)
        .get();

      return {
        id: docRef.id,
        ...requestData,
        sender: senderDoc.data() as User,
        receiver: receiverDoc.data() as User,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      } as CompanionRequest;
    } catch (error) {
      console.error('Error sending companion request:', error);
      throw error;
    }
  }

  // Accept a companion request
  async acceptRequest(requestId: string): Promise<void> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 500));
      console.log('Accepted companion request:', requestId);
      return;
    }

    try {
      const requestRef = firestore()
        .collection(COLLECTIONS.COMPANION_REQUESTS)
        .doc(requestId);

      const requestDoc = await requestRef.get();

      if (!requestDoc.exists) {
        throw new Error('Companion request not found');
      }

      const requestData = requestDoc.data();

      if (requestData.status !== 'pending') {
        throw new Error('Request has already been processed');
      }

      const { senderId, receiverId } = requestData;

      // Update request status
      await requestRef.update({
        status: 'accepted',
        updatedAt: firestore.Timestamp.now(),
      });

      // Add each user to the other's companions list
      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(senderId)
        .update({
          companions: firestore.FieldValue.arrayUnion(receiverId),
        });

      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(receiverId)
        .update({
          companions: firestore.FieldValue.arrayUnion(senderId),
        });
    } catch (error) {
      console.error('Error accepting companion request:', error);
      throw error;
    }
  }

  // Reject a companion request
  async rejectRequest(requestId: string): Promise<void> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 500));
      console.log('Rejected companion request:', requestId);
      return;
    }

    try {
      const requestRef = firestore()
        .collection(COLLECTIONS.COMPANION_REQUESTS)
        .doc(requestId);

      const requestDoc = await requestRef.get();

      if (!requestDoc.exists) {
        throw new Error('Companion request not found');
      }

      const requestData = requestDoc.data();

      if (requestData.status !== 'pending') {
        throw new Error('Request has already been processed');
      }

      await requestRef.update({
        status: 'rejected',
        updatedAt: firestore.Timestamp.now(),
      });
    } catch (error) {
      console.error('Error rejecting companion request:', error);
      throw error;
    }
  }

  // Get user's companions
  async getCompanions(userId: string): Promise<User[]> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      // Return mock companions
      return mockUsers;
    }

    try {
      const userDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .get();

      const companionIds = userDoc.data()?.companions || [];

      if (companionIds.length === 0) return [];

      const companions = await Promise.all(
        companionIds.map(async (id: string) => {
          const companionDoc = await firestore()
            .collection(COLLECTIONS.USERS)
            .doc(id)
            .get();

          return companionDoc.exists ? (companionDoc.data() as User) : null;
        })
      );

      return companions.filter(c => c !== null) as User[];
    } catch (error) {
      console.error('Error fetching companions:', error);
      return [];
    }
  }

  // Get pending companion requests for a user
  async getPendingRequests(userId: string): Promise<CompanionRequest[]> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      return mockRequests;
    }

    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.COMPANION_REQUESTS)
        .where('receiverId', '==', userId)
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .get();

      const requests = await Promise.all(
        snapshot.docs.map(async (doc: any) => {
          const data = doc.data();

          // Fetch sender data
          const senderDoc = await firestore()
            .collection(COLLECTIONS.USERS)
            .doc(data.senderId)
            .get();

          return {
            id: doc.id,
            ...data,
            sender: senderDoc.exists ? (senderDoc.data() as User) : null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as CompanionRequest;
        })
      );

      return requests;
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }
  }

  // Subscribe to companion requests (real-time)
  subscribeToCompanionRequests(
    userId: string,
    callback: (requests: CompanionRequest[]) => void
  ): () => void {
    if (!this.isFirebaseAvailable()) {
      callback(mockRequests);
      return () => {};
    }

    try {
      const unsubscribe = firestore()
        .collection(COLLECTIONS.COMPANION_REQUESTS)
        .where('receiverId', '==', userId)
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .onSnapshot(
          async (snapshot: any) => {
            const requests = await Promise.all(
              snapshot.docs.map(async (doc: any) => {
                const data = doc.data();

                // Fetch sender data
                const senderDoc = await firestore()
                  .collection(COLLECTIONS.USERS)
                  .doc(data.senderId)
                  .get();

                return {
                  id: doc.id,
                  ...data,
                  sender: senderDoc.exists ? (senderDoc.data() as User) : null,
                  createdAt: data.createdAt?.toDate() || new Date(),
                  updatedAt: data.updatedAt?.toDate() || new Date(),
                } as CompanionRequest;
              })
            );

            callback(requests);
          },
          (error: any) => {
            console.error('Error listening to companion requests:', error);
            callback(mockRequests);
          }
        );

      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to companion requests:', error);
      callback(mockRequests);
      return () => {};
    }
  }

  // Remove a companion
  async removeCompanion(userId: string, companionId: string): Promise<void> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 500));
      console.log('Removed companion:', companionId);
      return;
    }

    try {
      // Remove from both users' companions lists
      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .update({
          companions: firestore.FieldValue.arrayRemove(companionId),
        });

      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(companionId)
        .update({
          companions: firestore.FieldValue.arrayRemove(userId),
        });
    } catch (error) {
      console.error('Error removing companion:', error);
      throw error;
    }
  }
}

export const companionsService = new CompanionsService();
