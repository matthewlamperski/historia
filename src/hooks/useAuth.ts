import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../services/firebaseConfig';
import { User } from '../types';
import { useReferralLinkListener } from './useReferralLinkListener';
import { referralService } from '../services/referralService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFCMToken, clearFCMToken } from './useFCMToken';
import { getStoredAnonymousHometown } from './useAnonymousHometown';
import { userService } from '../services/userService';

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
  } = useAuthStore();

  const { initialize: initSubscription, teardown: teardownSubscription } = useSubscriptionStore();

  // Track which UIDs are brand-new (just created) so we can apply referral bonus
  const newlyCreatedUidRef = useRef<string | null>(null);

  // Capture referral codes from universal-link taps (replaces Branch).
  useReferralLinkListener();

  // Register this device's FCM token on the user doc whenever we have one.
  // Runs on login and on token refresh; cleared explicitly on sign-out below.
  useFCMToken(authUser?.id ?? null);

  // Handle auth state changes
  const handleAuthStateChanged = useCallback(
    async (firebaseUser: FirebaseAuthTypes.User | null) => {
      if (firebaseUser) {
        // If a sign-up/sign-in method is mid-flight, that method owns the
        // profile read/write. Anything we do here can race with its writes
        // and corrupt the user's name. Subscription init is the one
        // exception — kick it off and bail.
        const inProgress = useAuthStore.getState().profileCreationInProgress;
        if (inProgress) {
          initSubscription(firebaseUser.uid);
          setInitialized(true);
          setLoading(false);
          return;
        }

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
          // Sync name/avatar from Firebase Auth (important for Google/Apple users).
          // CRITICAL: only sync `photoURL` if it's a remote https URL. A local
          // file URI in Firebase Auth photoURL was the root cause of the
          // "avatar resets to a broken local path on every save" bug —
          // a corrupted Auth value would propagate to Firestore here on every
          // launch. We now also actively scrub a corrupted Firestore avatar
          // when we detect it.
          const authName = firebaseUser.displayName;
          const authPhoto = firebaseUser.photoURL;
          const isRemotePhoto =
            typeof authPhoto === 'string' &&
            (authPhoto.startsWith('https://') || authPhoto.startsWith('http://'));
          const isRemoteFirestoreAvatar =
            typeof userProfile.avatar === 'string' &&
            (userProfile.avatar.startsWith('https://') ||
              userProfile.avatar.startsWith('http://'));

          const updates: Partial<User> = {};
          // Only adopt Auth's name when it's clearly real and differs from
          // Firestore. We deliberately do NOT fall back to the email prefix
          // here — it'd permanently corrupt the doc with a synthetic name.
          if (authName && authName !== userProfile.name) {
            updates.name = authName;
          }
          // Only apply Auth's photoURL if it's a real URL.
          if (isRemotePhoto && authPhoto !== userProfile.avatar) {
            updates.avatar = authPhoto;
          }
          // Self-heal a previously-corrupted avatar field — clear it so the
          // app falls back to the default avatar instead of a broken
          // file:// reference. User can re-upload a fresh one.
          if (
            !isRemoteFirestoreAvatar &&
            typeof userProfile.avatar === 'string' &&
            userProfile.avatar.length > 0
          ) {
            updates.avatar = '';
            // Also clear it from Firebase Auth so it doesn't re-corrupt.
            firebaseUser
              .updateProfile({ photoURL: '' })
              .catch(err =>
                console.warn('[useAuth] failed to clear Auth photoURL:', err),
              );
          }

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
          // Profile missing. We DO NOT auto-create here. The auth method
          // (signUpWithEmail / signInWithGoogle / signInWithApple) owns
          // profile creation. Auto-creating here previously raced with the
          // auth method and corrupted the user's name with the email prefix.
          //
          // If profileCreationInProgress is true, the auth method will set
          // the user shortly. If it's false (e.g., a stale Firebase Auth
          // session whose Firestore doc was deleted), leave user null so
          // the app shows the signed-out state and the user re-signs-in.
          newlyCreatedUidRef.current = firebaseUser.uid;
        }

        // Record last seen timestamp (non-blocking)
        firestore()
          .collection(COLLECTIONS.USERS)
          .doc(firebaseUser.uid)
          .set({ lastSeenAt: firestore.FieldValue.serverTimestamp() }, { merge: true })
          .catch(console.error);

        // Migrate anonymous hometown → Firestore for any user who doesn't
        // yet have one. Skip while an auth method is in flight — its own
        // writes are mid-mutation and reading the store now is unreliable.
        // The migration will run on the next handleAuthStateChanged
        // invocation (e.g., next launch / token refresh).
        if (!inProgress) {
          const currentUser = useAuthStore.getState().user;
          if (currentUser && !currentUser.hometown) {
            const anonHometown = await getStoredAnonymousHometown();
            if (anonHometown) {
              try {
                await userService.updateHometown(firebaseUser.uid, anonHometown);
                useAuthStore.getState().updateUser({ hometown: anonHometown });
              } catch (err) {
                console.warn('[anon-migration] hometown write failed:', err);
              }
            }
          }
        }

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
        // User is signed out — tear down IAP listeners and drop push token
        const previousUid = useAuthStore.getState().authUser?.id;
        if (previousUid) {
          clearFCMToken(previousUid).catch(() => {});
        }
        teardownSubscription();
        setUser(null);
        setAuthUser(null);
      }

      setInitialized(true);
      setLoading(false);
    },
    [fetchUserProfile, setUser, updateUser, setAuthUser, setInitialized, setLoading, initSubscription, teardownSubscription]
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
