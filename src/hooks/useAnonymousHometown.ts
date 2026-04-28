import { useEffect } from 'react';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Same shape as User.hometown — kept in sync deliberately so we can write
// straight to Firestore at signup time.
export interface AnonymousHometown {
  latitude: number;
  longitude: number;
  city: string;
}

const STORAGE_KEY = 'anonymousHometown';

// Standalone helpers for use outside component lifecycles
// (signup migration in useAuth, etc.)
export const getStoredAnonymousHometown = async (): Promise<AnonymousHometown | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AnonymousHometown;
  } catch {
    return null;
  }
};

export const setStoredAnonymousHometown = (hometown: AnonymousHometown): Promise<void> =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(hometown));

export const clearStoredAnonymousHometown = (): Promise<void> =>
  AsyncStorage.removeItem(STORAGE_KEY);

interface AnonymousHometownState {
  hometown: AnonymousHometown | null;
  loaded: boolean;
  load: () => Promise<void>;
  setHometown: (h: AnonymousHometown) => Promise<void>;
  clearHometown: () => Promise<void>;
}

export const useAnonymousHometownStore = create<AnonymousHometownState>(set => ({
  hometown: null,
  loaded: false,
  load: async () => {
    const stored = await getStoredAnonymousHometown();
    set({ hometown: stored, loaded: true });
  },
  setHometown: async next => {
    await setStoredAnonymousHometown(next);
    set({ hometown: next });
  },
  clearHometown: async () => {
    await clearStoredAnonymousHometown();
    set({ hometown: null });
  },
}));

/**
 * React hook bound to the global anonymous-hometown store. Triggers an
 * AsyncStorage load on first mount; subsequent renders read from Zustand.
 */
export const useAnonymousHometown = () => {
  const hometown = useAnonymousHometownStore(s => s.hometown);
  const loaded = useAnonymousHometownStore(s => s.loaded);
  const load = useAnonymousHometownStore(s => s.load);
  const setHometown = useAnonymousHometownStore(s => s.setHometown);
  const clearHometown = useAnonymousHometownStore(s => s.clearHometown);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  return { hometown, setHometown, clearHometown, loaded };
};
