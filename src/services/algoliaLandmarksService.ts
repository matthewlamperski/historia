import { algoliasearch } from 'algoliasearch';
import {
  ALGOLIA_APP_ID,
  ALGOLIA_SEARCH_ONLY_KEY,
  ALGOLIA_LANDMARKS_INDEX,
} from '../constants/algolia';

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_ONLY_KEY);

/**
 * Shape returned from Algolia for a landmark hit.
 * Mirrors what syncLandmarkToAlgolia writes in the cloud function.
 */
export interface LandmarkHit {
  objectID: string;
  name: string;
  shortDescription?: string;
  description?: string;
  historicalSignificance?: string;
  address?: string;
  city?: string;
  state?: string;
  county?: string;
  category?: string;
  landmarkType?: import('../types').LandmarkType;
  areasOfSignificance?: string[];
  yearBuilt?: number;
  images?: string[];
  visitingHours?: string;
  website?: string;
  /** Stored as { latitude, longitude } to match the app's Landmark type */
  coordinates?: { latitude: number; longitude: number };
  /** Algolia geo field — always present for indexed landmarks */
  _geoloc?: { lat: number; lng: number };
  _rankingInfo?: { geoDistance: number };
  // Google Places enrichment fields (present after first user tap)
  populated?: boolean;
  phone?: string;
  googleMapsUri?: string;
  rating?: number;
  ratingCount?: number;
  openingHours?: string[];
  wheelchair?: boolean;
  editorialSummary?: string;
}

/**
 * Search landmarks by text query across the entire index.
 * No geo-filtering — results are ranked by text relevance only.
 *
 * @param query  The user's search string
 */
export const searchLandmarks = async (
  query: string
): Promise<LandmarkHit[]> => {
  const result = await client.searchSingleIndex({
    indexName: ALGOLIA_LANDMARKS_INDEX,
    searchParams: {
      query,
      hitsPerPage: 10,
      attributesToRetrieve: [
        'name',
        'shortDescription',
        'description',
        'historicalSignificance',
        'address',
        'city',
        'state',
        'county',
        'category',
        'landmarkType',
        'areasOfSignificance',
        'yearBuilt',
        'images',
        'visitingHours',
        'website',
        'coordinates',
        '_geoloc',
        // Places enrichment — must be retrieved so we know not to re-fetch from Places API
        'populated',
        'phone',
        'googleMapsUri',
        'rating',
        'ratingCount',
        'openingHours',
        'wheelchair',
        'editorialSummary',
      ],
    },
  });

  return result.hits as LandmarkHit[];
};

/**
 * Browse all landmarks in the index, bypassing the 1000-hit search limit.
 * Uses Algolia's browseObjects helper which paginates through every record.
 *
 * Attributes are intentionally minimal — just enough to place a dot on the
 * map and show a quick-preview sheet. Long-form content (description,
 * historicalSignificance, editorialSummary, openingHours, visitingHours) is
 * fetched on demand via `landmarksService.getLandmark(id)` when the user taps
 * a marker. This keeps the initial payload small and markers appear fast.
 *
 * @param onPage optional callback fired after each page lands so the caller
 *               can render markers incrementally instead of waiting for the
 *               entire browse to finish.
 */
export const browseAllLandmarks = async (
  onPage?: (pageHits: LandmarkHit[]) => void,
): Promise<LandmarkHit[]> => {
  const allHits: LandmarkHit[] = [];

  await (client as any).browseObjects({
    indexName: ALGOLIA_LANDMARKS_INDEX,
    browseParams: {
      query: '',
      hitsPerPage: 1000,
      attributesToRetrieve: [
        'name',
        'shortDescription',
        'address',
        'city',
        'state',
        'category',
        'landmarkType',
        'yearBuilt',
        'images',
        'coordinates',
        '_geoloc',
        // Small Places enrichment fields — keep these so the quick-preview
        // has rating/phone/website right away. The big ones are omitted.
        'populated',
        'phone',
        'website',
        'googleMapsUri',
        'rating',
        'ratingCount',
        'wheelchair',
      ],
    },
    aggregator: (response: any) => {
      const pageHits = response.hits as LandmarkHit[];
      allHits.push(...pageHits);
      onPage?.(pageHits);
    },
  });

  console.log(`[Algolia] browseAllLandmarks complete — total: ${allHits.length}`);
  return allHits;
};

/**
 * @deprecated Use browseAllLandmarks() instead; this is capped at 1000 hits.
 * Kept only for reference.
 */
export const searchLandmarksInViewport = async (
  _swLat: number,
  _swLng: number,
  _neLat: number,
  _neLng: number,
): Promise<LandmarkHit[]> => browseAllLandmarks();

/**
 * Fetch a single landmark by its Algolia objectID.
 * Returns a fully-shaped Landmark object ready for use in the app.
 */
export const getLandmarkById = async (objectID: string): Promise<import('../types').Landmark | null> => {
  try {
    const hit = await client.getObject({
      indexName: ALGOLIA_LANDMARKS_INDEX,
      objectID,
    }) as LandmarkHit & { objectID: string };

    const coords = hit.coordinates ??
      (hit._geoloc ? { latitude: hit._geoloc.lat, longitude: hit._geoloc.lng } : null);

    if (!coords) return null;

    return {
      id: hit.objectID,
      name: hit.name,
      description: hit.description ?? '',
      shortDescription: hit.shortDescription ?? '',
      coordinates: coords,
      category: (hit.category as import('../types').Landmark['category']) ?? 'other',
      landmarkType: hit.landmarkType,
      images: hit.images ?? [],
      historicalSignificance: hit.historicalSignificance ?? '',
      address: hit.address ?? '',
      yearBuilt: hit.yearBuilt,
      visitingHours: hit.visitingHours,
      website: hit.website,
    };
  } catch (e) {
    console.error('getLandmarkById error:', e);
    return null;
  }
};

/** Format metres as a short human-readable distance string */
export const formatLandmarkDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
};
