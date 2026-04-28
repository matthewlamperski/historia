import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types';

/**
 * Guard for actions that require a signed-in user. Returns true if the user
 * is authenticated; otherwise opens the Auth modal and returns false so the
 * caller can bail out.
 *
 *   const requireAuth = useRequireAuth();
 *   const handleLike = () => {
 *     if (!requireAuth()) return;
 *     ...
 *   };
 */
export const useRequireAuth = () => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return useCallback((): boolean => {
    if (isAuthenticated) return true;
    navigation.navigate('Auth');
    return false;
  }, [isAuthenticated, navigation]);
};
