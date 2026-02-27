import { useState, useEffect, useCallback } from 'react';
import { Visit } from '../types';
import { visitsService } from '../services';
import { useToast } from './useToast';

export interface UseVisitsReturn {
  visits: Visit[];
  loading: boolean;
  error: string | null;
  createVisit: (
    landmarkId: string,
    userLocation: { latitude: number; longitude: number },
    notes?: string,
    photos?: string[]
  ) => Promise<void>;
  getUserVisits: () => Promise<void>;
  hasVisited: (landmarkId: string) => Promise<boolean>;
  verifyLocation: (
    userLocation: { latitude: number; longitude: number },
    landmarkLocation: { latitude: number; longitude: number }
  ) => boolean;
}

export const useVisits = (
  userId: string,
  initialLoad: boolean = false
): UseVisitsReturn => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const getUserVisits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fetchedVisits = await visitsService.getUserVisits(userId);
      setVisits(fetchedVisits);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load visits';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, showToast]);

  const createVisit = useCallback(
    async (
      landmarkId: string,
      userLocation: { latitude: number; longitude: number },
      notes?: string,
      photos?: string[]
    ) => {
      try {
        const visit = await visitsService.createVisit(
          userId,
          landmarkId,
          userLocation,
          notes,
          photos
        );

        setVisits(prev => [visit, ...prev]);
        showToast('Check-in successful!', 'success');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to check in';
        showToast(errorMessage, 'error');
        throw err;
      }
    },
    [userId, showToast]
  );

  const hasVisited = useCallback(
    async (landmarkId: string): Promise<boolean> => {
      try {
        return await visitsService.hasVisited(userId, landmarkId);
      } catch (err) {
        console.error('Error checking visit status:', err);
        return false;
      }
    },
    [userId]
  );

  const verifyLocation = useCallback(
    (
      userLocation: { latitude: number; longitude: number },
      landmarkLocation: { latitude: number; longitude: number }
    ): boolean => {
      return visitsService.verifyVisit(userLocation, landmarkLocation);
    },
    []
  );

  // Load visits on mount if initialLoad is true
  useEffect(() => {
    if (initialLoad) {
      getUserVisits();
    }
  }, [initialLoad, getUserVisits]);

  return {
    visits,
    loading,
    error,
    createVisit,
    getUserVisits,
    hasVisited,
    verifyLocation,
  };
};
