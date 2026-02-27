// Firebase imports with error handling
let firestore: any = null;

try {
  firestore = require('@react-native-firebase/firestore').default;
} catch {
  console.warn('Firebase modules not available, using mock data only');
}

import { COLLECTIONS } from './firebaseConfig';
import { Landmark, User } from '../types';
import { getDistance } from 'geolib';

// Cincinnati landmarks from MapTab
export const CINCINNATI_LANDMARKS: Landmark[] = [
  {
    id: '1',
    name: 'Cincinnati Museum Center at Union Terminal',
    description: 'A magnificent Art Deco train station built in 1933, now serving as a museum complex. This iconic landmark represents the golden age of railroad travel and houses multiple museums including the Museum of Natural History & Science, Cincinnati History Museum, and Duke Energy Children\'s Museum.',
    shortDescription: 'Historic Art Deco train station, now a museum complex',
    coordinates: {
      latitude: 39.1097,
      longitude: -84.5386,
    },
    yearBuilt: 1933,
    category: 'building',
    images: ['https://images.unsplash.com/photo-1580407196238-dac33f57c410?w=500'],
    historicalSignificance: 'One of the finest examples of Art Deco architecture in the United States and a symbol of Cincinnati\'s transportation heritage.',
    visitingHours: '10:00 AM - 5:00 PM',
    website: 'https://www.cincymuseum.org',
    address: '1301 Western Ave, Cincinnati, OH 45203'
  },
  {
    id: '2',
    name: 'Roebling Suspension Bridge',
    description: 'Completed in 1866, this suspension bridge was a prototype for the Brooklyn Bridge. Designed by John Augustus Roebling, it spans the Ohio River connecting Cincinnati, Ohio to Covington, Kentucky.',
    shortDescription: 'Historic suspension bridge prototype for Brooklyn Bridge',
    coordinates: {
      latitude: 39.0936,
      longitude: -84.5092,
    },
    yearBuilt: 1866,
    category: 'monument',
    images: ['https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=500'],
    historicalSignificance: 'Engineering marvel and prototype for the more famous Brooklyn Bridge, representing 19th-century innovation.',
    visitingHours: 'Open 24 hours',
    address: 'Roebling Bridge, Cincinnati, OH 45202'
  },
  {
    id: '3',
    name: 'Fountain Square',
    description: 'The heart of downtown Cincinnati, featuring the iconic Tyler Davidson Fountain. This public square has been the city\'s gathering place since 1871 and hosts numerous events throughout the year.',
    shortDescription: 'Downtown\'s central gathering place with historic fountain',
    coordinates: {
      latitude: 39.1014,
      longitude: -84.5124,
    },
    yearBuilt: 1871,
    category: 'site',
    images: ['https://images.unsplash.com/photo-1573160813959-df05c1b8b5c4?w=500'],
    historicalSignificance: 'Central to Cincinnati\'s civic life for over 150 years, symbolizing the city\'s community spirit.',
    visitingHours: 'Open 24 hours',
    website: 'https://myfountainsquare.com',
    address: '520 Vine St, Cincinnati, OH 45202'
  },
  {
    id: '4',
    name: 'Cincinnati Observatory',
    description: 'Founded in 1842, this is one of the oldest professional observatories in the United States. Known as the "Birthplace of American Astronomy," it played a crucial role in the development of astronomical science in America.',
    shortDescription: 'America\'s oldest professional observatory',
    coordinates: {
      latitude: 39.1386,
      longitude: -84.4214,
    },
    yearBuilt: 1842,
    category: 'building',
    images: ['https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=500'],
    historicalSignificance: 'Birthplace of American Astronomy and site of many important astronomical discoveries.',
    visitingHours: 'Thu-Sat 7:30 PM - 10:30 PM',
    website: 'https://cincinnatiobservatory.org',
    address: '3489 Observatory Pl, Cincinnati, OH 45208'
  },
  {
    id: '5',
    name: 'Taft Museum of Art',
    description: 'A historic house museum and art collection housed in a beautiful 1820s Federal-style mansion. The museum contains one of the finest small art collections in America, including works by European and American masters.',
    shortDescription: '1820s mansion housing premier art collection',
    coordinates: {
      latitude: 39.1043,
      longitude: -84.5059,
    },
    yearBuilt: 1820,
    category: 'building',
    images: ['https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=500'],
    historicalSignificance: 'One of Cincinnati\'s most elegant historic homes and important cultural institution.',
    visitingHours: 'Wed-Sun 11:00 AM - 4:00 PM',
    website: 'https://taftmuseum.org',
    address: '316 Pike St, Cincinnati, OH 45202'
  },
  {
    id: '6',
    name: 'William Howard Taft National Historic Site',
    description: 'The birthplace and boyhood home of William Howard Taft, the 27th President of the United States and 10th Chief Justice. This Greek Revival house provides insight into the early life of this important American figure.',
    shortDescription: 'Birthplace of President and Chief Justice William Howard Taft',
    coordinates: {
      latitude: 39.1191,
      longitude: -84.5081,
    },
    yearBuilt: 1835,
    category: 'site',
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500'],
    historicalSignificance: 'Birthplace of the only person to serve as both President and Chief Justice of the United States.',
    visitingHours: '10:00 AM - 4:00 PM (seasonal)',
    website: 'https://www.nps.gov/wiho',
    address: '2038 Auburn Ave, Cincinnati, OH 45219'
  }
];

class LandmarksService {
  private isFirebaseAvailable(): boolean {
    try {
      if (!firestore) return false;
      firestore();
      return true;
    } catch {
      return false;
    }
  }

  // Get all landmarks
  async getLandmarks(limit: number = 50): Promise<Landmark[]> {
    if (!this.isFirebaseAvailable()) {
      // Return mock data for development
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      return CINCINNATI_LANDMARKS.slice(0, limit);
    }

    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.LANDMARKS)
        .limit(limit)
        .get();

      const landmarks = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Landmark[];

      return landmarks;
    } catch (error) {
      console.error('Error fetching landmarks:', error);
      // Fallback to mock data
      return CINCINNATI_LANDMARKS.slice(0, limit);
    }
  }

  // Get landmarks near a location
  async getNearbyLandmarks(
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000,
    limit: number = 20
  ): Promise<Landmark[]> {
    if (!this.isFirebaseAvailable()) {
      // Filter mock data by distance
      await new Promise<void>(resolve => setTimeout(resolve, 300));

      const nearbyLandmarks = CINCINNATI_LANDMARKS.filter(landmark => {
        const distance = getDistance(
          { latitude, longitude },
          landmark.coordinates
        );
        return distance <= radiusMeters;
      }).slice(0, limit);

      return nearbyLandmarks;
    }

    try {
      // Get all landmarks and filter client-side
      // For production, use geohashing or Firebase GeoFire
      const allLandmarks = await this.getLandmarks(100);

      const nearbyLandmarks = allLandmarks.filter(landmark => {
        const distance = getDistance(
          { latitude, longitude },
          landmark.coordinates
        );
        return distance <= radiusMeters;
      }).slice(0, limit);

      return nearbyLandmarks;
    } catch (error) {
      console.error('Error fetching nearby landmarks:', error);
      throw error;
    }
  }

  // Get a single landmark by ID
  async getLandmark(landmarkId: string): Promise<Landmark | null> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      return CINCINNATI_LANDMARKS.find(l => l.id === landmarkId) || null;
    }

    try {
      const doc = await firestore()
        .collection(COLLECTIONS.LANDMARKS)
        .doc(landmarkId)
        .get();

      if (!doc.exists) return null;

      return {
        id: doc.id,
        ...doc.data(),
      } as Landmark;
    } catch (error) {
      console.error('Error fetching landmark:', error);
      return null;
    }
  }

  // Bookmark a landmark
  async bookmarkLandmark(userId: string, landmarkId: string): Promise<void> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      console.log(`Bookmarked landmark ${landmarkId} for user ${userId}`);
      return;
    }

    try {
      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .update({
          bookmarkedLandmarks: firestore.FieldValue.arrayUnion(landmarkId),
        });
    } catch (error) {
      console.error('Error bookmarking landmark:', error);
      throw error;
    }
  }

  // Unbookmark a landmark
  async unbookmarkLandmark(userId: string, landmarkId: string): Promise<void> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      console.log(`Unbookmarked landmark ${landmarkId} for user ${userId}`);
      return;
    }

    try {
      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .update({
          bookmarkedLandmarks: firestore.FieldValue.arrayRemove(landmarkId),
        });
    } catch (error) {
      console.error('Error unbookmarking landmark:', error);
      throw error;
    }
  }

  // Get user's bookmarked landmarks
  async getBookmarkedLandmarks(userId: string): Promise<Landmark[]> {
    if (!this.isFirebaseAvailable()) {
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      // Return first 2 landmarks as mock bookmarks
      return CINCINNATI_LANDMARKS.slice(0, 2);
    }

    try {
      const userDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .get();

      const bookmarkedIds = userDoc.data()?.bookmarkedLandmarks || [];

      if (bookmarkedIds.length === 0) return [];

      const landmarks = await Promise.all(
        bookmarkedIds.map((id: string) => this.getLandmark(id))
      );

      return landmarks.filter(l => l !== null) as Landmark[];
    } catch (error) {
      console.error('Error fetching bookmarked landmarks:', error);
      return [];
    }
  }
}

export const landmarksService = new LandmarksService();
