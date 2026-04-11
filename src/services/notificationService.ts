import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './firebaseConfig';
import { AppNotification, NotificationType } from '../types';

interface CreateNotificationData {
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderUsername?: string;
  type: NotificationType;
  referenceId: string;
}

class NotificationService {
  async createNotification(data: CreateNotificationData): Promise<void> {
    try {
      const now = firestore.Timestamp.now();
      await firestore()
        .collection(COLLECTIONS.NOTIFICATIONS)
        .add({
          ...data,
          isRead: false,
          createdAt: now,
        });
    } catch (error) {
      // Notification creation should not block the main action
      console.error('Error creating notification:', error);
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await firestore()
        .collection(COLLECTIONS.NOTIFICATIONS)
        .doc(notificationId)
        .update({ isRead: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllRead(userId: string): Promise<void> {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.NOTIFICATIONS)
        .where('recipientId', '==', userId)
        .where('isRead', '==', false)
        .get();

      const batch = firestore().batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  subscribeToNotifications(
    userId: string,
    callback: (notifications: AppNotification[]) => void
  ): () => void {
    try {
      const unsubscribe = firestore()
        .collection(COLLECTIONS.NOTIFICATIONS)
        .where('recipientId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .onSnapshot(
          snapshot => {
            const notifications: AppNotification[] = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                recipientId: data.recipientId,
                senderId: data.senderId,
                senderName: data.senderName,
                senderAvatar: data.senderAvatar,
                senderUsername: data.senderUsername,
                type: data.type as NotificationType,
                referenceId: data.referenceId,
                isRead: data.isRead,
                createdAt: data.createdAt?.toDate() ?? new Date(),
              };
            });
            callback(notifications);
          },
          error => {
            console.error('Error listening to notifications:', error);
            callback([]);
          }
        );
      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      return () => {};
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await firestore()
        .collection(COLLECTIONS.NOTIFICATIONS)
        .doc(notificationId)
        .delete();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }
}

export const notificationService = new NotificationService();
