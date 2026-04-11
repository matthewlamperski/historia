import { useState, useEffect, useCallback } from 'react';
import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { referralService } from '../services/referralService';
import { useAuthStore } from '../store/authStore';
import { useToast } from './useToast';

// Lazy-load Branch to avoid initializing its native module at app start,
// which causes Reanimated listener errors on New Architecture (Bridgeless).
// Branch also requires native setup before it can be used — see MANUAL_SETUP_CHECKLIST.md.
function getBranch(): any | null {
  try {
    return require('react-native-branch').default;
  } catch {
    return null;
  }
}

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
  const [referralCount, setReferralCount] = useState(0);
  const [isSharing, setIsSharing] = useState(false);

  const referralCode = user?.referralCode ?? null;

  // Load referral count
  useEffect(() => {
    if (!user?.id) return;
    referralService
      .getReferralCount(user.id)
      .then(setReferralCount)
      .catch(() => {});
  }, [user?.id]);

  // Build a Branch short link and open the native share sheet.
  // If Branch isn't configured yet, falls back to a plain web URL gracefully.
  const shareReferralLink = useCallback(async () => {
    if (!referralCode || !user) return;
    setIsSharing(true);

    let shareUrl = `https://historia.app/referral/${referralCode}`;

    try {
      const branch = getBranch();
      if (branch) {
        try {
          const buo = await branch.createBranchUniversalObject(
            `referral/${referralCode}`,
            {
              title: `${user.name} invited you to Historia`,
              contentDescription:
                'Explore historical landmarks together. Use my referral and get 20 bonus points on Historia!',
              contentImageUrl: 'https://historia.app/images/og-image.png',
            }
          );

          const result = await buo.generateShortUrl(
            { feature: 'referral', campaign: 'user_referral', channel: 'share_sheet' },
            {
              referral_code: referralCode,
              referrer_name: user.name,
              $og_title: `${user.name} invited you to Historia`,
              $og_description: 'Explore historical landmarks and get 20 bonus points on Historia!',
              $desktop_url: shareUrl,
            }
          );
          shareUrl = result.url;
        } catch (branchErr) {
          // Branch not initialized / not configured — proceed with plain URL
          console.warn('[Referral] Branch unavailable, using plain URL:', branchErr);
        }
      }

      await Share.share({
        message: `Join me on Historia and earn 20 bonus points! Use my referral link: ${shareUrl}`,
        url: shareUrl,
        title: 'Join me on Historia',
      });
    } catch (error) {
      showToast('Could not open share sheet. Try again.', 'error');
      console.error('[Referral] Share error:', error);
    } finally {
      setIsSharing(false);
    }
  }, [referralCode, user, showToast]);

  // Store a pending referral code (from Branch deep link or manual entry)
  const setPendingReferralCode = useCallback(async (code: string) => {
    await AsyncStorage.setItem(PENDING_REFERRAL_KEY, code.trim().toUpperCase());
  }, []);

  // Apply any stored pending referral after a new sign-up
  const applyPendingReferral = useCallback(
    async (newUserId: string): Promise<boolean> => {
      try {
        const code = await AsyncStorage.getItem(PENDING_REFERRAL_KEY);
        if (!code) return false;

        const applied = await referralService.applyReferral(code, newUserId);

        if (applied) {
          showToast('Referral applied — you earned 20 bonus points!', 'success');
          await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
          return true;
        } else {
          // Silently remove invalid/already-used codes
          await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
          return false;
        }
      } catch (error) {
        console.error('Error applying pending referral:', error);
        return false;
      }
    },
    [showToast]
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

// Standalone helper: set up Branch deep link listener at app start.
// Call this once inside useAuth so it captures links before sign-up.
export const useBranchListener = () => {
  useEffect(() => {
    const branch = getBranch();
    if (!branch) return; // Branch not configured yet — skip

    const unsubscribe = branch.subscribe({
      onOpenComplete: ({ error, params }: { error: any; params: any }) => {
        if (error || !params) return;

        const referralCode: string | undefined = params.referral_code as string | undefined;
        const isFirstSession: boolean = params['+is_first_session'] === true;

        // Only store on first session (fresh install via Branch link)
        if (referralCode && isFirstSession) {
          AsyncStorage.setItem(PENDING_REFERRAL_KEY, referralCode.toUpperCase()).catch(
            () => {}
          );
        }
      },
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);
};
