import { useState, useEffect, useCallback } from 'react';
import { Message, CreateMessageData } from '../types';
import { messagingService } from '../services';
import { useToast } from './useToast';

export interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  sendMessage: (data: CreateMessageData) => Promise<void>;
  sendMessageWithImages: (
    data: CreateMessageData,
    imageUris: string[]
  ) => Promise<void>;
  sendMessageWithMedia: (
    data: CreateMessageData,
    imageUris: string[],
    videoUris: string[]
  ) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  toggleLike: (messageId: string) => Promise<void>;
  markAsRead: () => Promise<void>;
}

export const useMessages = (
  conversationId: string,
  currentUserId: string
): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastMessageId, setLastMessageId] = useState<string | undefined>();
  const { showToast } = useToast();

  // Real-time listener for messages
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = messagingService.subscribeToMessages(
      conversationId,
      newMessages => {
        setMessages(newMessages);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [conversationId]);

  // Load older messages (when scrolling up)
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loading || !lastMessageId) return;

    try {
      setLoading(true);

      const olderMessages = await messagingService.getOlderMessages(
        conversationId,
        50, // Load 50 older messages
        lastMessageId
      );

      if (olderMessages.length < 50) {
        setHasMore(false);
      }

      // Prepend older messages (they come in desc order, so reverse)
      setMessages(prev => [...olderMessages.reverse(), ...prev]);

      if (olderMessages.length > 0) {
        setLastMessageId(olderMessages[0].id); // Oldest of newly loaded
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load older messages';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [conversationId, hasMore, loading, lastMessageId, showToast]);

  // Optimistic send message
  const sendMessage = useCallback(
    async (data: CreateMessageData) => {
      // Optimistically add message to UI
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        senderId: currentUserId,
        sender: {
          id: currentUserId,
          name: 'You',
          username: 'you',
          email: '',
          followerCount: 0,
          followingCount: 0,
          postCount: 0,
          isVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        text: data.text,
        images: data.images || [],
        postReference: data.postReference,
        likes: [],
        isEmojiOnly: /^[\p{Emoji}\s]+$/u.test(data.text.trim()),
        readBy: [currentUserId],
        timestamp: new Date(),
        updatedAt: new Date(),
      };

      setMessages(prev => [...prev, tempMessage]);

      try {
        await messagingService.sendMessage(data, currentUserId);
        // Real-time listener will update with actual message
      } catch (err) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send message';
        showToast(errorMessage, 'error');
        throw err;
      }
    },
    [conversationId, currentUserId, showToast]
  );

  // Send message with images
  const sendMessageWithImages = useCallback(
    async (data: CreateMessageData, imageUris: string[]) => {
      // Optimistically add message with placeholder images
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        senderId: currentUserId,
        sender: {
          id: currentUserId,
          name: 'You',
          username: 'you',
          email: '',
          followerCount: 0,
          followingCount: 0,
          postCount: 0,
          isVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        text: data.text,
        images: imageUris, // Show local URIs temporarily
        postReference: data.postReference,
        likes: [],
        isEmojiOnly: false,
        readBy: [currentUserId],
        timestamp: new Date(),
        updatedAt: new Date(),
      };

      setMessages(prev => [...prev, tempMessage]);

      try {
        await messagingService.sendMessageWithImages(
          data,
          currentUserId,
          imageUris
        );
        // Real-time listener will update with actual message
      } catch (err) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send message';
        showToast(errorMessage, 'error');
        throw err;
      }
    },
    [conversationId, currentUserId, showToast]
  );

  // Send message with images and/or videos
  const sendMessageWithMedia = useCallback(
    async (data: CreateMessageData, imageUris: string[], videoUris: string[]) => {
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        senderId: currentUserId,
        sender: {
          id: currentUserId,
          name: 'You',
          username: 'you',
          email: '',
          followerCount: 0,
          followingCount: 0,
          postCount: 0,
          isVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        text: data.text,
        images: imageUris,
        videos: videoUris,
        postReference: data.postReference,
        likes: [],
        isEmojiOnly: false,
        readBy: [currentUserId],
        timestamp: new Date(),
        updatedAt: new Date(),
      };

      setMessages(prev => [...prev, tempMessage]);

      try {
        await messagingService.sendMessageWithMedia(
          data,
          currentUserId,
          imageUris,
          videoUris
        );
      } catch (err) {
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send message';
        showToast(errorMessage, 'error');
        throw err;
      }
    },
    [conversationId, currentUserId, showToast]
  );

  // Toggle like on message
  const toggleLike = useCallback(
    async (messageId: string) => {
      // Optimistic update
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id === messageId) {
            const isLiked = msg.likes.includes(currentUserId);
            return {
              ...msg,
              likes: isLiked
                ? msg.likes.filter(id => id !== currentUserId)
                : [...msg.likes, currentUserId],
            };
          }
          return msg;
        })
      );

      try {
        await messagingService.toggleMessageLike(
          conversationId,
          messageId,
          currentUserId
        );
      } catch (err) {
        // Revert optimistic update on error
        setMessages(prev =>
          prev.map(msg => {
            if (msg.id === messageId) {
              const isLiked = msg.likes.includes(currentUserId);
              return {
                ...msg,
                likes: isLiked
                  ? msg.likes.filter(id => id !== currentUserId)
                  : [...msg.likes, currentUserId],
              };
            }
            return msg;
          })
        );
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to toggle like';
        showToast(errorMessage, 'error');
      }
    },
    [conversationId, currentUserId, showToast]
  );

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    try {
      await messagingService.markMessagesAsRead(conversationId, currentUserId);

      // Update local state
      setMessages(prev =>
        prev.map(msg => ({
          ...msg,
          readBy: msg.readBy.includes(currentUserId)
            ? msg.readBy
            : [...msg.readBy, currentUserId],
        }))
      );
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [conversationId, currentUserId]);

  return {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    sendMessageWithImages,
    sendMessageWithMedia,
    loadMoreMessages,
    toggleLike,
    markAsRead,
  };
};
