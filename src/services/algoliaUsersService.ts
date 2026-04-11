import { algoliasearch } from 'algoliasearch';
import { ALGOLIA_APP_ID, ALGOLIA_SEARCH_ONLY_KEY, ALGOLIA_USERS_INDEX } from '../constants/algolia';

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_ONLY_KEY);

export interface NearbyUserHit {
  objectID: string; // userId
  handle: string;
  name: string;
  avatar?: string | null;
  pointsBalance?: number;
  _geoloc?: { lat: number; lng: number };
  _rankingInfo?: {
    geoDistance: number; // meters from search center
  };
}

const METERS_PER_MILE = 1609.344;

/**
 * Geo-queries the Algolia users index for users whose hometown is within
 * `radiusMiles` miles of the given coordinates.
 *
 * Requires the users index to have `_geoloc: { lat, lng }` populated.
 * The cloud function syncUserToAlgolia writes this field when a user saves
 * their hometown.
 */
export const searchNearbyUsers = async (
  lat: number,
  lng: number,
  radiusMiles: number = 100,
  excludeUserId?: string
): Promise<NearbyUserHit[]> => {
  const result = await client.searchSingleIndex({
    indexName: ALGOLIA_USERS_INDEX,
    searchParams: {
      query: '',
      aroundLatLng: `${lat},${lng}`,
      aroundRadius: Math.round(radiusMiles * METERS_PER_MILE),
      hitsPerPage: 50,
      getRankingInfo: true,
    },
  });

  const hits = result.hits as NearbyUserHit[];

  // Exclude the current user from the results
  return excludeUserId ? hits.filter(h => h.objectID !== excludeUserId) : hits;
};

/** Format a distance in meters as a human-readable miles string */
export const formatDistance = (meters: number): string => {
  const miles = meters / METERS_PER_MILE;
  if (miles < 0.1) return 'less than 0.1 mi away';
  if (miles < 10) return `${miles.toFixed(1)} mi away`;
  return `${Math.round(miles)} mi away`;
};
