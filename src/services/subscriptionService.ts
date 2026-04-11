import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './firebaseConfig';
import { SubscriptionRecord, SubscriptionStatus, SubscriptionTier } from '../types';

const FREE_SUBSCRIPTION: Omit<SubscriptionRecord, 'userId' | 'createdAt' | 'updatedAt'> = {
  tier: 'free',
  status: 'free',
  isOnTrial: false,
  trialStartDate: null,
  trialEndDate: null,
  subscriptionStartDate: null,
  subscriptionEndDate: null,
  productId: null,
  transactionId: null,
  platform: null,
};

export const subscriptionService = {
  async getSubscription(userId: string): Promise<SubscriptionRecord | null> {
    try {
      const doc = await firestore()
        .collection(COLLECTIONS.SUBSCRIPTIONS)
        .doc(userId)
        .get();

      const data = doc.data();
      if (data) {
        return data as SubscriptionRecord;
      }
      return null;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }
  },

  async createSubscription(userId: string): Promise<SubscriptionRecord> {
    const now = new Date().toISOString();
    const record: SubscriptionRecord = {
      userId,
      ...FREE_SUBSCRIPTION,
      createdAt: now,
      updatedAt: now,
    };

    await firestore()
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .doc(userId)
      .set(record);

    return record;
  },

  async updateSubscription(
    userId: string,
    data: Partial<Omit<SubscriptionRecord, 'userId' | 'createdAt'>>
  ): Promise<void> {
    await firestore()
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .doc(userId)
      .set(
        {
          ...data,
          userId,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
  },

  async updateUserPremiumStatus(
    userId: string,
    isPremium: boolean,
    subscriptionStatus: SubscriptionStatus
  ): Promise<void> {
    await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({
        isPremium,
        subscriptionStatus,
        updatedAt: new Date().toISOString(),
      });
  },

  isPremiumActive(record: SubscriptionRecord | null): boolean {
    if (!record) {
      return false;
    }
    if (record.status === 'active' || record.status === 'trial') {
      return true;
    }
    // Referral bonus — grants premium access until expiry date
    if (record.referralBonusExpiry) {
      return new Date(record.referralBonusExpiry) > new Date();
    }
    return false;
  },

  hasActiveReferralBonus(record: SubscriptionRecord | null): boolean {
    if (!record?.referralBonusExpiry) return false;
    return new Date(record.referralBonusExpiry) > new Date();
  },

  isTrialActive(record: SubscriptionRecord | null): boolean {
    if (!record || !record.isOnTrial || !record.trialEndDate) {
      return false;
    }
    return new Date(record.trialEndDate) > new Date();
  },

  computeTier(record: SubscriptionRecord | null): SubscriptionTier {
    if (!record) {
      return 'free';
    }
    if (record.status === 'active') {
      return 'premium';
    }
    if (record.status === 'trial' && subscriptionService.isTrialActive(record)) {
      return 'premium';
    }
    return 'free';
  },
};
