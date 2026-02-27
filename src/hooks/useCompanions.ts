import { useState, useEffect, useCallback } from 'react';
import { User, CompanionRequest } from '../types';
import { companionsService } from '../services';
import { useToast } from './useToast';

export interface UseCompanionsReturn {
  companions: User[];
  pendingRequests: CompanionRequest[];
  loading: boolean;
  error: string | null;
  sendRequest: (receiverId: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  removeCompanion: (companionId: string) => Promise<void>;
  refreshCompanions: () => Promise<void>;
}

export const useCompanions = (
  userId: string,
  initialLoad: boolean = true
): UseCompanionsReturn => {
  const [companions, setCompanions] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CompanionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Real-time listener for companion requests
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = companionsService.subscribeToCompanionRequests(
      userId,
      requests => {
        setPendingRequests(requests);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const refreshCompanions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fetchedCompanions = await companionsService.getCompanions(userId);
      setCompanions(fetchedCompanions);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load companions';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, showToast]);

  const sendRequest = useCallback(
    async (receiverId: string) => {
      try {
        await companionsService.sendCompanionRequest(userId, receiverId);
        showToast('Companion request sent!', 'success');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send request';
        showToast(errorMessage, 'error');
        throw err;
      }
    },
    [userId, showToast]
  );

  const acceptRequest = useCallback(
    async (requestId: string) => {
      try {
        await companionsService.acceptRequest(requestId);

        // Remove from pending requests
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));

        // Refresh companions list
        await refreshCompanions();

        showToast('Companion request accepted!', 'success');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to accept request';
        showToast(errorMessage, 'error');
        throw err;
      }
    },
    [refreshCompanions, showToast]
  );

  const rejectRequest = useCallback(
    async (requestId: string) => {
      try {
        await companionsService.rejectRequest(requestId);

        // Remove from pending requests
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));

        showToast('Companion request rejected', 'info');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to reject request';
        showToast(errorMessage, 'error');
        throw err;
      }
    },
    [showToast]
  );

  const removeCompanion = useCallback(
    async (companionId: string) => {
      try {
        await companionsService.removeCompanion(userId, companionId);

        // Remove from companions list
        setCompanions(prev => prev.filter(c => c.id !== companionId));

        showToast('Companion removed', 'info');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to remove companion';
        showToast(errorMessage, 'error');
        throw err;
      }
    },
    [userId, showToast]
  );

  // Load companions on mount if initialLoad is true
  useEffect(() => {
    if (initialLoad) {
      refreshCompanions();
    }
  }, [initialLoad, refreshCompanions]);

  return {
    companions,
    pendingRequests,
    loading,
    error,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeCompanion,
    refreshCompanions,
  };
};
