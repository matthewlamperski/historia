import { useAuthStore } from '../store/authStore';
import { useAnonymousHometown, AnonymousHometown } from './useAnonymousHometown';

export type EffectiveHometown = AnonymousHometown;

/**
 * Returns the hometown the app should use for the current session.
 * Signed-in user's Firestore hometown wins; otherwise falls back to the
 * anonymous hometown saved in AsyncStorage; null if neither exists.
 */
export const useEffectiveHometown = (): EffectiveHometown | null => {
  const userHometown = useAuthStore(s => s.user?.hometown) ?? null;
  const { hometown: anonHometown } = useAnonymousHometown();
  return userHometown ?? anonHometown;
};
