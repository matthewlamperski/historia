import { useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

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
    displayName: string
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
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    fetchUserProfile,
  } = useAuthStore();

  const { initialize: initSubscription, teardown: teardownSubscription } = useSubscriptionStore();

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
        setUser(userProfile);

        // Initialize subscription store for this user
        initSubscription(firebaseUser.uid);
      } else {
        // User is signed out — tear down IAP listeners
        teardownSubscription();
        setUser(null);
        setAuthUser(null);
      }

      setInitialized(true);
      setLoading(false);
    },
    [fetchUserProfile, setUser, setAuthUser, setInitialized, setLoading, initSubscription, teardownSubscription]
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
