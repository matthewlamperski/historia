import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './firebaseConfig';
import { Referral } from '../types';
import { pointsService } from './pointsService';

// Unambiguous alphanumeric characters (no 0/O, 1/I/L)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

class ReferralService {
  // Generate a unique referral code for a new user and save it to Firestore
  async createReferralCodeForUser(userId: string): Promise<string> {
    let code = generateCode();
    let attempts = 0;

    // Ensure uniqueness (collision is extremely unlikely with 8 chars from 32)
    while (attempts < 5) {
      const existing = await firestore()
        .collection(COLLECTIONS.USERS)
        .where('referralCode', '==', code)
        .limit(1)
        .get();

      if (existing.empty) break;
      code = generateCode();
      attempts++;
    }

    await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .set({ referralCode: code }, { merge: true });

    return code;
  }

  // Validate a referral code and return the referrer's userId, or null if invalid
  async validateCode(code: string): Promise<string | null> {
    try {
      const upperCode = code.trim().toUpperCase();
      const snapshot = await firestore()
        .collection(COLLECTIONS.USERS)
        .where('referralCode', '==', upperCode)
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      return snapshot.docs[0].id;
    } catch (error) {
      console.error('Error validating referral code:', error);
      return null;
    }
  }

  // Apply a referral — called after a new user signs up.
  // Returns true if successfully applied, false if code is invalid or already used.
  async applyReferral(code: string, newUserId: string): Promise<boolean> {
    try {
      const upperCode = code.trim().toUpperCase();

      // Validate the code
      const referrerId = await this.validateCode(upperCode);
      if (!referrerId) return false;

      // Don't let users refer themselves
      if (referrerId === newUserId) return false;

      // Check if this new user has already used a referral
      const existing = await firestore()
        .collection(COLLECTIONS.REFERRALS)
        .where('referredId', '==', newUserId)
        .where('status', '==', 'completed')
        .limit(1)
        .get();

      if (!existing.empty) return false; // Already received a referral bonus

      // Record the referral
      const now = firestore.Timestamp.now();
      await firestore().collection(COLLECTIONS.REFERRALS).add({
        referrerId,
        referredId: newUserId,
        referralCode: upperCode,
        status: 'completed',
        createdAt: now,
        completedAt: now,
      });

      // Award 20 points to both parties
      await Promise.all([
        pointsService.awardPoints(newUserId, 20, 'referral_bonus'),
        pointsService.awardPoints(referrerId, 20, 'referral_bonus'),
      ]);

      return true;
    } catch (error) {
      console.error('Error applying referral:', error);
      return false;
    }
  }

  // Get number of successful referrals made by a user
  async getReferralCount(userId: string): Promise<number> {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.REFERRALS)
        .where('referrerId', '==', userId)
        .where('status', '==', 'completed')
        .get();
      return snapshot.size;
    } catch {
      return 0;
    }
  }
}

export const referralService = new ReferralService();
