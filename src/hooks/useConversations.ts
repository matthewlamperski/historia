import { useState, useEffect, useCallback } from 'react';
import { Conversation } from '../types';
import { messagingService } from '../services';
import { useToast } from './useToast';

export interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  loadConversations: () => Promise<void>;
  loadMoreConversations: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  createOrOpenConversation: (otherUserId: string) => Promise<Conversation>;
  createGroup: (name: string, participantIds: string[]) => Promise<Conversation>;
  markAsRead: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
}

export const useConversations = (userId: string): UseConversationsReturn => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastConversationId, setLastConversationId] = useState<string | undefined>();
  const { showToast } = useToast();

  // Initial load with pagination (20 conversations)
  const loadConversations = useCallback(async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      const fetchedConversations = await messagingService.getConversations(
        userId,
        20 // Limit: 20 conversations per page
      );

      setConversations(fetchedConversations);
      setHasMore(fetchedConversations.length >= 20);

      if (fetchedConversations.length > 0) {
        setLastConversationId(
          fetchedConversations[fetchedConversations.length - 1].id
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, loading, showToast]);

  // Load more conversations (infinite scroll)
  const loadMoreConversations = useCallback(async () => {
    if (!hasMore || loading || !lastConversationId) return;

    try {
      setLoading(true);

      const moreConversations = await messagingService.getMoreConversations(
        userId,
        20,
        lastConversationId
      );

      if (moreConversations.length < 20) {
        setHasMore(false);
      }

      setConversations(prev => [...prev, ...moreConversations]);

      if (moreConversations.length > 0) {
        setLastConversationId(
          moreConversations[moreConversations.length - 1].id
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more conversations';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, hasMore, loading, lastConversationId, showToast]);

  // Pull to refresh
  const refreshConversations = useCallback(async () => {
    setRefreshing(true);
    setLastConversationId(undefined);
    setHasMore(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  // Create a group conversation
  const createGroup = useCallback(
    async (name: string, participantIds: string[]): Promise<Conversation> => {
      try {
        const conversation = await messagingService.createGroupConversation(
          name,
          userId,
          participantIds
        );

        setConversations(prev => {
          const exists = prev.some(c => c.id === conversation.id);
          if (exists) return prev;
          return [conversation, ...prev];
        });

        return conversation;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create group';
        showToast(errorMessage, 'error');
        throw err;
      }
    },
    [userId, showToast]
  );

  // Create or open conversation with a user
  const createOrOpenConversation = useCallback(
    async (otherUserId: string): Promise<Conversation> => {
      try {
        const conversation = await messagingService.getOrCreateConversation(
          userId,
          otherUserId
        );

        // Add to conversations list if not already there
        setConversations(prev => {
          const exists = prev.some(c => c.id === conversation.id);
          if (exists) {
            return prev.map(c => (c.id === conversation.id ? conversation : c));
          }
          return [conversation, ...prev];
        });

        return conversation;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to open conversation';
        showToast(errorMessage, 'error');
        throw err;
      }
    },
    [userId, showToast]
  );

  // Mark conversation as read
  const markAsRead = useCallback(
    async (conversationId: string): Promise<void> => {
      try {
        await messagingService.markMessagesAsRead(conversationId, userId);

        // Update local state
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationId
              ? { ...conv, unreadCount: { ...conv.unreadCount, [userId]: 0 } }
              : conv
          )
        );
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    },
    [userId]
  );

  // Delete conversation
  const deleteConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      // Optimistically remove from UI
      setConversations(prev => prev.filter(c => c.id !== conversationId));

      try {
        await messagingService.deleteConversation(conversationId);
        showToast('Conversation deleted', 'success');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete conversation';
        showToast(errorMessage, 'error');
        // Refresh to restore the conversation if delete failed
        refreshConversations();
      }
    },
    [showToast, refreshConversations]
  );

  // Real-time listener setup (limited to most recent conversations)
  useEffect(() => {
    const unsubscribe = messagingService.subscribeToConversations(
      userId,
      updatedConversations => {
        // Only update the first page with real-time data
        setConversations(prev => {
          const updatedIds = new Set(updatedConversations.map(c => c.id));
          const olderConversations = prev.filter(c => !updatedIds.has(c.id));
          return [...updatedConversations, ...olderConversations];
        });
      }
    );

    return () => unsubscribe(); // Cleanup on unmount
  }, [userId]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, []); // Only run once on mount

  return {
    conversations,
    loading,
    refreshing,
    error,
    hasMore,
    loadConversations,
    loadMoreConversations,
    refreshConversations,
    createOrOpenConversation,
    createGroup,
    markAsRead,
    deleteConversation,
  };
};
