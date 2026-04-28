import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import LandmarkDetailSheet from '../components/ui/LandmarkDetailSheet';
import { ActionSheet, Text } from '../components/ui';
import { theme } from '../constants/theme';
import { Landmark, RootStackScreenProps } from '../types';
import { landmarksService } from '../services';
import {
  useLandmarks,
  useOfflineMaps,
  useShareLandmark,
  useSubscription,
  useVisits,
  useRequireAuth,
} from '../hooks';
import { useAuthStore } from '../store/authStore';
import { openDirections } from '../utils';
import Icon from 'react-native-vector-icons/FontAwesome6';

const FREE_BOOKMARK_LIMIT = 10;

export const LandmarkDetailScreen = () => {
  const navigation =
    useNavigation<RootStackScreenProps<'LandmarkDetail'>['navigation']>();
  const route = useRoute<RootStackScreenProps<'LandmarkDetail'>['route']>();
  const { landmarkId } = route.params;

  const { user, updateUser } = useAuthStore();
  const userId = user?.id ?? '';

  const [landmark, setLandmark] = useState<Landmark | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  const { bookmarkLandmark, unbookmarkLandmark } = useLandmarks(userId, false);
  const { createVisit, hasVisited: checkVisited, verifyLocation } = useVisits(
    userId,
    false,
  );
  const { isPremium, requirePremium } = useSubscription();
  const requireAuth = useRequireAuth();
  const {
    downloadLandmark,
    isDownloading,
    downloadProgress,
    isLandmarkSaved,
  } = useOfflineMaps();

  // Load landmark + related state once.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const lm = await landmarksService.getLandmark(landmarkId);
        if (cancelled) return;
        if (!lm) {
          setLoadError('Landmark not found.');
          setLoading(false);
          return;
        }
        setLandmark(lm);

        if (userId) {
          const [bookmarkedIds, visited] = await Promise.all([
            landmarksService.getBookmarkedLandmarkIds(userId),
            checkVisited(lm.id),
          ]);
          if (cancelled) return;
          setBookmarkCount(bookmarkedIds.length);
          setIsBookmarked(bookmarkedIds.includes(lm.id));
          setHasVisited(visited);
        }
      } catch (err) {
        console.error('LandmarkDetailScreen load error:', err);
        if (!cancelled) setLoadError('Could not load landmark. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [landmarkId, userId, checkVisited]);

  // Navigation header: close button
  useEffect(() => {
    navigation.setOptions({
      title: landmark?.name ?? 'Landmark',
      headerBackTitle: 'Back',
    });
  }, [navigation, landmark?.name]);

  const handleBookmark = useCallback(async () => {
    if (!landmark) return;
    if (!requireAuth()) return;
    if (isBookmarked) {
      try {
        await unbookmarkLandmark(landmark.id);
        setIsBookmarked(false);
        setBookmarkCount(c => Math.max(0, c - 1));
        updateUser({ bookmarkCount: Math.max(0, (user?.bookmarkCount ?? 1) - 1) });
      } catch (err) {
        console.error('Error removing bookmark:', err);
      }
      return;
    }
    if (!isPremium && bookmarkCount >= FREE_BOOKMARK_LIMIT) {
      requirePremium('UNLIMITED_BOOKMARKS', () => {});
      return;
    }
    try {
      await bookmarkLandmark(landmark.id);
      setIsBookmarked(true);
      setBookmarkCount(c => c + 1);
      updateUser({ bookmarkCount: (user?.bookmarkCount ?? 0) + 1 });
    } catch (err) {
      console.error('Error bookmarking landmark:', err);
    }
  }, [
    landmark,
    isBookmarked,
    bookmarkLandmark,
    unbookmarkLandmark,
    bookmarkCount,
    isPremium,
    requirePremium,
    user,
    updateUser,
    requireAuth,
  ]);

  const handleVisit = useCallback(() => {
    if (!landmark) return;
    if (!requireAuth()) return;
    Geolocation.getCurrentPosition(
      async position => {
        const here = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const inRange = verifyLocation(here, landmark.coordinates);
        if (!inRange) {
          Alert.alert('Too Far Away', 'You must be within 100 meters of the landmark to check in.');
          return;
        }
        await createVisit(landmark.id, here);
        setHasVisited(true);
        Alert.alert('Success!', 'You have checked in at this landmark!');
      },
      err => {
        console.error('Location error:', err);
        Alert.alert('Location Error', 'Unable to get your current location.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }, [landmark, createVisit, verifyLocation, requireAuth]);

  const handleDirections = useCallback(() => {
    if (!landmark) return;
    const { latitude, longitude } = landmark.coordinates;
    openDirections(latitude, longitude, landmark.name);
  }, [landmark]);

  const handleSaveOffline = useCallback(() => {
    if (!landmark) return;
    if (!requireAuth()) return;
    requirePremium('OFFLINE_MAPS', () => {
      if (isDownloading) return;
      if (isLandmarkSaved(landmark.id)) {
        Alert.alert('Already Saved', 'This area is already saved for offline use.');
        return;
      }
      Alert.alert(
        'Save for Offline',
        `Download the map area around ${landmark.name}? This saves roughly a 5 km radius.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Download', onPress: () => downloadLandmark(landmark) },
        ],
      );
    });
  }, [landmark, requirePremium, isDownloading, isLandmarkSaved, downloadLandmark, requireAuth]);

  const {
    isActionSheetVisible: shareSheetVisible,
    openShareSheet,
    closeShareSheet,
    handleSendViaHistoria,
    handleShareLink,
  } = useShareLandmark(landmark);

  const offlineSaved = landmark ? isLandmarkSaved(landmark.id) : false;
  const offlineProgress =
    downloadProgress != null && downloadProgress.landmarkId === landmark?.id
      ? downloadProgress.percentage
      : undefined;

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </SafeAreaView>
    );
  }

  if (loadError || !landmark) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <Icon name="triangle-exclamation" size={32} color={theme.colors.gray[400]} />
        <Text variant="body" color="gray.600" style={styles.errorText}>
          {loadError ?? 'Landmark unavailable.'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text variant="label" color="primary.600">
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LandmarkDetailSheet
        landmark={landmark}
        isBookmarked={isBookmarked}
        hasVisited={hasVisited}
        onBookmark={handleBookmark}
        onVisit={handleVisit}
        onDirections={handleDirections}
        onSaveOffline={handleSaveOffline}
        onShare={openShareSheet}
        onAskBede={() => {
          if (!requireAuth()) return;
          navigation.navigate('AskBede', {
            landmarkId: landmark.id,
            landmarkName: landmark.name,
          });
        }}
        onLandmarkUpdated={setLandmark}
        isOfflineSaved={offlineSaved}
        offlineDownloadProgress={offlineProgress}
        standalone
      />

      <ActionSheet
        visible={shareSheetVisible}
        onClose={closeShareSheet}
        title={landmark.name}
        options={[
          {
            label: 'Send via Historia',
            icon: 'paper-plane',
            onPress: handleSendViaHistoria,
          },
          {
            label: 'Share link…',
            icon: 'share-nodes',
            onPress: handleShareLink,
          },
        ]}
      />
    </SafeAreaView>
  );
};

export default LandmarkDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  centered: {
    flex: 1,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  errorText: {
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
  },
});
