import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { Text } from './Text';
import { Landmark } from '../../types';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useLandmarks, useVisits, useSubscription, useOfflineMaps } from '../../hooks';
import { landmarksService } from '../../services/landmarksService';
import { openDirections } from '../../utils';
import LandmarkDetailSheet from './LandmarkDetailSheet';

interface LandmarkModalProps {
  landmark: Landmark | null;
  visible: boolean;
  onClose: () => void;
}

const FREE_BOOKMARK_LIMIT = 10;

export const LandmarkModal: React.FC<LandmarkModalProps> = ({
  landmark,
  visible,
  onClose,
}) => {
  const { user, updateUser } = useAuthStore();
  const userId = user?.id ?? '';

  const { bookmarkLandmark, unbookmarkLandmark } = useLandmarks(userId, false);
  const { createVisit, hasVisited: checkVisited, verifyLocation } = useVisits(userId, false);
  const { isPremium, requirePremium } = useSubscription();
  const { downloadLandmark, isDownloading, isLandmarkSaved, downloadProgress } = useOfflineMaps();

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);

  useEffect(() => {
    if (!landmark || !visible || !userId) return;
    landmarksService.isLandmarkBookmarked(userId, landmark.id).then(setIsBookmarked).catch(() => {});
    checkVisited(landmark.id).then(setHasVisited).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landmark?.id, visible]);

  const handleBookmark = useCallback(async () => {
    if (!landmark || !userId) return;

    if (isBookmarked) {
      try {
        await unbookmarkLandmark(landmark.id);
        setIsBookmarked(false);
        updateUser({ bookmarkCount: Math.max(0, (user?.bookmarkCount ?? 1) - 1) });
      } catch (err) {
        console.error('Error removing bookmark:', err);
      }
      return;
    }

    if (!isPremium && (user?.bookmarkCount ?? 0) >= FREE_BOOKMARK_LIMIT) {
      requirePremium('UNLIMITED_BOOKMARKS', () => {});
      return;
    }

    try {
      await bookmarkLandmark(landmark.id);
      setIsBookmarked(true);
      updateUser({ bookmarkCount: (user?.bookmarkCount ?? 0) + 1 });
    } catch (err) {
      console.error('Error bookmarking:', err);
    }
  }, [landmark, userId, isBookmarked, bookmarkLandmark, unbookmarkLandmark, isPremium, requirePremium, user, updateUser]);

  const handleVisit = useCallback(async () => {
    if (!landmark) return;
    Geolocation.getCurrentPosition(
      async position => {
        const userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const inRange = verifyLocation(userLocation, landmark.coordinates);
        if (!inRange) {
          Alert.alert('Too Far Away', 'You must be within 100 meters of the landmark to check in.');
          return;
        }
        await createVisit(landmark.id, userLocation);
        setHasVisited(true);
        Alert.alert('Success!', 'You have checked in at this landmark!');
      },
      err => {
        console.error('Location error:', err);
        Alert.alert('Location Error', 'Unable to get your current location.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }, [landmark, createVisit, verifyLocation]);

  const handleDirections = useCallback(() => {
    if (!landmark) return;
    const { latitude, longitude } = landmark.coordinates;
    openDirections(latitude, longitude, landmark.name);
  }, [landmark]);

  const handleSaveOffline = useCallback(() => {
    if (!landmark) return;
    requirePremium('OFFLINE_MAPS', () => {
      if (isDownloading) return;
      if (isLandmarkSaved(landmark.id)) {
        Alert.alert('Already Saved', 'This area is already saved for offline use.');
        return;
      }
      Alert.alert(
        'Save for Offline',
        `Download the map area around ${landmark.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Download', onPress: () => downloadLandmark(landmark) },
        ],
      );
    });
  }, [landmark, requirePremium, isDownloading, isLandmarkSaved, downloadLandmark]);

  if (!landmark) return null;

  const isOfflineSaved = isLandmarkSaved(landmark.id);
  const offlineProgress = isDownloading ? downloadProgress : undefined;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Icon name="xmark" size={18} color={theme.colors.gray[600]} />
          </TouchableOpacity>
          <Text variant="h3" style={styles.headerTitle} numberOfLines={1}>
            {landmark.name}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <LandmarkDetailSheet
          landmark={landmark}
          isBookmarked={isBookmarked}
          hasVisited={hasVisited}
          onBookmark={handleBookmark}
          onVisit={handleVisit}
          onDirections={handleDirections}
          onSaveOffline={handleSaveOffline}
          isOfflineSaved={isOfflineSaved}
          offlineDownloadProgress={offlineProgress}
          standalone
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: theme.spacing.md,
  },
  headerSpacer: {
    width: 36,
  },
});
