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
import {
  Conversation,
  Message,
  CreateMessageData,
  CreateConversationData,
  User
} from '../types';

// Mock data for development
const mockUser: User = {
  id: 'mock-user-id',
  name: 'Demo User',
  username: 'demo_user',
  email: 'demo@historia.app',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face&auto=format',
  followerCount: 100,
  followingCount: 80,
  postCount: 25,
  isVerified: false,
  companions: [],
  visitedLandmarks: [],
  bookmarkedLandmarks: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockConversations: Conversation[] = [
  {
    id: 'mock-conv-1',
    participants: ['mock-user-id', 'mock-user-1'],
    participantDetails: [
      mockUser,
      {
        ...mockUser,
        id: 'mock-user-1',
        name: 'Alice Smith',
        username: 'alice_s',
        avatar: 'https://i.pravatar.cc/150?img=5',
      },
    ],
    lastMessage: 'Hey! How are you?',
    lastMessageSenderId: 'mock-user-1',
    lastMessageTimestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
    unreadCount: { 'mock-user-id': 2, 'mock-user-1': 0 },
    type: 'direct',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 15),
  },
];

const mockMessages: Message[] = [
  {
    id: 'mock-msg-1',
    conversationId: 'mock-conv-1',
    senderId: 'mock-user-id',
    sender: mockUser,
    text: 'Hello! 👋',
    images: [],
    likes: [],
    isEmojiOnly: true,
    readBy: ['mock-user-id', 'mock-user-1'],
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: 'mock-msg-2',
    conversationId: 'mock-conv-1',
    senderId: 'mock-user-1',
    sender: {
      ...mockUser,
      id: 'mock-user-1',
      name: 'Alice Smith',
      username: 'alice_s',
      avatar: 'https://i.pravatar.cc/150?img=5',
    },
    text: 'Hey! How are you?',
    images: [],
    likes: ['mock-user-id'],
    isEmojiOnly: false,
    readBy: ['mock-user-1'],
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 15),
  },
];

class MessagingService {
  // Check if Firebase is available
  private isFirebaseAvailable(): boolean {
    try {
      if (!firestore || !storage) return false;
      firestore();
      return true;
    } catch {
      return false;
    }
  }

  // Emoji-only detection
  private isEmojiOnly(text: string): boolean {
    const emojiRegex = /^[\p{Emoji}\s]+$/u;
    return text.trim().length > 0 && emojiRegex.test(text.trim());
  }

  // =============== CONVERSATION MANAGEMENT ===============

  // Get conversations with pagination
  async getConversations(
    userId: string,
    limit: number = 20,
    lastConversationId?: string
  ): Promise<Conversation[]> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      return mockConversations.slice(0, limit);
    }

    try {
      let query = firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .where('participants', 'array-contains', userId)
        .orderBy('lastMessageTimestamp', 'desc')
        .limit(limit);

      if (lastConversationId) {
        const lastDoc = await firestore()
          .collection(COLLECTIONS.CONVERSATIONS)
          .doc(lastConversationId)
          .get();

        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.get();

      const conversations = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastMessageTimestamp: data.lastMessageTimestamp?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Conversation;
      });

      return conversations;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return mockConversations.slice(0, limit);
    }
  }

  // Get more conversations (for infinite scroll)
  async getMoreConversations(
    userId: string,
    limit: number,
    lastConversationId: string
  ): Promise<Conversation[]> {
    return this.getConversations(userId, limit, lastConversationId);
  }

  // Get or create a conversation between two users
  async getOrCreateConversation(
    currentUserId: string,
    otherUserId: string
  ): Promise<Conversation> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      return mockConversations[0];
    }

    try {
      // Check if conversation already exists
      const existingSnapshot = await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .where('participants', 'array-contains', currentUserId)
        .get();

      // Find conversation with both users
      const existing = existingSnapshot.docs.find((doc: any) => {
        const participants = doc.data().participants;
        return participants.includes(currentUserId) && participants.includes(otherUserId);
      });

      if (existing) {
        const data = existing.data();
        return {
          id: existing.id,
          ...data,
          lastMessageTimestamp: data.lastMessageTimestamp?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Conversation;
      }

      // Create new conversation
      return this.createConversation(
        { participantIds: [currentUserId, otherUserId] },
        currentUserId
      );
    } catch (error) {
      console.error('Error getting or creating conversation:', error);
      throw error;
    }
  }

  // Create a new conversation
  async createConversation(
    data: CreateConversationData,
    currentUserId: string
  ): Promise<Conversation> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      return mockConversations[0];
    }

    try {
      const now = firestore.Timestamp.now();

      // Fetch participant details
      const participantDetails: User[] = [];
      for (const userId of data.participantIds) {
        const userDoc = await firestore()
          .collection(COLLECTIONS.USERS)
          .doc(userId)
          .get();

        if (userDoc.exists) {
          participantDetails.push(userDoc.data() as User);
        }
      }

      // Initialize unread counts to 0 for all participants
      const unreadCount: { [userId: string]: number } = {};
      data.participantIds.forEach(userId => {
        unreadCount[userId] = 0;
      });

      const newConversation = {
        participants: data.participantIds,
        participantDetails,
        lastMessage: data.initialMessage || '',
        lastMessageSenderId: currentUserId,
        lastMessageTimestamp: now,
        unreadCount,
        type: 'direct' as const,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .add(newConversation);

      // Send initial message if provided
      if (data.initialMessage) {
        await this.sendMessage(
          {
            conversationId: docRef.id,
            text: data.initialMessage,
          },
          currentUserId
        );
      }

      return {
        id: docRef.id,
        ...newConversation,
        lastMessageTimestamp: now.toDate(),
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      } as Conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  // Delete a conversation
  async deleteConversation(conversationId: string): Promise<void> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      return;
    }

    try {
      // Delete all messages in the conversation
      const messagesSnapshot = await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .collection(COLLECTIONS.MESSAGES)
        .get();

      const batch = firestore().batch();

      // Delete all messages
      messagesSnapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });

      // Delete the conversation document
      batch.delete(
        firestore().collection(COLLECTIONS.CONVERSATIONS).doc(conversationId)
      );

      await batch.commit();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  // =============== MESSAGE OPERATIONS ===============

  // Get messages with pagination (newest first)
  async getMessages(
    conversationId: string,
    limit: number = 50,
    lastMessageId?: string
  ): Promise<Message[]> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      return mockMessages.slice(0, limit);
    }

    try {
      let query = firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .collection(COLLECTIONS.MESSAGES)
        .orderBy('timestamp', 'desc')
        .limit(limit);

      if (lastMessageId) {
        const lastDoc = await firestore()
          .collection(COLLECTIONS.CONVERSATIONS)
          .doc(conversationId)
          .collection(COLLECTIONS.MESSAGES)
          .doc(lastMessageId)
          .get();

        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.get();

      // Enrich messages with sender data
      const messages = await Promise.all(
        snapshot.docs.map(async (doc: any) => {
          const data = doc.data();

          // Fetch sender details
          const senderDoc = await firestore()
            .collection(COLLECTIONS.USERS)
            .doc(data.senderId)
            .get();

          const sender = senderDoc.exists ? (senderDoc.data() as User) : mockUser;

          return {
            id: doc.id,
            conversationId,
            ...data,
            sender,
            timestamp: data.timestamp?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Message;
        })
      );

      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return mockMessages.slice(0, limit);
    }
  }

  // Get older messages (for loading more history)
  async getOlderMessages(
    conversationId: string,
    limit: number,
    beforeMessageId: string
  ): Promise<Message[]> {
    return this.getMessages(conversationId, limit, beforeMessageId);
  }

  // Send a message
  async sendMessage(
    data: CreateMessageData,
    senderId: string
  ): Promise<Message> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      return {
        ...mockMessages[0],
        id: `temp-${Date.now()}`,
        text: data.text,
        timestamp: new Date(),
      };
    }

    try {
      const now = firestore.Timestamp.now();

      const newMessage = {
        conversationId: data.conversationId,
        senderId,
        text: data.text,
        images: data.images || [],
        postReference: data.postReference || null,
        likes: [],
        isEmojiOnly: this.isEmojiOnly(data.text),
        readBy: [senderId], // Sender has read their own message
        timestamp: now,
        updatedAt: now,
      };

      // Create message
      const messageRef = await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(data.conversationId)
        .collection(COLLECTIONS.MESSAGES)
        .add(newMessage);

      // Update conversation's last message
      await this.updateConversationLastMessage(data.conversationId, {
        ...newMessage,
        id: messageRef.id,
        timestamp: now.toDate(),
      } as any);

      // Increment unread count for other participants
      const conversationDoc = await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(data.conversationId)
        .get();

      const participants = conversationDoc.data()?.participants || [];
      const otherParticipants = participants.filter((id: string) => id !== senderId);
      await this.incrementUnreadCount(data.conversationId, otherParticipants);

      // Fetch sender details
      const senderDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(senderId)
        .get();

      return {
        id: messageRef.id,
        ...newMessage,
        sender: senderDoc.exists ? (senderDoc.data() as User) : mockUser,
        timestamp: now.toDate(),
        updatedAt: now.toDate(),
      } as Message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Send message with images
  async sendMessageWithImages(
    data: CreateMessageData,
    senderId: string,
    imageUris: string[]
  ): Promise<Message> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      return this.sendMessage(data, senderId);
    }

    try {
      // Upload images
      const uploadPromises = imageUris.map((uri, index) =>
        this.uploadMessageImage(uri, senderId, data.conversationId)
      );

      const imageUrls = await Promise.all(uploadPromises);

      // Send message with image URLs
      return this.sendMessage({ ...data, images: imageUrls }, senderId);
    } catch (error) {
      console.error('Error sending message with images:', error);
      throw error;
    }
  }

  // Upload message image to Firebase Storage
  async uploadMessageImage(
    uri: string,
    userId: string,
    conversationId: string
  ): Promise<string> {
    if (!this.isFirebaseAvailable()) {
      return uri; // Return local URI as fallback
    }

    try {
      const timestamp = Date.now();
      const imageName = `messages/${userId}/${conversationId}/${timestamp}.jpg`;
      const reference = storage().ref(imageName);

      await reference.putFile(uri);
      const downloadURL = await reference.getDownloadURL();

      return downloadURL;
    } catch (error) {
      console.error('Error uploading message image:', error);
      return uri; // Return local URI as fallback
    }
  }

  // =============== MESSAGE INTERACTIONS ===============

  // Mark messages as read
  async markMessagesAsRead(
    conversationId: string,
    userId: string
  ): Promise<void> {
    if (!this.isFirebaseAvailable()) {
      return;
    }

    try {
      // Get all unread messages
      const messagesSnapshot = await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .collection(COLLECTIONS.MESSAGES)
        .where('readBy', 'not-in', [[userId]])
        .get();

      // Batch update readBy array
      const batch = firestore().batch();

      messagesSnapshot.docs.forEach((doc: any) => {
        batch.update(doc.ref, {
          readBy: firestore.FieldValue.arrayUnion(userId),
        });
      });

      // Reset unread count for this user
      batch.update(
        firestore().collection(COLLECTIONS.CONVERSATIONS).doc(conversationId),
        {
          [`unreadCount.${userId}`]: 0,
        }
      );

      await batch.commit();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Toggle message like
  async toggleMessageLike(
    conversationId: string,
    messageId: string,
    userId: string
  ): Promise<void> {
    if (!this.isFirebaseAvailable()) {
      return;
    }

    try {
      const messageRef = firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .collection(COLLECTIONS.MESSAGES)
        .doc(messageId);

      await firestore().runTransaction(async (transaction: any) => {
        const messageDoc = await transaction.get(messageRef);
        const likes = messageDoc.data()?.likes || [];
        const isLiked = likes.includes(userId);

        if (isLiked) {
          transaction.update(messageRef, {
            likes: firestore.FieldValue.arrayRemove(userId),
          });
        } else {
          transaction.update(messageRef, {
            likes: firestore.FieldValue.arrayUnion(userId),
          });
        }
      });
    } catch (error) {
      console.error('Error toggling message like:', error);
      throw error;
    }
  }

  // =============== REAL-TIME LISTENERS ===============

  // Subscribe to conversations (real-time)
  subscribeToConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void
  ): () => void {
    if (!this.isFirebaseAvailable()) {
      // Call callback with mock data
      callback(mockConversations);
      return () => {}; // Return empty unsubscribe
    }

    try {
      const unsubscribe = firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .where('participants', 'array-contains', userId)
        .orderBy('lastMessageTimestamp', 'desc')
        .limit(20) // Limit to 20 most recent conversations
        .onSnapshot(
          (snapshot: any) => {
            const conversations = snapshot.docs.map((doc: any) => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                lastMessageTimestamp: data.lastMessageTimestamp?.toDate() || new Date(),
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
              } as Conversation;
            });

            callback(conversations);
          },
          (error: any) => {
            console.error('Error listening to conversations:', error);
            callback(mockConversations);
          }
        );

      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to conversations:', error);
      callback(mockConversations);
      return () => {};
    }
  }

  // Subscribe to messages (real-time)
  subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ): () => void {
    if (!this.isFirebaseAvailable()) {
      // Call callback with mock data
      callback(mockMessages);
      return () => {}; // Return empty unsubscribe
    }

    try {
      const unsubscribe = firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .collection(COLLECTIONS.MESSAGES)
        .orderBy('timestamp', 'asc') // Oldest first for chat display
        .limit(50) // Listen to latest 50 messages
        .onSnapshot(
          async (snapshot: any) => {
            // Enrich messages with sender data
            const messages = await Promise.all(
              snapshot.docs.map(async (doc: any) => {
                const data = doc.data();

                // Fetch sender details
                const senderDoc = await firestore()
                  .collection(COLLECTIONS.USERS)
                  .doc(data.senderId)
                  .get();

                const sender = senderDoc.exists ? (senderDoc.data() as User) : mockUser;

                return {
                  id: doc.id,
                  conversationId,
                  ...data,
                  sender,
                  timestamp: data.timestamp?.toDate() || new Date(),
                  updatedAt: data.updatedAt?.toDate() || new Date(),
                } as Message;
              })
            );

            callback(messages);
          },
          (error: any) => {
            console.error('Error listening to messages:', error);
            callback(mockMessages);
          }
        );

      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to messages:', error);
      callback(mockMessages);
      return () => {};
    }
  }

  // =============== HELPER METHODS ===============

  // Update conversation's last message
  private async updateConversationLastMessage(
    conversationId: string,
    message: { text: string; senderId: string; timestamp: Date }
  ): Promise<void> {
    if (!this.isFirebaseAvailable()) {
      return;
    }

    try {
      await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .update({
          lastMessage: message.text,
          lastMessageSenderId: message.senderId,
          lastMessageTimestamp: firestore.Timestamp.fromDate(message.timestamp),
          updatedAt: firestore.Timestamp.now(),
        });
    } catch (error) {
      console.error('Error updating last message:', error);
    }
  }

  // Increment unread count for recipients
  private async incrementUnreadCount(
    conversationId: string,
    recipientIds: string[]
  ): Promise<void> {
    if (!this.isFirebaseAvailable()) {
      return;
    }

    try {
      const updates: any = {};
      recipientIds.forEach(userId => {
        updates[`unreadCount.${userId}`] = firestore.FieldValue.increment(1);
      });

      await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .update(updates);
    } catch (error) {
      console.error('Error incrementing unread count:', error);
    }
  }
}

export const messagingService = new MessagingService();
