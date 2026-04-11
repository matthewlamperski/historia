import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './firebaseConfig';

class PointsService {
  /**
   * Atomically increment a user's points balance.
   * Fire-and-forget safe: callers should `.catch(console.error)`.
   */
  async awardPoints(userId: string, amount: number, _reason: string): Promise<void> {
    await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({
        pointsBalance: firestore.FieldValue.increment(amount),
      });
  }

  /**
   * Count how many posts this user has created today (UTC day).
   * Used to enforce the 10-posts-per-day earning limit.
   */
  async getTodayPostCount(userId: string): Promise<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startTimestamp = firestore.Timestamp.fromDate(startOfToday);

    const snapshot = await firestore()
      .collection(COLLECTIONS.POSTS)
      .where('userId', '==', userId)
      .where('createdAt', '>=', startTimestamp)
      .get();

    return snapshot.size;
  }

  /**
   * Returns true if this user has posted fewer than 10 times today
   * (i.e., can still earn post points).
   */
  async canEarnPostPoints(userId: string): Promise<boolean> {
    try {
      const count = await this.getTodayPostCount(userId);
      return count < 10;
    } catch {
      // If the query fails (e.g., missing index), be permissive
      return true;
    }
  }
}

export const pointsService = new PointsService();
