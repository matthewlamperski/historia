import MapLibreGL from '@maplibre/maplibre-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Landmark, OfflinePackMeta } from '../types';

const STORAGE_KEY = '@historia/offline_packs';

// ~5km bounding box offset in degrees
const BOUNDS_OFFSET = 0.045;

// Zoom range: city-level overview down to walking-level detail
const MIN_ZOOM = 10;
const MAX_ZOOM = 16;

export const OFFLINE_STYLE_URL = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

function packNameForLandmark(landmarkId: string): string {
  return `landmark_${landmarkId}`;
}

async function readAllMeta(): Promise<OfflinePackMeta[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OfflinePackMeta[]) : [];
  } catch {
    return [];
  }
}

async function writeMeta(packs: OfflinePackMeta[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(packs));
}

export async function getAllPackMeta(): Promise<OfflinePackMeta[]> {
  return readAllMeta();
}

export async function isLandmarkSaved(landmarkId: string): Promise<boolean> {
  const packs = await readAllMeta();
  return packs.some(p => p.landmarkId === landmarkId);
}

/**
 * Download map tiles for the area around a landmark.
 * Progress is reported via onProgress(0-100).
 * Resolves when the download completes (or rejects on error).
 */
export function downloadLandmarkPack(
  landmark: Landmark,
  onProgress: (percentage: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { latitude, longitude } = landmark.coordinates;
    const packName = packNameForLandmark(landmark.id);

    const bounds: [[number, number], [number, number]] = [
      [longitude - BOUNDS_OFFSET, latitude - BOUNDS_OFFSET], // SW [lng, lat]
      [longitude + BOUNDS_OFFSET, latitude + BOUNDS_OFFSET], // NE [lng, lat]
    ];

    MapLibreGL.offlineManager.createPack(
      {
        name: packName,
        styleURL: OFFLINE_STYLE_URL,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        bounds,
      },
      async (_pack, status) => {
        const pct = status?.percentage ?? 0;
        onProgress(Math.round(pct));

        if (status?.percentage >= 100) {
          // Estimate size from tile count: roughly 15KB per tile average
          const tileCount = status?.completedResourceCount ?? 0;
          const estimatedSizeMB = parseFloat(((tileCount * 15) / 1024).toFixed(1));

          const meta: OfflinePackMeta = {
            packName,
            landmarkId: landmark.id,
            landmarkName: landmark.name,
            downloadedAt: new Date().toISOString(),
            estimatedSizeMB,
          };

          const existing = await readAllMeta();
          // Replace if already present
          const updated = existing.filter(p => p.landmarkId !== landmark.id);
          updated.push(meta);
          await writeMeta(updated);
          resolve();
        }
      },
      (_pack, error) => {
        reject(new Error(error?.message ?? 'Offline download failed'));
      },
    );
  });
}

/**
 * Delete the offline pack for a landmark and remove its metadata.
 */
export async function deletePackForLandmark(landmarkId: string): Promise<void> {
  const packName = packNameForLandmark(landmarkId);
  try {
    await MapLibreGL.offlineManager.deletePack(packName);
  } catch {
    // Pack may not exist in MapLibre (e.g. fresh install), that's fine
  }
  const existing = await readAllMeta();
  await writeMeta(existing.filter(p => p.landmarkId !== landmarkId));
}
