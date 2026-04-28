import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './firebaseConfig';
import { Landmark } from '../types';
import { getDistance } from 'geolib';
import {
  mutateLandmarkInCache,
  removeLandmarkFromCache,
} from './landmarksCacheService';
import { LandmarkHit } from './algoliaLandmarksService';

class LandmarksService {
  // Get all landmarks
  async getLandmarks(limit: number = 50): Promise<Landmark[]> {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.LANDMARKS)
        .limit(limit)
        .get();

      return snapshot.docs
        .map((doc: any) => {
          const data = doc.data();
          // Support both nested coordinates object and flat latitude/longitude fields
          const coordinates = data.coordinates ?? {
            latitude: data.latitude,
            longitude: data.longitude,
          };
          if (!coordinates.latitude || !coordinates.longitude) return null;
          return { id: doc.id, ...data, coordinates } as Landmark;
        })
        .filter((l): l is Landmark => l !== null);
    } catch (error) {
      console.error('Error fetching landmarks:', error);
      throw error;
    }
  }

  // Get landmarks near a location
  async getNearbyLandmarks(
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000,
    limit: number = 20
  ): Promise<Landmark[]> {
    try {
      const allLandmarks = await this.getLandmarks(100);
      return allLandmarks
        .filter(landmark => {
          const distance = getDistance({ latitude, longitude }, landmark.coordinates);
          return distance <= radiusMeters;
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching nearby landmarks:', error);
      throw error;
    }
  }

  // Get a single landmark by ID
  async getLandmark(landmarkId: string): Promise<Landmark | null> {
    try {
      const doc = await firestore()
        .collection(COLLECTIONS.LANDMARKS)
        .doc(landmarkId)
        .get();

      const data = doc.data();
      if (!data) return null;
      // Normalize coordinates across the three schemas that exist on landmark
      // docs in the wild: the canonical `coordinates` object, flat
      // `latitude`/`longitude` or `lat`/`lng`, and the Algolia-style `_geoloc`.
      const lat =
        data.coordinates?.latitude ??
        data.latitude ??
        data._geoloc?.lat ??
        data.lat;
      const lng =
        data.coordinates?.longitude ??
        data.longitude ??
        data._geoloc?.lng ??
        data.lng;
      const coordinates =
        Number.isFinite(lat) && Number.isFinite(lng)
          ? { latitude: lat as number, longitude: lng as number }
          : data.coordinates;
      return { id: doc.id, ...data, coordinates } as Landmark;
    } catch (error) {
      console.error('Error fetching landmark:', error);
      return null;
    }
  }

  // Bookmark a landmark — writes to users/{userId}/bookmarks/{landmarkId}
  async bookmarkLandmark(userId: string, landmarkId: string): Promise<void> {
    try {
      await firestore()
        .collection(COLLECTIONS.USERS).doc(userId)
        .collection(COLLECTIONS.BOOKMARKS).doc(landmarkId)
        .set({ landmarkId, createdAt: firestore.Timestamp.now() });
      await firestore()
        .collection(COLLECTIONS.USERS).doc(userId)
        .update({ bookmarkCount: firestore.FieldValue.increment(1) });
    } catch (error) {
      console.error('Error bookmarking landmark:', error);
      throw error;
    }
  }

  // Unbookmark a landmark
  async unbookmarkLandmark(userId: string, landmarkId: string): Promise<void> {
    try {
      await firestore()
        .collection(COLLECTIONS.USERS).doc(userId)
        .collection(COLLECTIONS.BOOKMARKS).doc(landmarkId)
        .delete();
      await firestore()
        .collection(COLLECTIONS.USERS).doc(userId)
        .update({ bookmarkCount: firestore.FieldValue.increment(-1) });
    } catch (error) {
      console.error('Error unbookmarking landmark:', error);
      throw error;
    }
  }

  // Check if a landmark is bookmarked by user
  async isLandmarkBookmarked(userId: string, landmarkId: string): Promise<boolean> {
    try {
      const doc = await firestore()
        .collection(COLLECTIONS.USERS).doc(userId)
        .collection(COLLECTIONS.BOOKMARKS).doc(landmarkId)
        .get();
      return doc.exists();
    } catch {
      return false;
    }
  }

  // Get all bookmarked landmark IDs for a user
  async getBookmarkedLandmarkIds(userId: string): Promise<string[]> {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.USERS).doc(userId)
        .collection(COLLECTIONS.BOOKMARKS)
        .get();
      return snapshot.docs.map((doc: any) => doc.id);
    } catch (error) {
      console.error('Error fetching bookmark IDs:', error);
      return [];
    }
  }

  // Update a landmark (admin only). Accepts a partial so callers can patch
  // whichever fields they changed without clobbering the rest of the doc.
  // `undefined` values are converted to FieldValue.delete() so clearing an
  // optional field in the UI actually removes it from the Firestore doc —
  // Firestore itself rejects raw `undefined` values.
  async updateLandmark(
    landmarkId: string,
    updates: Partial<Omit<Landmark, 'id'>> & {
      // Extra coord field variants we write on save so every schema in the
      // wild stays in sync. See LandmarkEditModal.handleSave.
      latitude?: number;
      longitude?: number;
      lat?: number;
      lng?: number;
      _geoloc?: { lat: number; lng: number };
    },
  ): Promise<void> {
    try {
      const payload: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };
      for (const [key, value] of Object.entries(updates)) {
        payload[key] = value === undefined ? firestore.FieldValue.delete() : value;
      }
      await firestore()
        .collection(COLLECTIONS.LANDMARKS)
        .doc(landmarkId)
        .set(payload, { merge: true });

      // Mirror the change into the on-device landmarks cache so the admin
      // doesn't see their own edit reverted on next launch (the Firebase
      // Algolia extension takes a few seconds to propagate). Fire-and-forget;
      // a cache desync is recoverable on the next refresh.
      const cacheUpdates: Partial<LandmarkHit> = {};
      if (updates.name !== undefined) cacheUpdates.name = updates.name;
      if (updates.shortDescription !== undefined) {
        cacheUpdates.shortDescription = updates.shortDescription;
      }
      if (updates.description !== undefined) cacheUpdates.description = updates.description;
      if (updates.address !== undefined) cacheUpdates.address = updates.address;
      if (updates.category !== undefined) cacheUpdates.category = updates.category;
      if (updates.landmarkType !== undefined) cacheUpdates.landmarkType = updates.landmarkType;
      if (updates.yearBuilt !== undefined) cacheUpdates.yearBuilt = updates.yearBuilt;
      if (updates.images !== undefined) cacheUpdates.images = updates.images;
      if (updates.website !== undefined) cacheUpdates.website = updates.website;
      if (updates._geoloc !== undefined) {
        cacheUpdates._geoloc = updates._geoloc;
      } else if (updates.latitude !== undefined && updates.longitude !== undefined) {
        cacheUpdates._geoloc = { lat: updates.latitude, lng: updates.longitude };
        cacheUpdates.coordinates = {
          latitude: updates.latitude,
          longitude: updates.longitude,
        };
      }
      if (Object.keys(cacheUpdates).length > 0) {
        mutateLandmarkInCache(landmarkId, cacheUpdates).catch(err =>
          console.warn('[landmarks] cache mutate failed', err),
        );
      }
    } catch (error) {
      console.error('Error updating landmark:', error);
      throw error;
    }
  }

  // Delete a landmark (admin only)
  async deleteLandmark(landmarkId: string): Promise<void> {
    try {
      await firestore()
        .collection(COLLECTIONS.LANDMARKS)
        .doc(landmarkId)
        .delete();

      // Remove from the on-device cache too — fire-and-forget.
      removeLandmarkFromCache(landmarkId).catch(err =>
        console.warn('[landmarks] cache remove failed', err),
      );
    } catch (error) {
      console.error('Error deleting landmark:', error);
      throw error;
    }
  }

  // Get user's bookmarked landmarks (full Landmark objects)
  async getBookmarkedLandmarks(userId: string): Promise<Landmark[]> {
    try {
      const ids = await this.getBookmarkedLandmarkIds(userId);
      if (ids.length === 0) return [];
      const landmarks = await Promise.all(ids.map(id => this.getLandmark(id)));
      return landmarks.filter((l): l is Landmark => l !== null);
    } catch (error) {
      console.error('Error fetching bookmarked landmarks:', error);
      return [];
    }
  }
}

export const landmarksService = new LandmarksService();
