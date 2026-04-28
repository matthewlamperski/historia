import { create } from 'zustand';
import { User, AuthUser } from '../types';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { Platform } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../services/firebaseConfig';
import { handleService } from '../services/handleService';
import { referralService } from '../services/referralService';

// Configure Google Sign-In
// Note: webClientId is required for Firebase Auth - get it from Firebase Console > Authentication > Google
GoogleSignin.configure({
  iosClientId: '135408828364-e39age8ot711653iqhhocbg36gg2qk0b.apps.googleusercontent.com',
});

interface AuthState {
  user: User | null;
  authUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  /**
   * True while signUpWithEmail / signInWithGoogle / signInWithApple are
   * actively creating-or-fetching the user profile. The auth-state listener
   * uses this to avoid racing those flows with its own writes.
   */
  profileCreationInProgress: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setAuthUser: (authUser: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setProfileCreationInProgress: (v: boolean) => void;
  setError: (error: string | null) => void;
  updateUser: (updates: Partial<User>) => void;

  // Auth operations
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
  fetchUserProfile: (userId: string) => Promise<User | null>;
  createUserProfile: (
    userId: string,
    email: string,
    displayName: string,
    photoURL?: string,
    handle?: string
  ) => Promise<User>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  authUser: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  profileCreationInProgress: false,
  error: null,

  setUser: user =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  setAuthUser: authUser => set({ authUser }),

  setLoading: isLoading => set({ isLoading }),

  setInitialized: isInitialized => set({ isInitialized }),

  setProfileCreationInProgress: v => set({ profileCreationInProgress: v }),

  setError: error => set({ error }),

  updateUser: updates =>
    set(state => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),

  // Sign in with email and password
  signInWithEmail: async (email, password) => {
    set({ isLoading: true, error: null, profileCreationInProgress: true });
    try {
      const userCredential = await auth().signInWithEmailAndPassword(
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // Fetch user profile from Firestore
      const userProfile = await get().fetchUserProfile(firebaseUser.uid);

      set({
        authUser: {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
          emailVerified: firebaseUser.emailVerified,
          providerId: 'password',
        },
        user: userProfile,
        isAuthenticated: !!userProfile,
        isLoading: false,
      });
    } catch (error: any) {
      let errorMessage = 'Sign in failed';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later';
      }
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    } finally {
      set({ profileCreationInProgress: false });
    }
  },

  // Sign up with email and password
  signUpWithEmail: async (email, password, displayName, handle) => {
    set({ isLoading: true, error: null, profileCreationInProgress: true });
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // Update display name in Firebase Auth
      await firebaseUser.updateProfile({ displayName });

      // Create user profile in Firestore
      const userProfile = await get().createUserProfile(
        firebaseUser.uid,
        email,
        displayName,
        undefined,
        handle
      );

      set({
        authUser: {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName,
          photoURL: undefined,
          emailVerified: firebaseUser.emailVerified,
          providerId: 'password',
        },
        user: userProfile,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      let errorMessage = 'Sign up failed';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account already exists with this email';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    } finally {
      set({ profileCreationInProgress: false });
    }
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    set({ isLoading: true, error: null, profileCreationInProgress: true });
    try {
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Get user ID token
      const signInResult = await GoogleSignin.signIn();

      // Create Google credential
      const googleCredential = auth.GoogleAuthProvider.credential(
        signInResult.data?.idToken
      );

      // Sign in with credential
      const userCredential = await auth().signInWithCredential(googleCredential);
      const firebaseUser = userCredential.user;

      // Check if user profile exists, create if not
      let userProfile = await get().fetchUserProfile(firebaseUser.uid);
      if (!userProfile) {
        userProfile = await get().createUserProfile(
          firebaseUser.uid,
          firebaseUser.email || '',
          firebaseUser.displayName || 'User',
          firebaseUser.photoURL || undefined
        );
      }

      set({
        authUser: {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
          emailVerified: firebaseUser.emailVerified,
          providerId: 'google.com',
        },
        user: userProfile,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Google sign in error:', error);
      let errorMessage = 'Google sign in failed';
      if (error.code === 'SIGN_IN_CANCELLED') {
        errorMessage = 'Sign in was cancelled';
      }
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    } finally {
      set({ profileCreationInProgress: false });
    }
  },

  // Sign in with Apple
  signInWithApple: async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In is only available on iOS');
    }

    set({ isLoading: true, error: null, profileCreationInProgress: true });
    try {
      // Perform Apple Sign In request
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      // Check credential state
      const credentialState = await appleAuth.getCredentialStateForUser(
        appleAuthRequestResponse.user
      );

      if (credentialState !== appleAuth.State.AUTHORIZED) {
        throw new Error('Apple Sign In authorization failed');
      }

      // Create Apple credential
      const { identityToken, nonce } = appleAuthRequestResponse;
      const appleCredential = auth.AppleAuthProvider.credential(
        identityToken!,
        nonce
      );

      // Sign in with credential
      const userCredential = await auth().signInWithCredential(appleCredential);
      const firebaseUser = userCredential.user;

      // Get display name from Apple response or Firebase
      const displayName =
        appleAuthRequestResponse.fullName?.givenName &&
        appleAuthRequestResponse.fullName?.familyName
          ? `${appleAuthRequestResponse.fullName.givenName} ${appleAuthRequestResponse.fullName.familyName}`
          : firebaseUser.displayName || 'User';

      // Check if user profile exists, create if not
      let userProfile = await get().fetchUserProfile(firebaseUser.uid);
      if (!userProfile) {
        userProfile = await get().createUserProfile(
          firebaseUser.uid,
          firebaseUser.email || appleAuthRequestResponse.email || '',
          displayName,
          firebaseUser.photoURL || undefined
        );
      }

      set({
        authUser: {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName,
          photoURL: firebaseUser.photoURL || undefined,
          emailVerified: firebaseUser.emailVerified,
          providerId: 'apple.com',
        },
        user: userProfile,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Apple sign in error:', error);
      let errorMessage = 'Apple sign in failed';
      if (error.code === appleAuth.Error.CANCELED) {
        errorMessage = 'Sign in was cancelled';
      }
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    } finally {
      set({ profileCreationInProgress: false });
    }
  },

  // Sign out
  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      // Sign out from Google if signed in with Google
      const currentUser = auth().currentUser;
      if (currentUser) {
        const providers = currentUser.providerData.map(p => p.providerId);
        if (providers.includes('google.com')) {
          await GoogleSignin.signOut();
        }
      }

      await auth().signOut();

      set({
        user: null,
        authUser: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      set({ error: 'Sign out failed', isLoading: false });
      throw new Error('Sign out failed');
    }
  },

  // Reset password
  resetPassword: async email => {
    set({ isLoading: true, error: null });
    try {
      await auth().sendPasswordResetEmail(email);
      set({ isLoading: false });
    } catch (error: any) {
      let errorMessage = 'Password reset failed';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  // Fetch user profile from Firestore
  fetchUserProfile: async userId => {
    try {
      const userDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .get();

      if (userDoc.exists) {
        const data = userDoc.data();
        return {
          id: userId,
          ...data,
        } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },

  // Create user profile in Firestore
  createUserProfile: async (userId, email, displayName, photoURL, handle) => {
    const now = new Date().toISOString();

    // Generate a unique referral code for this user
    const referralCode = await referralService.createReferralCodeForUser(userId);

    // Defense-in-depth: never persist an empty `name`. Callers should pass
    // the entered display name, but if they don't (e.g. an Apple sign-in
    // that skipped sharing the user's name), fall back to the email prefix
    // so the profile never reads as "Anonymous".
    const safeName =
      displayName?.trim() || email?.split('@')[0]?.trim() || 'Explorer';

    const newUser: Omit<User, 'id'> = {
      name: safeName,
      email,
      username: handle,
      avatar: photoURL,
      bio: undefined,
      location: undefined,
      website: undefined,
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
      isVerified: false,
      companions: [],
      bookmarkCount: 0,
      isPremium: false as boolean,
      pointsBalance: 0,
      subscriptionStatus: 'free' as const,
      referralCode,
      createdAt: now,
      updatedAt: now,
    };

    await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .set(newUser);

    // Reserve the handle in the uniqueness registry
    if (handle) {
      await handleService.reserveHandle(handle, userId);
    }

    return {
      id: userId,
      ...newUser,
    };
  },
}));
