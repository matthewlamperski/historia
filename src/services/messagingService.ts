import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { COLLECTIONS } from './firebaseConfig';
import {
  Conversation,
  Message,
  CreateMessageData,
  CreateConversationData,
  User
} from '../types';

class MessagingService {
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

        if (lastDoc.data()) {
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

      return this.hydrateConversations(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
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
    try {
      const existingSnapshot = await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .where('participants', 'array-contains', currentUserId)
        .get();

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
    try {
      const now = firestore.Timestamp.now();

      const participantDetails: User[] = [];
      for (const userId of data.participantIds) {
        const userDoc = await firestore()
          .collection(COLLECTIONS.USERS)
          .doc(userId)
          .get();

        if (userDoc.data()) {
          participantDetails.push({ id: userId, ...userDoc.data() } as User);
        }
      }

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
    try {
      const messagesSnapshot = await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .collection(COLLECTIONS.MESSAGES)
        .get();

      const batch = firestore().batch();

      messagesSnapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });

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

        if (lastDoc.data()) {
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.get();

      const messages = await Promise.all(
        snapshot.docs.map(async (doc: any) => {
          const data = doc.data();

          const senderDoc = await firestore()
            .collection(COLLECTIONS.USERS)
            .doc(data.senderId)
            .get();

          const sender = { id: data.senderId, ...senderDoc.data() } as User;

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
      throw error;
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
    try {
      const now = firestore.Timestamp.now();

      const newMessage = {
        conversationId: data.conversationId,
        senderId,
        text: data.text,
        images: data.images || [],
        videos: data.videos || [],
        postReference: data.postReference || null,
        likes: [],
        isEmojiOnly: this.isEmojiOnly(data.text),
        readBy: [senderId],
        timestamp: now,
        updatedAt: now,
      };

      const messageRef = await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(data.conversationId)
        .collection(COLLECTIONS.MESSAGES)
        .add(newMessage);

      // Build preview text for conversation list
      const images = newMessage.images || [];
      const videos = newMessage.videos || [];
      const hasText = !!newMessage.text?.trim();
      const hasImages = images.length > 0;
      const hasVideos = videos.length > 0;
      const previewText = hasText
        ? newMessage.text.trim()
        : hasVideos
          ? (videos.length === 1 ? 'Video' : `${videos.length} Videos`)
          : (hasImages ? (images.length === 1 ? 'Photo' : `${images.length} Photos`) : '');
      const previewType: 'text' | 'image' = (hasImages || hasVideos) && !hasText ? 'image' : 'text';

      await this.updateConversationLastMessage(data.conversationId, {
        text: previewText,
        type: previewType,
        senderId,
        timestamp: now.toDate(),
      });

      const conversationDoc = await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(data.conversationId)
        .get();

      const participants = conversationDoc.data()?.participants || [];
      const otherParticipants = participants.filter((id: string) => id !== senderId);
      await this.incrementUnreadCount(data.conversationId, otherParticipants);

      const senderDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(senderId)
        .get();

      return {
        id: messageRef.id,
        ...newMessage,
        sender: { id: senderId, ...senderDoc.data() } as User,
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
    try {
      // Upload images sequentially to avoid Firebase Storage overload
      const imageUrls: string[] = [];
      for (const uri of imageUris) {
        try {
          const url = await this.uploadMessageImage(uri, senderId, data.conversationId);
          imageUrls.push(url);
        } catch (uploadError) {
          console.error('Error uploading image, skipping:', uploadError);
        }
      }

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
    try {
      const timestamp = Date.now();
      const imageName = `messages/${userId}/${conversationId}/${timestamp}.jpg`;
      const reference = storage().ref(imageName);

      await reference.putFile(uri);
      const downloadURL = await reference.getDownloadURL();

      return downloadURL;
    } catch (error) {
      console.error('Error uploading message image:', error);
      throw error;
    }
  }

  // Upload message video to Firebase Storage
  async uploadMessageVideo(
    uri: string,
    userId: string,
    conversationId: string
  ): Promise<string> {
    try {
      const timestamp = Date.now();
      const videoName = `messages/${userId}/${conversationId}/${timestamp}.mp4`;
      const reference = storage().ref(videoName);

      await reference.putFile(uri);
      const downloadURL = await reference.getDownloadURL();

      return downloadURL;
    } catch (error) {
      console.error('Error uploading message video:', error);
      throw error;
    }
  }

  // Send message with both images and videos
  async sendMessageWithMedia(
    data: CreateMessageData,
    senderId: string,
    imageUris: string[],
    videoUris: string[]
  ): Promise<Message> {
    try {
      const imageUrls: string[] = [];
      for (const uri of imageUris) {
        try {
          const url = await this.uploadMessageImage(uri, senderId, data.conversationId);
          imageUrls.push(url);
        } catch (uploadError) {
          console.error('Error uploading image, skipping:', uploadError);
        }
      }

      const videoUrls: string[] = [];
      for (const uri of videoUris) {
        try {
          const url = await this.uploadMessageVideo(uri, senderId, data.conversationId);
          videoUrls.push(url);
        } catch (uploadError) {
          console.error('Error uploading video, skipping:', uploadError);
        }
      }

      return this.sendMessage({ ...data, images: imageUrls, videos: videoUrls }, senderId);
    } catch (error) {
      console.error('Error sending message with media:', error);
      throw error;
    }
  }

  // =============== MESSAGE INTERACTIONS ===============

  // Mark messages as read
  async markMessagesAsRead(
    conversationId: string,
    userId: string
  ): Promise<void> {
    try {
      const messagesSnapshot = await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .collection(COLLECTIONS.MESSAGES)
        .where('readBy', 'not-in', [[userId]])
        .get();

      const batch = firestore().batch();

      messagesSnapshot.docs.forEach((doc: any) => {
        batch.update(doc.ref, {
          readBy: firestore.FieldValue.arrayUnion(userId),
        });
      });

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
    try {
      const unsubscribe = firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .where('participants', 'array-contains', userId)
        .orderBy('lastMessageTimestamp', 'desc')
        .limit(20)
        .onSnapshot(
          async (snapshot: any) => {
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

            const hydrated = await this.hydrateConversations(conversations);
            callback(hydrated);
          },
          (error: any) => {
            console.error('Error listening to conversations:', error);
          }
        );

      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to conversations:', error);
      return () => {};
    }
  }

  // Subscribe to messages (real-time)
  subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ): () => void {
    try {
      const unsubscribe = firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .collection(COLLECTIONS.MESSAGES)
        .orderBy('timestamp', 'asc')
        .limit(50)
        .onSnapshot(
          async (snapshot: any) => {
            const messages = await Promise.all(
              snapshot.docs.map(async (doc: any) => {
                const data = doc.data();

                const senderDoc = await firestore()
                  .collection(COLLECTIONS.USERS)
                  .doc(data.senderId)
                  .get();

                const sender = { id: data.senderId, ...senderDoc.data() } as User;

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
          }
        );

      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to messages:', error);
      return () => {};
    }
  }

  // =============== GROUP CONVERSATION METHODS ===============

  // Create a group conversation
  async createGroupConversation(
    name: string,
    createdByUserId: string,
    participantIds: string[]
  ): Promise<Conversation> {
    try {
      const now = firestore.Timestamp.now();
      const allParticipantIds = Array.from(new Set([createdByUserId, ...participantIds]));

      const participantDetails: User[] = [];
      for (const userId of allParticipantIds) {
        const userDoc = await firestore()
          .collection(COLLECTIONS.USERS)
          .doc(userId)
          .get();
        if (userDoc.data()) {
          participantDetails.push({ id: userId, ...userDoc.data() } as User);
        }
      }

      const unreadCount: { [userId: string]: number } = {};
      allParticipantIds.forEach(userId => {
        unreadCount[userId] = 0;
      });

      const newConversation = {
        participants: allParticipantIds,
        participantDetails,
        lastMessage: '',
        lastMessageSenderId: createdByUserId,
        lastMessageTimestamp: now,
        unreadCount,
        type: 'group' as const,
        name,
        createdBy: createdByUserId,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .add(newConversation);

      return {
        id: docRef.id,
        ...newConversation,
        lastMessageTimestamp: now.toDate(),
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      } as Conversation;
    } catch (error) {
      console.error('Error creating group conversation:', error);
      throw error;
    }
  }

  // Update group info (name)
  async updateGroupInfo(
    conversationId: string,
    updates: { name?: string }
  ): Promise<void> {
    try {
      await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .set({ ...updates, updatedAt: firestore.Timestamp.now() }, { merge: true });
    } catch (error) {
      console.error('Error updating group info:', error);
      throw error;
    }
  }

  // Leave a group conversation
  async leaveGroup(conversationId: string, userId: string): Promise<void> {
    try {
      const convDoc = await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .get();

      if (!convDoc.data()) return;

      const data = convDoc.data();
      const remaining: string[] = (data?.participants || []).filter(
        (id: string) => id !== userId
      );
      const remainingDetails = (data?.participantDetails || []).filter(
        (u: User) => u.id !== userId
      );

      if (remaining.length === 0) {
        await this.deleteConversation(conversationId);
        return;
      }

      await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .set(
          {
            participants: remaining,
            participantDetails: remainingDetails,
            updatedAt: firestore.Timestamp.now(),
          },
          { merge: true }
        );
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  }

  // Get a single conversation by ID
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const doc = await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .get();

      if (!doc.data()) return null;

      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        lastMessageTimestamp: data!.lastMessageTimestamp?.toDate() || new Date(),
        createdAt: data!.createdAt?.toDate() || new Date(),
        updatedAt: data!.updatedAt?.toDate() || new Date(),
      } as Conversation;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }

  // =============== HELPER METHODS ===============

  private async updateConversationLastMessage(
    conversationId: string,
    message: { text: string; type: 'text' | 'image'; senderId: string; timestamp: Date }
  ): Promise<void> {
    try {
      await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .update({
          lastMessage: message.text,
          lastMessageType: message.type,
          lastMessageSenderId: message.senderId,
          lastMessageTimestamp: firestore.Timestamp.fromDate(message.timestamp),
          updatedAt: firestore.Timestamp.now(),
        });
    } catch (error) {
      console.error('Error updating last message:', error);
    }
  }

  // Fetch the last message preview from the messages subcollection
  private async fetchLastMessagePreview(
    conversationId: string
  ): Promise<{ text: string; type: 'text' | 'image'; senderId: string } | null> {
    try {
      const snap = await firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .collection(COLLECTIONS.MESSAGES)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();
      if (snap.empty) return null;
      const d = snap.docs[0].data();
      const imgs: string[] = d.images || [];
      const vids: string[] = d.videos || [];
      const hasText = !!d.text?.trim();
      const hasImages = imgs.length > 0;
      const hasVideos = vids.length > 0;
      const text = hasText
        ? d.text.trim()
        : hasVideos
          ? (vids.length === 1 ? 'Video' : `${vids.length} Videos`)
          : (hasImages ? (imgs.length === 1 ? 'Photo' : `${imgs.length} Photos`) : '');
      return { text, type: (hasImages || hasVideos) && !hasText ? 'image' : 'text', senderId: d.senderId };
    } catch {
      return null;
    }
  }

  // Fill in missing lastMessage fields by fetching from messages subcollection
  private async hydrateConversations(conversations: Conversation[]): Promise<Conversation[]> {
    const empty = conversations.filter(c => !c.lastMessage);
    if (empty.length === 0) return conversations;

    const previews = await Promise.all(
      empty.map(async c => ({ id: c.id, preview: await this.fetchLastMessagePreview(c.id) }))
    );

    const previewMap = new Map(previews.map(p => [p.id, p.preview]));

    return conversations.map(c => {
      const preview = previewMap.get(c.id);
      if (!preview) return c;
      // Self-heal Firestore so the subscription picks it up next time
      firestore()
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(c.id)
        .update({
          lastMessage: preview.text,
          lastMessageType: preview.type,
          lastMessageSenderId: preview.senderId,
        })
        .catch(() => {});
      return { ...c, lastMessage: preview.text, lastMessageType: preview.type, lastMessageSenderId: preview.senderId };
    });
  }

  private async incrementUnreadCount(
    conversationId: string,
    recipientIds: string[]
  ): Promise<void> {
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
