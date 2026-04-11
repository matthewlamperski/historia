import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/ui';
import { theme } from '../constants/theme';
import { openDirections } from '../utils';
import { RootStackScreenProps, Landmark } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useLandmarks } from '../hooks/useLandmarks';
import { useVisits } from '../hooks/useVisits';
import { useSubscription } from '../hooks';
import { useAuthStore } from '../store/authStore';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import LandmarkDetailSheet from '../components/ui/LandmarkDetailSheet';
import Geolocation from 'react-native-geolocation-service';

const FREE_BOOKMARK_LIMIT = 10;

const CATEGORY_CONFIG: Record<
  Landmark['category'],
  { icon: string; color: string; label: string }
> = {
  monument:   { icon: 'monument',   color: theme.colors.primary[500],   label: 'Monument' },
  building:   { icon: 'building',   color: theme.colors.secondary[500], label: 'Building' },
  site:       { icon: 'map-pin',    color: theme.colors.success[600],   label: 'Historic Site' },
  battlefield:{ icon: 'flag',       color: theme.colors.error[500],     label: 'Battlefield' },
  other:      { icon: 'landmark',   color: theme.colors.gray[500],      label: 'Landmark' },
};

export const BookmarksScreen = () => {
  const { user, updateUser } = useAuthStore();
  const currentUserId = user?.id ?? '';

  const { landmarks, loading, getBookmarkedLandmarks, unbookmarkLandmark } =
    useLandmarks(currentUserId, false);
  const { isPremium, showSubscriptionScreen } = useSubscription();
  const { hasVisited: checkVisited, createVisit, verifyLocation } = useVisits(currentUserId, false);

  // Bottom sheet state
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['35%', '60%'], []);
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [hasVisited, setHasVisited] = useState(false);

  useEffect(() => {
    if (currentUserId) {
      getBookmarkedLandmarks();
    }
  }, [getBookmarkedLandmarks, currentUserId]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  // Open bottom sheet for a card
  const handleCardPress = useCallback(async (landmark: Landmark) => {
    setSelectedLandmark(landmark);
    const visited = await checkVisited(landmark.id);
    setHasVisited(visited);
    bottomSheetRef.current?.expand();
  }, [checkVisited]);

  // Unbookmark from bottom sheet: remove item and refresh list
  const handleBottomSheetBookmark = useCallback(async () => {
    if (!selectedLandmark) return;
    await unbookmarkLandmark(selectedLandmark.id);
    updateUser({ bookmarkCount: Math.max(0, (user?.bookmarkCount ?? 1) - 1) });
    bottomSheetRef.current?.close();
    getBookmarkedLandmarks();
  }, [selectedLandmark, unbookmarkLandmark, user, updateUser, getBookmarkedLandmarks]);

  // Visit check-in from bottom sheet
  const handleBottomSheetVisit = useCallback(async () => {
    if (!selectedLandmark) return;
    try {
      Geolocation.getCurrentPosition(
        async (position) => {
          const userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          const isInRange = verifyLocation(userLocation, selectedLandmark.coordinates);
          if (!isInRange) {
            Alert.alert(
              'Too Far Away',
              'You must be within 100 meters of the landmark to check in.',
              [{ text: 'OK' }]
            );
            return;
          }
          await createVisit(selectedLandmark.id, userLocation);
          setHasVisited(true);
          Alert.alert('Success!', 'You have checked in at this landmark!', [{ text: 'OK' }]);
        },
        (error) => {
          console.error('Error getting location:', error);
          Alert.alert('Location Error', 'Unable to get your current location.', [{ text: 'OK' }]);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (error) {
      console.error('Error creating visit:', error);
    }
  }, [selectedLandmark, createVisit, verifyLocation]);

  // Directions from bottom sheet
  const handleBottomSheetDirections = useCallback(() => {
    if (!selectedLandmark) return;
    const { latitude, longitude } = selectedLandmark.coordinates;
    openDirections(latitude, longitude, selectedLandmark.name);
  }, [selectedLandmark]);

  // Unbookmark directly from card (without opening sheet)
  const handleUnbookmark = useCallback(
    async (landmarkId: string) => {
      await unbookmarkLandmark(landmarkId);
      updateUser({ bookmarkCount: Math.max(0, (user?.bookmarkCount ?? 1) - 1) });
      getBookmarkedLandmarks();
    },
    [unbookmarkLandmark, user, updateUser, getBookmarkedLandmarks]
  );

  const renderCard = useCallback(
    ({ item }: { item: Landmark }) => {
      const cat = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.other;
      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleCardPress(item)}
          activeOpacity={0.85}
        >
          {item.images?.[0] ? (
            <Image
              source={{ uri: item.images[0] }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <Icon name="image" size={28} color={theme.colors.gray[300]} />
            </View>
          )}

          <View style={styles.cardBody}>
            <View style={styles.cardTopRow}>
              {/* Category badge */}
              <View style={[styles.categoryBadge, { backgroundColor: cat.color + '18' }]}>
                <Icon name={cat.icon as any} size={10} color={cat.color} />
                <Text
                  variant="caption"
                  weight="semibold"
                  style={[styles.categoryLabel, { color: cat.color }]}
                >
                  {cat.label}
                </Text>
              </View>

              {/* Unbookmark button */}
              <TouchableOpacity
                onPress={() => handleUnbookmark(item.id)}
                style={styles.bookmarkBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon
                  name="bookmark"
                  size={20}
                  color={theme.colors.primary[500]}
                  solid
                />
              </TouchableOpacity>
            </View>

            <Text
              variant="label"
              weight="semibold"
              style={styles.cardName}
              numberOfLines={2}
            >
              {item.name}
            </Text>

            {item.address ? (
              <View style={styles.addressRow}>
                <Icon
                  name="location-dot"
                  size={11}
                  color={theme.colors.gray[400]}
                />
                <Text
                  variant="caption"
                  color="gray.500"
                  style={styles.addressText}
                  numberOfLines={1}
                >
                  {item.address}
                </Text>
              </View>
            ) : null}

            {item.yearBuilt ? (
              <Text variant="caption" color="gray.400" style={styles.yearText}>
                Est. {item.yearBuilt}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [handleCardPress, handleUnbookmark]
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Icon name="bookmark" size={36} color={theme.colors.gray[300]} />
      </View>
      <Text variant="h4" weight="semibold" style={styles.emptyTitle}>
        No saved landmarks
      </Text>
      <Text variant="body" color="gray.500" style={styles.emptySubtitle}>
        Tap the bookmark icon on any landmark in the map to save it here.
      </Text>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ActivityIndicator
          size="large"
          color={theme.colors.primary[500]}
          style={styles.loadingContainer}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Free-tier limit banner */}
      {!isPremium && landmarks.length >= FREE_BOOKMARK_LIMIT && (
        <TouchableOpacity
          style={styles.limitBanner}
          onPress={showSubscriptionScreen}
          activeOpacity={0.85}
        >
          <Icon name="lock" size={13} color={theme.colors.warning[700]} />
          <Text variant="caption" style={styles.limitText}>
            You've reached the 10-bookmark free limit.{' '}
            <Text variant="caption" weight="bold" style={styles.limitUpgrade}>
              Upgrade to Pro
            </Text>{' '}
            for unlimited saves.
          </Text>
        </TouchableOpacity>
      )}

      {loading && landmarks.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={landmarks}
          renderItem={renderCard}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            landmarks.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={getBookmarkedLandmarks}
              tintColor={theme.colors.primary[500]}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetHandle}
      >
        {selectedLandmark && (
          <LandmarkDetailSheet
            landmark={selectedLandmark}
            isBookmarked={true}
            hasVisited={hasVisited}
            onBookmark={handleBottomSheetBookmark}
            onVisit={handleBottomSheetVisit}
            onDirections={handleBottomSheetDirections}
            onSaveOffline={() => {}}
            isOfflineSaved={false}
          />
        )}
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },

  // ── Limit banner ────────────────────────────────────────────────────────────
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.warning[50],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.warning[100],
  },
  limitText: {
    flex: 1,
    color: theme.colors.warning[800],
    lineHeight: 18,
  },
  limitUpgrade: {
    color: theme.colors.warning[700],
  },

  // ── List ────────────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  emptyListContent: {
    flex: 1,
  },
  separator: {
    height: theme.spacing.md,
  },

  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardImagePlaceholder: {
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    padding: theme.spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  categoryLabel: {
    fontSize: theme.fontSize.xs,
  },
  bookmarkBtn: {
    padding: 4,
  },
  cardName: {
    color: theme.colors.gray[900],
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  addressText: {
    flex: 1,
  },
  yearText: {
    marginTop: 2,
  },

  // ── Empty state ─────────────────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['2xl'],
    paddingBottom: theme.spacing['3xl'],
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    color: theme.colors.gray[800],
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Bottom sheet ────────────────────────────────────────────────────────────
  bottomSheetBackground: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius['2xl'],
    borderTopRightRadius: theme.borderRadius['2xl'],
  },
  bottomSheetHandle: {
    backgroundColor: theme.colors.gray[300],
    width: 40,
  },
});
