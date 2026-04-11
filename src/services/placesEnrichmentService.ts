/**
 * placesEnrichmentService.ts
 *
 * Fetches rich data for a landmark from the Google Places API (New, v1) the
 * first time a user taps it.  The result is immediately returned for display
 * and also written back to the Firestore landmark document so that every
 * subsequent user (and session) gets the data from Firestore/Algolia instead
 * of hitting the Places API again.
 *
 * Flow per tap:
 *   1. Text-search the New Places API for the landmark by name + city/state,
 *      biased to the landmark's known coordinates.
 *   2. Fetch full place details with a field mask limited to fields we care about.
 *   3. Build photo media URLs from the photo references.
 *   4. Return the enriched data immediately (for instant UI update).
 *   5. Write `populated: true` + all fetched fields to Firestore (non-blocking).
 *      The Firestore → Algolia extension then syncs it so future browses have
 *      the data without hitting the Places API.
 */

import firestore from '@react-native-firebase/firestore';
import { GOOGLE_PLACES_API_KEY } from '../constants/googlePlaces';
import { COLLECTIONS } from './firebaseConfig';
import { Landmark } from '../types';

const BASE = 'https://places.googleapis.com/v1';

// Fields we request from the Places Details endpoint.
// Intentionally omits price level, parking options, and other non-history fields.
const DETAIL_FIELD_MASK = [
  'displayName',
  'formattedAddress',
  'nationalPhoneNumber',
  'websiteUri',
  'regularOpeningHours',
  'photos',
  'rating',
  'userRatingCount',
  'editorialSummary',
  'googleMapsUri',
  'accessibilityOptions',
].join(',');

// ── Internal helpers ──────────────────────────────────────────────────────────

async function searchForPlaceId(
  name: string,
  lat: number,
  lng: number,
  city?: string,
  state?: string,
): Promise<string | null> {
  const textQuery = [name, city, state].filter(Boolean).join(', ');

  const res = await fetch(`${BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'places.id',
    },
    body: JSON.stringify({
      textQuery,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 3000, // 3 km — tight bias so we don't pull a wrong city's match
        },
      },
      maxResultCount: 1,
    }),
  });

  if (!res.ok) {
    console.warn(`[Places] searchText HTTP ${res.status} for "${name}"`);
    return null;
  }

  const json = await res.json();
  return json?.places?.[0]?.id ?? null;
}

async function fetchPlaceDetails(placeId: string): Promise<Record<string, any>> {
  const res = await fetch(`${BASE}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': DETAIL_FIELD_MASK,
    },
  });

  if (!res.ok) {
    console.warn(`[Places] details HTTP ${res.status} for placeId ${placeId}`);
    return {};
  }

  return res.json();
}

/** Build a direct media URL from a Places photo resource name */
function photoUrl(photoName: string, maxWidthPx = 900): string {
  return `${BASE}/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${GOOGLE_PLACES_API_KEY}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface PlacesEnrichment {
  images: string[];
  phone?: string;
  website?: string;
  address?: string;
  googleMapsUri?: string;
  rating?: number;
  ratingCount?: number;
  openingHours?: string[];
  wheelchair?: boolean;
  editorialSummary?: string; // short human-readable description from Google Places
}

/**
 * Fetches enrichment data for a landmark from the Google Places API.
 * Returns `null` if the landmark cannot be matched or the API call fails.
 */
export async function fetchEnrichment(landmark: Landmark): Promise<PlacesEnrichment | null> {
  const { latitude: lat, longitude: lng } = landmark.coordinates;

  try {
    const placeId = await searchForPlaceId(
      landmark.name, lat, lng, landmark.city, landmark.state,
    );
    if (!placeId) {
      console.log(`[Places] No match for "${landmark.name}" — marking populated anyway`);
      return null;
    }

    const details = await fetchPlaceDetails(placeId);

    const photos: string[] = (details.photos ?? [])
      .slice(0, 6)
      .map((p: any) => photoUrl(p.name));

    return {
      images: photos,
      phone: details.nationalPhoneNumber,
      website: details.websiteUri,
      address: details.formattedAddress,
      googleMapsUri: details.googleMapsUri,
      rating: details.rating,
      ratingCount: details.userRatingCount,
      openingHours: details.regularOpeningHours?.weekdayDescriptions,
      wheelchair: details.accessibilityOptions?.wheelchairAccessibleEntrance,
      editorialSummary: details.editorialSummary?.text,
    };
  } catch (err) {
    console.error(`[Places] fetchEnrichment error for "${landmark.name}":`, err);
    return null;
  }
}

/**
 * Fetches enrichment data, then persists it to Firestore (non-blocking).
 * Returns the partial Landmark update to apply immediately in the UI.
 *
 * Always sets `populated: true` in Firestore — even if the Places API returned
 * no match — so we don't hit the API again for this landmark.
 */
export async function enrichAndPersist(
  landmark: Landmark,
): Promise<Partial<Landmark>> {
  const enrichment = await fetchEnrichment(landmark);

  // Build the update object — only write defined values
  const firestoreUpdate: Record<string, any> = { populated: true };
  const landmarkUpdate: Partial<Landmark> = { populated: true };

  if (enrichment) {
    if (enrichment.images.length > 0) {
      firestoreUpdate.images = enrichment.images;
      landmarkUpdate.images = enrichment.images;
    }
    if (enrichment.phone) {
      firestoreUpdate.phone = enrichment.phone;
      landmarkUpdate.phone = enrichment.phone;
    }
    if (enrichment.website && !landmark.website) {
      // Don't overwrite an existing website
      firestoreUpdate.website = enrichment.website;
      landmarkUpdate.website = enrichment.website;
    }
    if (enrichment.address && (!landmark.address || landmark.address.length < 10)) {
      firestoreUpdate.address = enrichment.address;
      landmarkUpdate.address = enrichment.address;
    }
    if (enrichment.googleMapsUri) {
      firestoreUpdate.googleMapsUri = enrichment.googleMapsUri;
      landmarkUpdate.googleMapsUri = enrichment.googleMapsUri;
    }
    if (enrichment.rating != null) {
      firestoreUpdate.rating = enrichment.rating;
      landmarkUpdate.rating = enrichment.rating;
    }
    if (enrichment.ratingCount != null) {
      firestoreUpdate.ratingCount = enrichment.ratingCount;
      landmarkUpdate.ratingCount = enrichment.ratingCount;
    }
    if (enrichment.openingHours?.length) {
      firestoreUpdate.openingHours = enrichment.openingHours;
      landmarkUpdate.openingHours = enrichment.openingHours;
    }
    if (enrichment.wheelchair != null) {
      firestoreUpdate.wheelchair = enrichment.wheelchair;
      landmarkUpdate.wheelchair = enrichment.wheelchair;
    }
    if (enrichment.editorialSummary) {
      // Always save — this is a Places-sourced description independent of the CSV description
      firestoreUpdate.editorialSummary = enrichment.editorialSummary;
      landmarkUpdate.editorialSummary = enrichment.editorialSummary;
    }
  }

  // Write to Firestore in background — Algolia extension syncs automatically
  firestore()
    .collection(COLLECTIONS.LANDMARKS)
    .doc(landmark.id)
    .update(firestoreUpdate)
    .catch(err =>
      console.error(`[Places] Firestore update failed for landmark ${landmark.id}:`, err)
    );

  return landmarkUpdate;
}
