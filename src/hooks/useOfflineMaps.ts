import { useState, useCallback, useEffect } from 'react';
import { Landmark, OfflinePackMeta } from '../types';
import {
  downloadLandmarkPack,
  deletePackForLandmark,
  getAllPackMeta,
  isLandmarkSaved as checkLandmarkSaved,
} from '../services/offlineMapService';

interface DownloadProgress {
  landmarkId: string;
  percentage: number;
}

interface UseOfflineMapsReturn {
  packs: OfflinePackMeta[];
  downloadProgress: DownloadProgress | null;
  isDownloading: boolean;
  error: string | null;
  downloadLandmark: (landmark: Landmark) => Promise<void>;
  deletePackForLandmark: (landmarkId: string) => Promise<void>;
  isLandmarkSaved: (landmarkId: string) => boolean;
  loadPacks: () => Promise<void>;
}

export function useOfflineMaps(): UseOfflineMapsReturn {
  const [packs, setPacks] = useState<OfflinePackMeta[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPacks = useCallback(async () => {
    const all = await getAllPackMeta();
    setPacks(all);
  }, []);

  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  const downloadLandmark = useCallback(async (landmark: Landmark) => {
    setIsDownloading(true);
    setError(null);
    setDownloadProgress({ landmarkId: landmark.id, percentage: 0 });

    try {
      await downloadLandmarkPack(landmark, (percentage) => {
        setDownloadProgress({ landmarkId: landmark.id, percentage });
      });
      await loadPacks();
    } catch (err: any) {
      setError(err?.message ?? 'Download failed');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  }, [loadPacks]);

  const handleDelete = useCallback(async (landmarkId: string) => {
    await deletePackForLandmark(landmarkId);
    await loadPacks();
  }, [loadPacks]);

  const isLandmarkSaved = useCallback(
    (landmarkId: string) => packs.some(p => p.landmarkId === landmarkId),
    [packs],
  );

  return {
    packs,
    downloadProgress,
    isDownloading,
    error,
    downloadLandmark,
    deletePackForLandmark: handleDelete,
    isLandmarkSaved,
    loadPacks,
  };
}
