import { useEffect } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_REFERRAL_KEY = 'pendingReferralCode';

/**
 * Extracts a referral code from a URL. Matches both HTTPS Universal Links
 * (`https://historia.app/referral/ABC123`) and the custom scheme
 * (`historia://referral/ABC123`). Returns null for anything else.
 */
export function parseReferralCode(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    // Accept either prefix; standardize by stripping scheme + host.
    const match =
      url.match(/referral\/([A-Za-z0-9]+)/) ??
      url.match(/[?&]referral_code=([A-Za-z0-9]+)/);
    return match ? match[1].toUpperCase() : null;
  } catch {
    return null;
  }
}

async function captureFromUrl(url: string | null | undefined): Promise<void> {
  const code = parseReferralCode(url);
  if (!code) return;
  try {
    // Don't clobber an existing pending code the user may have manually entered
    const existing = await AsyncStorage.getItem(PENDING_REFERRAL_KEY);
    if (existing) return;
    await AsyncStorage.setItem(PENDING_REFERRAL_KEY, code);
  } catch {
    // Silent — this is best-effort plumbing.
  }
}

/**
 * Listens for inbound referral links via React Native's Linking API and stores
 * the code in AsyncStorage so SignUpScreen / useAuth can apply it after a new
 * account is created. Replaces the previous Branch-based listener.
 *
 * Known gap: this does NOT handle deferred deep linking. A user who taps a
 * referral link BEFORE installing the app won't have the code auto-applied —
 * they must enter it manually on SignUpScreen. Deferred deep linking requires
 * a paid service (Branch, Firebase Dynamic Links before it was sunset, etc).
 */
export const useReferralLinkListener = (): void => {
  useEffect(() => {
    // Cold start: was the app opened via a referral URL?
    Linking.getInitialURL()
      .then(url => captureFromUrl(url))
      .catch(() => {});

    // Warm state: subsequent taps while the app is running.
    const subscription = Linking.addEventListener('url', event => {
      captureFromUrl(event.url);
    });

    return () => subscription.remove();
  }, []);
};
