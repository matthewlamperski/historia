import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: user =>
    set(() => ({
      user,
      isAuthenticated: true,
      isLoading: false,
    })),

  logout: () =>
    set(() => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })),

  updateUser: updates =>
    set(state => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
}));
