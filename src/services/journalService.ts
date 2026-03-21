import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './firebaseConfig';

export interface JournalEntry {
  userId: string;
  landmarkId: string;
  landmarkName: string;
  entry: string;
  updatedAt: string;
}

class JournalService {
  private docId(userId: string, landmarkId: string): string {
    return `${userId}_${landmarkId}`;
  }

  async getEntry(userId: string, landmarkId: string): Promise<string | null> {
    try {
      const doc = await firestore()
        .collection(COLLECTIONS.JOURNAL)
        .doc(this.docId(userId, landmarkId))
        .get();
      const data = doc.data();
      return data?.entry ?? null;
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
        .collection(COLLECTIONS.JOURNAL)
        .doc(this.docId(userId, landmarkId))
        .set({
          userId,
          landmarkId,
          landmarkName,
          entry,
          updatedAt: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error saving journal entry:', error);
      throw error;
    }
  }
}

export const journalService = new JournalService();
