import { useState, useEffect } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAdmin: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check for admin custom claim
        const idTokenResult = await user.getIdTokenResult();
        const isAdmin = idTokenResult.claims.admin === true;

        setState({
          user,
          isAdmin,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          user: null,
          isAdmin: false,
          isLoading: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Check for admin custom claim
      const idTokenResult = await userCredential.user.getIdTokenResult();
      const isAdmin = idTokenResult.claims.admin === true;

      if (!isAdmin) {
        await firebaseSignOut(auth);
        setState({
          user: null,
          isAdmin: false,
          isLoading: false,
          error: 'Access denied. Admin privileges required.',
        });
        return;
      }

      setState({
        user: userCredential.user,
        isAdmin: true,
        isLoading: false,
        error: null,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Sign in failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  };

  const signOut = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await firebaseSignOut(auth);
      setState({
        user: null,
        isAdmin: false,
        isLoading: false,
        error: null,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Sign out failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  };

  return {
    ...state,
    signIn,
    signOut,
  };
}
