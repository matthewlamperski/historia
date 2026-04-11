import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './firebaseConfig';

export interface JournalEntry {
  landmarkId: string;
  landmarkName: string;
  entry: string;
  updatedAt: string;
}

// Stored at users/{userId}/journal/{landmarkId}
class JournalService {
  async getEntry(userId: string, landmarkId: string): Promise<string | null> {
    try {
      const doc = await firestore()
        .collection(COLLECTIONS.USERS).doc(userId)
        .collection(COLLECTIONS.JOURNAL).doc(landmarkId)
        .get();
      return doc.data()?.entry ?? null;
    } catch (error) {
      console.error('Error fetching journal entry:', error);
      return null;
    }
  }

  async saveEntry(
    userId: string,
    landmarkId: string,
    landmarkName: string,
    entry: string
  ): Promise<void> {
    try {
      await firestore()
        .collection(COLLECTIONS.USERS).doc(userId)
        .collection(COLLECTIONS.JOURNAL).doc(landmarkId)
        .set({ landmarkId, landmarkName, entry, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Error saving journal entry:', error);
      throw error;
    }
  }

  // Get all journal entries for a user (for a future "My Journal" screen)
  async getAllEntries(userId: string): Promise<JournalEntry[]> {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.USERS).doc(userId)
        .collection(COLLECTIONS.JOURNAL)
        .orderBy('updatedAt', 'desc')
        .get();
      return snapshot.docs.map((doc: any) => doc.data() as JournalEntry);
    } catch (error) {
      console.error('Error fetching all journal entries:', error);
      return [];
    }
  }
}

export const journalService = new JournalService();
