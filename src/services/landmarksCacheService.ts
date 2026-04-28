import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { LandmarkHit } from './algoliaLandmarksService';

const CACHE_KEY = 'landmarksCache:v1';
const SCHEMA_VERSION = 1 as const;

export const SOFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const HARD_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Loose validation — Algolia hits commonly omit fields. We only enforce that
 * each entry is an object with a string `objectID`. Everything else passes
 * through opaquely; the consumer (`MapTab`) already handles missing fields.
 */
const LandmarkHitSchema = z
  .object({ objectID: z.string().min(1) })
  .passthrough();

const CachedLandmarksSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  cachedAt: z.number(),
  hits: z.array(LandmarkHitSchema),
});

export interface CachedLandmarks {
  schemaVersion: typeof SCHEMA_VERSION;
  cachedAt: number;
  hits: LandmarkHit[];
}

/**
 * Read + validate the cached landmark set. Returns null on any miss / parse /
 * schema failure. On schema failure the cache key is also evicted so we don't
 * pay the parse cost again next launch.
 */
export async function loadCachedLandmarks(): Promise<CachedLandmarks | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const validated = CachedLandmarksSchema.safeParse(parsed);
    if (!validated.success) {
      await AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
      return null;
    }
    return {
      schemaVersion: validated.data.schemaVersion,
      cachedAt: validated.data.cachedAt,
      hits: validated.data.hits as unknown as LandmarkHit[],
    };
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget cache write. Callers should `.catch(console.warn)` —
 * a write failure must not propagate to the user-visible flow.
 */
export async function cacheLandmarks(hits: LandmarkHit[]): Promise<void> {
  const payload: CachedLandmarks = {
    schemaVersion: SCHEMA_VERSION,
    cachedAt: Date.now(),
    hits,
  };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

export async function clearLandmarksCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}

/**
 * Apply a partial update to a single cached landmark. Loads, finds by
 * `objectID`, merges, rewrites. No-op if there's no cache yet — the next
 * background refresh will pick up the authoritative value from Algolia.
 */
export async function mutateLandmarkInCache(
  id: string,
  updates: Partial<LandmarkHit>,
): Promise<void> {
  const cached = await loadCachedLandmarks();
  if (!cached) return;

  let found = false;
  const nextHits = cached.hits.map(hit => {
    if (hit.objectID !== id) return hit;
    found = true;
    return { ...hit, ...updates };
  });
  if (!found) return;

  await cacheLandmarks(nextHits);
}

/**
 * Remove a landmark from the cache. No-op if no cache or the id isn't present.
 */
export async function removeLandmarkFromCache(id: string): Promise<void> {
  const cached = await loadCachedLandmarks();
  if (!cached) return;

  const nextHits = cached.hits.filter(hit => hit.objectID !== id);
  if (nextHits.length === cached.hits.length) return;

  await cacheLandmarks(nextHits);
}

export function isStale(cachedAt: number, softTtlMs: number = SOFT_TTL_MS): boolean {
  return Date.now() - cachedAt > softTtlMs;
}

export function isHardStale(cachedAt: number, hardTtlMs: number = HARD_TTL_MS): boolean {
  return Date.now() - cachedAt > hardTtlMs;
}
