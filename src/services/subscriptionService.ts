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

  /**
   * Source-of-truth check for whether a user has active premium access.
   *
   * Lenient by design: trusts the `status` field as the primary signal, and
   * uses dates only to definitively revoke access when both dates exist and
   * are in the past. The lifecycle webhooks (Apple ASSN v2 / Google RTDN)
   * are responsible for flipping `status` on real cancellation / expiry /
   * refund events — once those are firing, the date checks here are the
   * safety net, not the primary mechanism.
   *
   * Why lenient: existing TestFlight subscribers have Firestore docs with
   * fabricated 14-day trial dates from old code. Strict date enforcement
   * would silently revoke their access on next app open. We respect the
   * status field for them and let webhooks correct over time.
   *
   * Entitlement paths (any one is sufficient):
   *   1. status: 'active' AND (no end-date OR end-date+24h is still future)
   *   2. status: 'trial'  (lenient — old docs without subscriptionEndDate stay premium)
   *   3. gracePeriodExpiresDate is in the future
   *   4. referralBonusExpiry is in the future
   *
   * Only definitively-expired (status: 'expired' / 'cancelled' / 'free') or
   * a clearly past `subscriptionEndDate` returns false.
   */
  isPremiumActive(record: SubscriptionRecord | null): boolean {
    if (!record) return false;
    const now = new Date();

    if (record.status === 'active') {
      if (!record.subscriptionEndDate) return true;
      const end = new Date(record.subscriptionEndDate).getTime();
      // 24h grace beyond end date covers webhook latency / minor sync delays.
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      if (end + ONE_DAY_MS > now.getTime()) return true;
      // Past end date — only restore access if explicit grace period is set.
      if (record.gracePeriodExpiresDate && new Date(record.gracePeriodExpiresDate) > now) {
        return true;
      }
      return false;
    }

    if (record.status === 'trial') {
      // Lenient: old docs may have stale trialEndDate from the 14-day fallback.
      // Only revoke if BOTH the trial AND subscription end-dates are clearly past.
      if (record.trialEndDate && record.subscriptionEndDate) {
        const trialEnd = new Date(record.trialEndDate).getTime();
        const subEnd = new Date(record.subscriptionEndDate).getTime();
        if (trialEnd <= now.getTime() && subEnd <= now.getTime()) return false;
      }
      return true;
    }

    if (record.gracePeriodExpiresDate && new Date(record.gracePeriodExpiresDate) > now) {
      return true;
    }

    if (record.referralBonusExpiry && new Date(record.referralBonusExpiry) > now) {
      return true;
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

  /**
   * Returns true if the record's status implies premium access but the
   * relevant end-date has already passed — caller should flip status to
   * 'expired' in Firestore so future reads stop granting access.
   */
  isStaleEntitlement(record: SubscriptionRecord | null): boolean {
    if (!record) return false;
    const now = new Date();
    if (record.status === 'active' && record.subscriptionEndDate) {
      if (new Date(record.subscriptionEndDate) <= now) {
        // Exception: still within grace window
        if (record.gracePeriodExpiresDate && new Date(record.gracePeriodExpiresDate) > now) {
          return false;
        }
        return true;
      }
    }
    if (record.status === 'trial' && record.trialEndDate) {
      if (new Date(record.trialEndDate) <= now) return true;
    }
    return false;
  },

  computeTier(record: SubscriptionRecord | null): SubscriptionTier {
    return subscriptionService.isPremiumActive(record) ? 'premium' : 'free';
  },
};
