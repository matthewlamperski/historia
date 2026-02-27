// Firebase imports with error handling
let firestore: any = null;

try {
  firestore = require('@react-native-firebase/firestore').default;
} catch {
  console.warn('Firebase modules not available, using mock data only');
}

import { COLLECTIONS } from './firebaseConfig';
import { Visit, Landmark } from '../types';
import { getDistance } from 'geolib';
import { landmarksService } from './landmarksService';

// Verification radius in meters (100m)
const VERIFICATION_RADIUS = 100;

class VisitsService {
  private isFirebaseAvailable(): boolean {
    try {
      if (!firestore) return false;
      firestore();
      return true;
    } catch {
      return false;
    }
  }

  // Verify user is within range of a landmark
  verifyVisit(
    userLocation: { latitude: number; longitude: number },
    landmarkLocation: { latitude: number; longitude: number }
  ): boolean {
    const distance = getDistance(userLocation, landmarkLocation);
    return distance <= VERIFICATION_RADIUS;
  }

  // Create a visit (check-in at landmark)
  async createVisit(
    userId: string,
    landmarkId: string,
    userLocation: { latitude: number; longitude: number },
    notes?: string,
    photos?: string[]
  ): Promise<Visit> {
    // Get landmark to verify location
    const landmark = await landmarksService.getLandmark(landmarkId);

    if (!landmark) {
      throw new Error('Landmark not found');
    }

    // Verify user is within range
    const isInRange = this.verifyVisit(userLocation, landmark.coordinates);

    if (!isInRange) {
      throw new Error('You must be within 100 meters of the landmark to check in');
    }

    if (!this.isFirebaseAvailable()) {
      // Mock implementation
      await new Promise<void>(resolve => setTimeout(resolve, 500));

      const visit: Visit = {
        id: `visit-${Date.now()}`,
        userId,
        landmarkId,
        landmark,
        visitedAt: new Date(),
        verificationLocation: userLocation,
        notes,
        photos: photos || [],
        createdAt: new Date(),
      };

      console.log('Created visit:', visit);
      return visit;
    }

    try {
      const now = firestore.Timestamp.now();

      const visitData = {
        userId,
        landmarkId,
        visitedAt: now,
        verificationLocation: userLocation,
        notes: notes || null,
        photos: photos || [],
        createdAt: now,
      };

      const docRef = await firestore()
        .collection(COLLECTIONS.VISITS)
        .add(visitData);

      // Update user's visited landmarks
      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .update({
          visitedLandmarks: firestore.FieldValue.arrayUnion(landmarkId),
        });

      return {
        id: docRef.id,
        ...visitData,
        landmark,
        visitedAt: now.toDate(),
        createdAt: now.toDate(),
      } as Visit;
    } catch (error) {
      console.error('Error creating visit:', error);
      throw error;
    }
  }

  // Get user's visits
  async getUserVisits(
    userId: string,
    limit: number = 50
  ): Promise<Visit[]> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 300));

      // Return mock visits with first 3 landmarks
      const mockVisits: Visit[] = await Promise.all(
        landmarksService.CINCINNATI_LANDMARKS.slice(0, 3).map(async (landmark, index) => ({
          id: `visit-${index + 1}`,
          userId,
          landmarkId: landmark.id,
          landmark,
          visitedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (index + 1)), // 1, 2, 3 days ago
          verificationLocation: landmark.coordinates,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (index + 1)),
        }))
      );

      return mockVisits;
    }

    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.VISITS)
        .where('userId', '==', userId)
        .orderBy('visitedAt', 'desc')
        .limit(limit)
        .get();

      const visits = await Promise.all(
        snapshot.docs.map(async (doc: any) => {
          const data = doc.data();

          // Fetch landmark data
          const landmark = await landmarksService.getLandmark(data.landmarkId);

          return {
            id: doc.id,
            ...data,
            landmark,
            visitedAt: data.visitedAt?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
          } as Visit;
        })
      );

      return visits;
    } catch (error) {
      console.error('Error fetching user visits:', error);
      return [];
    }
  }

  // Get visits for a specific landmark
  async getLandmarkVisits(
    landmarkId: string,
    limit: number = 50
  ): Promise<Visit[]> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      return [];
    }

    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.VISITS)
        .where('landmarkId', '==', landmarkId)
        .orderBy('visitedAt', 'desc')
        .limit(limit)
        .get();

      const visits = await Promise.all(
        snapshot.docs.map(async (doc: any) => {
          const data = doc.data();

          // Fetch landmark data
          const landmark = await landmarksService.getLandmark(data.landmarkId);

          return {
            id: doc.id,
            ...data,
            landmark,
            visitedAt: data.visitedAt?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
          } as Visit;
        })
      );

      return visits;
    } catch (error) {
      console.error('Error fetching landmark visits:', error);
      return [];
    }
  }

  // Check if user has visited a landmark
  async hasVisited(userId: string, landmarkId: string): Promise<boolean> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
      // Mock: first 3 landmarks are visited
      return ['1', '2', '3'].includes(landmarkId);
    }

    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.VISITS)
        .where('userId', '==', userId)
        .where('landmarkId', '==', landmarkId)
        .limit(1)
        .get();

      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking visit status:', error);
      return false;
    }
  }
}

export const visitsService = new VisitsService();
