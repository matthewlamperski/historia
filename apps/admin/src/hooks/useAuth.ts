import { useState, useEffect } from 'react';
import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

// Per docs/POINTS_ADMIN_WEBAPP_SPEC.md §3, admin status is determined by
// presence of an `admins/{uid}` Firestore document. The doc body is
// ignored — its existence is the allow-list. The signed-in user's UID
// must match a doc in that collection regardless of how they signed in
// (email/password OR Google OAuth).
async function checkAdminAllowList(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch (err) {
    console.error('Failed to check admin allow-list:', err);
    return false;
  }
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
        const isAdmin = await checkAdminAllowList(user.uid);
        setState({ user, isAdmin, isLoading: false, error: null });
      } else {
        setState({ user: null, isAdmin: false, isLoading: false, error: null });
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await assertAdminOrSignOut(cred.user.uid, setState);
    } catch (error: unknown) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
      }));
    }
  };

  const signInWithGoogle = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await assertAdminOrSignOut(cred.user.uid, setState);
    } catch (error: unknown) {
      // Common cases worth surfacing nicely:
      //   auth/popup-closed-by-user — user dismissed the OAuth popup
      //   auth/cancelled-popup-request — user clicked twice
      //   auth/popup-blocked — browser popup blocker
      const code = (error as { code?: string })?.code;
      let message = error instanceof Error ? error.message : 'Sign in failed';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        message = 'Sign-in cancelled.';
      } else if (code === 'auth/popup-blocked') {
        message = 'Popup blocked. Allow popups for this site and try again.';
      }
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  };

  const signOut = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await firebaseSignOut(auth);
      setState({ user: null, isAdmin: false, isLoading: false, error: null });
    } catch (error: unknown) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
      }));
    }
  };

  return { ...state, signIn, signInWithGoogle, signOut };
}

async function assertAdminOrSignOut(
  uid: string,
  setState: React.Dispatch<React.SetStateAction<AuthState>>
) {
  const isAdmin = await checkAdminAllowList(uid);
  if (!isAdmin) {
    await firebaseSignOut(auth);
    setState({
      user: null,
      isAdmin: false,
      isLoading: false,
      error: 'Access denied. Your account is not on the admin allow-list.',
    });
    return;
  }
  // Auth state listener will set user/isAdmin on next tick; clear loading.
  setState((prev) => ({ ...prev, isLoading: false, error: null }));
}
