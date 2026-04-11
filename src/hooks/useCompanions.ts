import { useState, useEffect, useCallback } from 'react';
import { User, CompanionRequest } from '../types';
import { companionsService, RelationshipStatus } from '../services/companionsService';
import { useToast } from './useToast';

export interface UseCompanionsReturn {
  companions: User[];
  pendingRequests: CompanionRequest[];
  loading: boolean;
  error: string | null;
  sendRequest: (receiverId: string) => Promise<void>;
  cancelRequest: (receiverId: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  removeCompanion: (companionId: string) => Promise<void>;
  getRelationshipStatus: (targetUserId: string) => Promise<RelationshipStatus>;
  getReceivedRequestId: (senderId: string) => Promise<string | null>;
  refreshCompanions: () => Promise<void>;
}

export const useCompanions = (
  userId: string,
  _initialLoad: boolean = true
): UseCompanionsReturn => {
  const [companions, setCompanions] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CompanionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Real-time listener for companions list
  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const unsubscribe = companionsService.subscribeToCompanions(
      userId,
      companions => {
        setCompanions(companions);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Real-time listener for incoming companion requests
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
    if (!userId) return;
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

  const cancelRequest = useCallback(
    async (receiverId: string) => {
      try {
        await companionsService.cancelRequest(userId, receiverId);
        showToast('Companion request cancelled', 'info');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to cancel request';
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
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
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
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
        showToast('Companion request declined', 'info');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to decline request';
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

  const getRelationshipStatus = useCallback(
    (targetUserId: string) =>
      companionsService.getRelationshipStatus(userId, targetUserId),
    [userId]
  );

  const getReceivedRequestId = useCallback(
    (senderId: string) =>
      companionsService.getReceivedRequestId(userId, senderId),
    [userId]
  );

  return {
    companions,
    pendingRequests,
    loading,
    error,
    sendRequest,
    cancelRequest,
    acceptRequest,
    rejectRequest,
    removeCompanion,
    getRelationshipStatus,
    getReceivedRequestId,
    refreshCompanions,
  };
};
