import { useCallback, useState } from 'react';
import { Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Landmark, RootStackParamList } from '../types';
import { buildLandmarkUrl } from '../utils';
import { useToast } from './useToast';
import { useRequireAuth } from './useRequireAuth';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export interface UseShareLandmarkReturn {
  isActionSheetVisible: boolean;
  openShareSheet: () => void;
  closeShareSheet: () => void;
  handleSendViaHistoria: () => void;
  handleShareLink: () => Promise<void>;
}

/**
 * Wraps the two-path "share this landmark" flow:
 *   • Send via Historia → NewConversation screen with shareLandmarkId param
 *   • Share link…       → native RN Share sheet with a universal-link URL
 *
 * Returns state for an ActionSheet the caller renders. The hook doesn't own
 * the ActionSheet component so existing modal layers (bottom sheet, etc.) can
 * decide when to unmount.
 */
export const useShareLandmark = (landmark: Landmark | null): UseShareLandmarkReturn => {
  const navigation = useNavigation<NavProp>();
  const { showToast } = useToast();
  const requireAuth = useRequireAuth();
  const [isActionSheetVisible, setVisible] = useState(false);

  const openShareSheet = useCallback(() => {
    if (!landmark) return;
    setVisible(true);
  }, [landmark]);

  const closeShareSheet = useCallback(() => setVisible(false), []);

  const handleSendViaHistoria = useCallback(() => {
    if (!landmark) return;
    // In-app send creates a conversation — anon users get prompted to sign up.
    // The native "Share link…" path remains open to anonymous users.
    if (!requireAuth()) return;
    navigation.navigate('NewConversation', { shareLandmarkId: landmark.id });
  }, [landmark, navigation, requireAuth]);

  const handleShareLink = useCallback(async () => {
    if (!landmark) return;
    const url = buildLandmarkUrl(landmark.id);
    const message = `Check out ${landmark.name} on Historia: ${url}`;
    // Wait for the ActionSheet modal to fully finish its dismiss animation
    // before presenting the native share sheet. iOS cannot present two
    // modals simultaneously — the share sheet appears and is immediately
    // killed by UIKit if we call Share.share() while the ActionSheet is
    // still dismissing.
    await new Promise<void>(resolve => setTimeout(resolve, 350));
    try {
      await Share.share({ message, url, title: landmark.name });
    } catch (err) {
      console.warn('Landmark share failed:', err);
      showToast('Could not open share sheet. Try again.', 'error');
    }
  }, [landmark, showToast]);

  return {
    isActionSheetVisible,
    openShareSheet,
    closeShareSheet,
    handleSendViaHistoria,
    handleShareLink,
  };
};
