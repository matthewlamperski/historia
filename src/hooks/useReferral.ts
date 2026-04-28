import { useState, useEffect, useCallback } from 'react';
import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { referralService } from '../services/referralService';
import { useAuthStore } from '../store/authStore';
import { useToast } from './useToast';
import { usePointsConfig } from '../context/PointsConfigContext';
import { useSubscription } from './useSubscription';

const PENDING_REFERRAL_KEY = 'pendingReferralCode';

export interface UseReferralReturn {
  referralCode: string | null;
  referralCount: number;
  isSharing: boolean;
  shareReferralLink: () => Promise<void>;
  applyPendingReferral: (newUserId: string) => Promise<boolean>;
  setPendingReferralCode: (code: string) => Promise<void>;
}

export const useReferral = (): UseReferralReturn => {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const { config: pointsConfig } = usePointsConfig();
  const { isPremium } = useSubscription();
  const [referralCount, setReferralCount] = useState(0);
  const [isSharing, setIsSharing] = useState(false);

  const referralCode = user?.referralCode ?? null;

  useEffect(() => {
    if (!user?.id) return;
    referralService
      .getReferralCount(user.id)
      .then(setReferralCount)
      .catch(() => {});
  }, [user?.id]);

  // Opens the native share sheet with a plain Universal Link. The link is
  // intercepted by the iOS / Android App Links config and routed back into the
  // app if the recipient has it installed. No external SDK, no MAU caps.
  const shareReferralLink = useCallback(async () => {
    if (!referralCode || !user) return;
    setIsSharing(true);

    const shareUrl = `https://historia.app/referral/${referralCode}`;
    const bonus = pointsConfig?.earning.referralPoints;
    const bonusFragment = bonus ? ` and earn ${bonus} bonus points` : '';

    try {
      await Share.share({
        message: `Join me on Historia${bonusFragment}! Use my referral link: ${shareUrl}`,
        url: shareUrl,
        title: 'Join me on Historia',
      });
    } catch (error) {
      showToast('Could not open share sheet. Try again.', 'error');
      console.error('[Referral] Share error:', error);
    } finally {
      setIsSharing(false);
    }
  }, [referralCode, user, showToast, pointsConfig]);

  const setPendingReferralCode = useCallback(async (code: string) => {
    await AsyncStorage.setItem(PENDING_REFERRAL_KEY, code.trim().toUpperCase());
  }, []);

  const applyPendingReferral = useCallback(
    async (newUserId: string): Promise<boolean> => {
      try {
        const code = await AsyncStorage.getItem(PENDING_REFERRAL_KEY);
        if (!code) return false;

        const applied = await referralService.applyReferral(code, newUserId);

        if (applied) {
          const bonus = pointsConfig?.earning.referralPoints;
          let message: string;
          if (bonus && !isPremium) {
            message = `Referral applied — +${bonus} pts. Upgrade to Pro to redeem.`;
          } else if (bonus) {
            message = `Referral applied — you earned ${bonus} bonus points!`;
          } else {
            message = 'Referral applied — bonus points awarded!';
          }
          showToast(message, 'success');
          await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
          return true;
        } else {
          await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
          return false;
        }
      } catch (error) {
        console.error('Error applying pending referral:', error);
        return false;
      }
    },
    [showToast, pointsConfig, isPremium],
  );

  return {
    referralCode,
    referralCount,
    isSharing,
    shareReferralLink,
    applyPendingReferral,
    setPendingReferralCode,
  };
};
