import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './firebaseConfig';
import { CompanionRequest, User } from '../types';
import { notificationService } from './notificationService';

export type RelationshipStatus =
  | 'none'
  | 'companions'
  | 'request_sent'
  | 'request_received';

class CompanionsService {
  // Send a companion request
  async sendCompanionRequest(
    senderId: string,
    receiverId: string
  ): Promise<CompanionRequest> {
    try {
      // Check if request already exists in either direction
      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        firestore()
          .collection(COLLECTIONS.COMPANION_REQUESTS)
          .where('senderId', '==', senderId)
          .where('receiverId', '==', receiverId)
          .where('status', '==', 'pending')
          .get(),
        firestore()
          .collection(COLLECTIONS.COMPANION_REQUESTS)
          .where('senderId', '==', receiverId)
          .where('receiverId', '==', senderId)
          .where('status', '==', 'pending')
          .get(),
      ]);

      if (!sentSnapshot.empty) {
        throw new Error('Companion request already sent');
      }
      if (!receivedSnapshot.empty) {
        throw new Error('This user already sent you a request — check your notifications');
      }

      // Check if already companions
      const senderDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(senderId)
        .get();

      const companions: string[] = senderDoc.data()?.companions ?? [];
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

      // Fetch both user docs for the return value and notification
      const [receiverDoc] = await Promise.all([
        firestore().collection(COLLECTIONS.USERS).doc(receiverId).get(),
      ]);

      const senderData = senderDoc.data() as User;

      // Create an in-app notification for the receiver
      await notificationService.createNotification({
        recipientId: receiverId,
        senderId,
        senderName: senderData?.name ?? 'Someone',
        senderAvatar: senderData?.avatar,
        senderUsername: senderData?.username,
        type: 'companion_request',
        referenceId: docRef.id,
      });

      return {
        id: docRef.id,
        ...requestData,
        sender: senderData,
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
    try {
      const requestRef = firestore()
        .collection(COLLECTIONS.COMPANION_REQUESTS)
        .doc(requestId);

      const requestDoc = await requestRef.get();

      if (!requestDoc.exists()) {
        throw new Error('Companion request not found');
      }

      const requestData = requestDoc.data()!;

      if (requestData.status !== 'pending') {
        throw new Error('Request has already been processed');
      }

      const { senderId, receiverId } = requestData;

      // Run all writes in parallel
      await Promise.all([
        requestRef.update({
          status: 'accepted',
          updatedAt: firestore.Timestamp.now(),
        }),
        firestore()
          .collection(COLLECTIONS.USERS)
          .doc(senderId)
          .update({
            companions: firestore.FieldValue.arrayUnion(receiverId),
          }),
        firestore()
          .collection(COLLECTIONS.USERS)
          .doc(receiverId)
          .update({
            companions: firestore.FieldValue.arrayUnion(senderId),
          }),
      ]);

      // Notify the original sender that their request was accepted
      const receiverDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(receiverId)
        .get();
      const receiverData = receiverDoc.data() as User;

      await notificationService.createNotification({
        recipientId: senderId,
        senderId: receiverId,
        senderName: receiverData?.name ?? 'Someone',
        senderAvatar: receiverData?.avatar,
        senderUsername: receiverData?.username,
        type: 'companion_accepted',
        referenceId: requestId,
      });
    } catch (error) {
      console.error('Error accepting companion request:', error);
      throw error;
    }
  }

  // Reject a companion request
  async rejectRequest(requestId: string): Promise<void> {
    try {
      const requestRef = firestore()
        .collection(COLLECTIONS.COMPANION_REQUESTS)
        .doc(requestId);

      const requestDoc = await requestRef.get();

      if (!requestDoc.exists()) {
        throw new Error('Companion request not found');
      }

      if (requestDoc.data()!.status !== 'pending') {
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

  // Cancel a sent companion request
  async cancelRequest(senderId: string, receiverId: string): Promise<void> {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.COMPANION_REQUESTS)
        .where('senderId', '==', senderId)
        .where('receiverId', '==', receiverId)
        .where('status', '==', 'pending')
        .get();

      if (snapshot.empty) {
        throw new Error('No pending request found');
      }

      const batch = firestore().batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'cancelled',
          updatedAt: firestore.Timestamp.now(),
        });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error cancelling companion request:', error);
      throw error;
    }
  }

  // Get the relationship status between two users
  async getRelationshipStatus(
    currentUserId: string,
    targetUserId: string
  ): Promise<RelationshipStatus> {
    try {
      // Check companions array first (fast)
      const userDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(currentUserId)
        .get();

      const companions: string[] = userDoc.data()?.companions ?? [];
      if (companions.includes(targetUserId)) {
        return 'companions';
      }

      // Check for pending requests in both directions
      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        firestore()
          .collection(COLLECTIONS.COMPANION_REQUESTS)
          .where('senderId', '==', currentUserId)
          .where('receiverId', '==', targetUserId)
          .where('status', '==', 'pending')
          .get(),
        firestore()
          .collection(COLLECTIONS.COMPANION_REQUESTS)
          .where('senderId', '==', targetUserId)
          .where('receiverId', '==', currentUserId)
          .where('status', '==', 'pending')
          .get(),
      ]);

      if (!sentSnapshot.empty) return 'request_sent';
      if (!receivedSnapshot.empty) return 'request_received';
      return 'none';
    } catch (error) {
      console.error('Error getting relationship status:', error);
      return 'none';
    }
  }

  // Get the pending request ID sent from target to current user (for accepting)
  async getReceivedRequestId(
    currentUserId: string,
    senderId: string
  ): Promise<string | null> {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.COMPANION_REQUESTS)
        .where('senderId', '==', senderId)
        .where('receiverId', '==', currentUserId)
        .where('status', '==', 'pending')
        .limit(1)
        .get();
      return snapshot.empty ? null : snapshot.docs[0].id;
    } catch {
      return null;
    }
  }

  // Get user's companions (full User objects)
  async getCompanions(userId: string): Promise<User[]> {
    try {
      const userDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .get();

      const companionIds: string[] = userDoc.data()?.companions ?? [];
      if (companionIds.length === 0) return [];

      const companions = await Promise.all(
        companionIds.map(async (id: string) => {
          const companionDoc = await firestore()
            .collection(COLLECTIONS.USERS)
            .doc(id)
            .get();
          if (!companionDoc.exists()) return null;
          return { id: companionDoc.id, ...companionDoc.data() } as User;
        })
      );

      return companions.filter((c): c is User => c !== null);
    } catch (error) {
      console.error('Error fetching companions:', error);
      return [];
    }
  }

  // Get pending companion requests for a user (incoming)
  async getPendingRequests(userId: string): Promise<CompanionRequest[]> {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.COMPANION_REQUESTS)
        .where('receiverId', '==', userId)
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .get();

      const requests = await Promise.all(
        snapshot.docs.map(async doc => {
          const data = doc.data();
          const senderDoc = await firestore()
            .collection(COLLECTIONS.USERS)
            .doc(data.senderId)
            .get();

          return {
            id: doc.id,
            ...data,
            sender: senderDoc.exists()
              ? ({ id: senderDoc.id, ...senderDoc.data() } as User)
              : null,
            createdAt: data.createdAt?.toDate() ?? new Date(),
            updatedAt: data.updatedAt?.toDate() ?? new Date(),
          } as CompanionRequest;
        })
      );

      return requests;
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }
  }

  // Subscribe to companions list (real-time — watches user doc companions array)
  subscribeToCompanions(
    userId: string,
    callback: (companions: User[]) => void
  ): () => void {
    return firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .onSnapshot(
        async snapshot => {
          const companionIds: string[] = snapshot.data()?.companions ?? [];
          if (companionIds.length === 0) {
            callback([]);
            return;
          }
          const companions = await Promise.all(
            companionIds.map(async (id: string) => {
              const doc = await firestore()
                .collection(COLLECTIONS.USERS)
                .doc(id)
                .get();
              if (!doc.exists()) return null;
              return { id: doc.id, ...doc.data() } as User;
            })
          );
          callback(companions.filter((c): c is User => c !== null));
        },
        error => {
          console.error('Error listening to companions:', error);
        }
      );
  }

  // Subscribe to companion requests (real-time, incoming only)
  subscribeToCompanionRequests(
    userId: string,
    callback: (requests: CompanionRequest[]) => void
  ): () => void {
    try {
      const unsubscribe = firestore()
        .collection(COLLECTIONS.COMPANION_REQUESTS)
        .where('receiverId', '==', userId)
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .onSnapshot(
          async snapshot => {
            const requests = await Promise.all(
              snapshot.docs.map(async doc => {
                const data = doc.data();
                const senderDoc = await firestore()
                  .collection(COLLECTIONS.USERS)
                  .doc(data.senderId)
                  .get();

                return {
                  id: doc.id,
                  ...data,
                  sender: senderDoc.exists()
                    ? ({ id: senderDoc.id, ...senderDoc.data() } as User)
                    : null,
                  createdAt: data.createdAt?.toDate() ?? new Date(),
                  updatedAt: data.updatedAt?.toDate() ?? new Date(),
                } as CompanionRequest;
              })
            );
            callback(requests);
          },
          error => {
            console.error('Error listening to companion requests:', error);
            callback([]);
          }
        );
      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to companion requests:', error);
      return () => {};
    }
  }

  // Remove a companion (bidirectional)
  async removeCompanion(userId: string, companionId: string): Promise<void> {
    try {
      await Promise.all([
        firestore()
          .collection(COLLECTIONS.USERS)
          .doc(userId)
          .update({
            companions: firestore.FieldValue.arrayRemove(companionId),
          }),
        firestore()
          .collection(COLLECTIONS.USERS)
          .doc(companionId)
          .update({
            companions: firestore.FieldValue.arrayRemove(userId),
          }),
      ]);
    } catch (error) {
      console.error('Error removing companion:', error);
      throw error;
    }
  }
}

export const companionsService = new CompanionsService();
