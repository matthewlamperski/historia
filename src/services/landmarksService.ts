import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './firebaseConfig';
import { Landmark } from '../types';
import { getDistance } from 'geolib';

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

      const docData = doc.data();
      if (!docData) return null;
      return { id: doc.id, ...docData } as Landmark;
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
