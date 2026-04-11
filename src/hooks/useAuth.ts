import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../services/firebaseConfig';
import { User } from '../types';
import { useBranchListener } from './useReferral';
import { referralService } from '../services/referralService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UseAuthReturn {
  // State
  user: ReturnType<typeof useAuthStore>['user'];
  authUser: ReturnType<typeof useAuthStore>['authUser'];
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string,
    handle?: string
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const {
    user,
    authUser,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    setUser,
    setAuthUser,
    setLoading,
    setInitialized,
    setError,
    updateUser,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    fetchUserProfile,
    createUserProfile,
  } = useAuthStore();

  const { initialize: initSubscription, teardown: teardownSubscription } = useSubscriptionStore();

  // Track which UIDs are brand-new (just created) so we can apply referral bonus
  const newlyCreatedUidRef = useRef<string | null>(null);

  // Start Branch deep-link listener (captures referral codes from links)
  useBranchListener();

  // Handle auth state changes
  const handleAuthStateChanged = useCallback(
    async (firebaseUser: FirebaseAuthTypes.User | null) => {
      if (firebaseUser) {
        // User is signed in
        setAuthUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
          emailVerified: firebaseUser.emailVerified,
          providerId:
            firebaseUser.providerData[0]?.providerId || 'password',
        });

        // Fetch user profile from Firestore
        const userProfile = await fetchUserProfile(firebaseUser.uid);

        if (userProfile) {
          // Sync name/avatar from Firebase Auth (important for Google/Apple users)
          const authName = firebaseUser.displayName;
          const authPhoto = firebaseUser.photoURL;
          const updates: Partial<User> = {};
          if (authName && authName !== userProfile.name) { updates.name = authName; }
          if (authPhoto && authPhoto !== userProfile.avatar) { updates.avatar = authPhoto; }

          if (Object.keys(updates).length > 0) {
            firestore()
              .collection(COLLECTIONS.USERS)
              .doc(firebaseUser.uid)
              .set(updates, { merge: true })
              .catch(console.error);
            setUser({ ...userProfile, ...updates });
          } else {
            setUser(userProfile);
          }

          // Backfill referral code for accounts created before this feature was added
          if (!userProfile.referralCode) {
            referralService.createReferralCodeForUser(firebaseUser.uid)
              .then(code => {
                firestore()
                  .collection(COLLECTIONS.USERS)
                  .doc(firebaseUser.uid)
                  .update({ referralCode: code })
                  .catch(console.error);
                updateUser({ referralCode: code });
              })
              .catch(console.error);
          }
        } else {
          // Profile missing. Only create a fallback on app restart (isInitialized = false),
          // meaning the user was already logged in when the app opened.
          // During an active sign-up/sign-in flow (isInitialized = true), the individual
          // auth method owns profile creation — don't race with it.
          if (!useAuthStore.getState().isInitialized) {
            // App restart with stale auth and missing profile — create fallback
            const newProfile = await createUserProfile(
              firebaseUser.uid,
              firebaseUser.email ?? '',
              firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
              firebaseUser.photoURL ?? undefined
            );
            setUser(newProfile);
          }
          // else: active auth method (signUpWithEmail/signInWithGoogle/signInWithApple)
          // handles profile creation with the correct name — don't race with it

          // Always mark as newly created so referral code can be applied below
          newlyCreatedUidRef.current = firebaseUser.uid;
        }

        // Record last seen timestamp (non-blocking)
        firestore()
          .collection(COLLECTIONS.USERS)
          .doc(firebaseUser.uid)
          .set({ lastSeenAt: firestore.FieldValue.serverTimestamp() }, { merge: true })
          .catch(console.error);

        // Initialize subscription store for this user
        initSubscription(firebaseUser.uid);

        // Apply any pending referral code for brand-new accounts
        if (newlyCreatedUidRef.current === firebaseUser.uid) {
          newlyCreatedUidRef.current = null;
          const pendingCode = await AsyncStorage.getItem('pendingReferralCode');
          if (pendingCode) {
            referralService
              .applyReferral(pendingCode, firebaseUser.uid)
              .then(applied => {
                if (applied) {
                  AsyncStorage.removeItem('pendingReferralCode').catch(() => {});
                  // Re-initialize subscription to pick up the new referralBonusExpiry
                  initSubscription(firebaseUser.uid);
                }
              })
              .catch(() => {});
          }
        }
      } else {
        // User is signed out — tear down IAP listeners
        teardownSubscription();
        setUser(null);
        setAuthUser(null);
      }

      setInitialized(true);
      setLoading(false);
    },
    [fetchUserProfile, createUserProfile, setUser, updateUser, setAuthUser, setInitialized, setLoading, initSubscription, teardownSubscription]
  );

  // Set up auth state listener on mount
  useEffect(() => {
    setLoading(true);
    const unsubscribe = auth().onAuthStateChanged(handleAuthStateChanged);

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [handleAuthStateChanged, setLoading]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  return {
    user,
    authUser,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    clearError,
  };
};
