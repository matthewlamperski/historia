import { useState, useEffect, useCallback } from 'react';
import { Landmark } from '../types';
import { landmarksService } from '../services';
import { useToast } from './useToast';

export interface UseLandmarksReturn {
  landmarks: Landmark[];
  loading: boolean;
  error: string | null;
  getLandmarks: () => Promise<void>;
  getNearbyLandmarks: (
    latitude: number,
    longitude: number,
    radiusMeters?: number
  ) => Promise<void>;
  bookmarkLandmark: (landmarkId: string) => Promise<void>;
  unbookmarkLandmark: (landmarkId: string) => Promise<void>;
  getBookmarkedLandmarks: () => Promise<void>;
}

export const useLandmarks = (
  userId: string,
  initialLoad: boolean = true
): UseLandmarksReturn => {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const getLandmarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fetchedLandmarks = await landmarksService.getLandmarks(50);
      setLandmarks(fetchedLandmarks);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load landmarks';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const getNearbyLandmarks = useCallback(
    async (
      latitude: number,
      longitude: number,
      radiusMeters: number = 5000
    ) => {
      try {
        setLoading(true);
        setError(null);

        const nearbyLandmarks = await landmarksService.getNearbyLandmarks(
          latitude,
          longitude,
          radiusMeters
        );
        setLandmarks(nearbyLandmarks);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load nearby landmarks';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const bookmarkLandmark = useCallback(
    async (landmarkId: string) => {
      try {
        await landmarksService.bookmarkLandmark(userId, landmarkId);
        showToast('Landmark bookmarked!', 'success');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to bookmark landmark';
        showToast(errorMessage, 'error');
        throw err;
      }
    },
    [userId, showToast]
  );

  const unbookmarkLandmark = useCallback(
    async (landmarkId: string) => {
      try {
        await landmarksService.unbookmarkLandmark(userId, landmarkId);
        showToast('Bookmark removed', 'success');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to remove bookmark';
        showToast(errorMessage, 'error');
        throw err;
      }
    },
    [userId, showToast]
  );

  const getBookmarkedLandmarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const bookmarked = await landmarksService.getBookmarkedLandmarks(userId);
      setLandmarks(bookmarked);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to load bookmarked landmarks';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, showToast]);

  // Load landmarks on mount if initialLoad is true
  useEffect(() => {
    if (initialLoad) {
      getLandmarks();
    }
  }, [initialLoad, getLandmarks]);

  return {
    landmarks,
    loading,
    error,
    getLandmarks,
    getNearbyLandmarks,
    bookmarkLandmark,
    unbookmarkLandmark,
    getBookmarkedLandmarks,
  };
};
