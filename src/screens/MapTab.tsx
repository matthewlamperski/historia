import React, { useMemo, useRef, useCallback, useState } from 'react';
import { View, StyleSheet, Text, Alert, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import MapView, { Marker } from 'react-native-maps';
import LocationSwitcherHeader from '../components/ui/LocationSwitcherHeader';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Landmark } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { TouchableOpacity } from 'react-native';
import { useLandmarks, useVisits, useSubscription } from '../hooks';
import Geolocation from 'react-native-geolocation-service';
import { useAuthStore } from '../store/authStore';
import LandmarkDetailSheet, { getCategoryColor } from '../components/ui/LandmarkDetailSheet';

// Cincinnati coordinates
const CINCINNATI_REGION = {
  latitude: 39.1031,
  longitude: -84.5120,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Fake historical landmarks around Cincinnati
const CINCINNATI_LANDMARKS: Landmark[] = [
  {
    id: '1',
    name: 'Cincinnati Museum Center at Union Terminal',
    description: 'A magnificent Art Deco train station built in 1933, now serving as a museum complex. This iconic landmark represents the golden age of railroad travel and houses multiple museums including the Museum of Natural History & Science, Cincinnati History Museum, and Duke Energy Children\'s Museum.',
    shortDescription: 'Historic Art Deco train station, now a museum complex',
    coordinates: {
      latitude: 39.1097,
      longitude: -84.5386,
    },
    yearBuilt: 1933,
    category: 'building',
    images: ['https://images.unsplash.com/photo-1580407196238-dac33f57c410?w=500'],
    historicalSignificance: 'One of the finest examples of Art Deco architecture in the United States and a symbol of Cincinnati\'s transportation heritage.',
    visitingHours: '10:00 AM - 5:00 PM',
    website: 'https://www.cincymuseum.org',
    address: '1301 Western Ave, Cincinnati, OH 45203'
  },
  {
    id: '2',
    name: 'Roebling Suspension Bridge',
    description: 'Completed in 1866, this suspension bridge was a prototype for the Brooklyn Bridge. Designed by John Augustus Roebling, it spans the Ohio River connecting Cincinnati, Ohio to Covington, Kentucky.',
    shortDescription: 'Historic suspension bridge prototype for Brooklyn Bridge',
    coordinates: {
      latitude: 39.0936,
      longitude: -84.5092,
    },
    yearBuilt: 1866,
    category: 'monument',
    images: ['https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=500'],
    historicalSignificance: 'Engineering marvel and prototype for the more famous Brooklyn Bridge, representing 19th-century innovation.',
    visitingHours: 'Open 24 hours',
    address: 'Roebling Bridge, Cincinnati, OH 45202'
  },
  {
    id: '3',
    name: 'Fountain Square',
    description: 'The heart of downtown Cincinnati, featuring the iconic Tyler Davidson Fountain. This public square has been the city\'s gathering place since 1871 and hosts numerous events throughout the year.',
    shortDescription: 'Downtown\'s central gathering place with historic fountain',
    coordinates: {
      latitude: 39.1014,
      longitude: -84.5124,
    },
    yearBuilt: 1871,
    category: 'site',
    images: ['https://images.unsplash.com/photo-1573160813959-df05c1b8b5c4?w=500'],
    historicalSignificance: 'Central to Cincinnati\'s civic life for over 150 years, symbolizing the city\'s community spirit.',
    visitingHours: 'Open 24 hours',
    website: 'https://myfountainsquare.com',
    address: '520 Vine St, Cincinnati, OH 45202'
  },
  {
    id: '4',
    name: 'Cincinnati Observatory',
    description: 'Founded in 1842, this is one of the oldest professional observatories in the United States. Known as the "Birthplace of American Astronomy," it played a crucial role in the development of astronomical science in America.',
    shortDescription: 'America\'s oldest professional observatory',
    coordinates: {
      latitude: 39.1386,
      longitude: -84.4214,
    },
    yearBuilt: 1842,
    category: 'building',
    images: ['https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=500'],
    historicalSignificance: 'Birthplace of American Astronomy and site of many important astronomical discoveries.',
    visitingHours: 'Thu-Sat 7:30 PM - 10:30 PM',
    website: 'https://cincinnatiobservatory.org',
    address: '3489 Observatory Pl, Cincinnati, OH 45208'
  },
  {
    id: '5',
    name: 'Taft Museum of Art',
    description: 'A historic house museum and art collection housed in a beautiful 1820s Federal-style mansion. The museum contains one of the finest small art collections in America, including works by European and American masters.',
    shortDescription: '1820s mansion housing premier art collection',
    coordinates: {
      latitude: 39.1043,
      longitude: -84.5059,
    },
    yearBuilt: 1820,
    category: 'building',
    images: ['https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=500'],
    historicalSignificance: 'One of Cincinnati\'s most elegant historic homes and important cultural institution.',
    visitingHours: 'Wed-Sun 11:00 AM - 4:00 PM',
    website: 'https://taftmuseum.org',
    address: '316 Pike St, Cincinnati, OH 45202'
  },
  {
    id: '6',
    name: 'William Howard Taft National Historic Site',
    description: 'The birthplace and boyhood home of William Howard Taft, the 27th President of the United States and 10th Chief Justice. This Greek Revival house provides insight into the early life of this important American figure.',
    shortDescription: 'Birthplace of President and Chief Justice William Howard Taft',
    coordinates: {
      latitude: 39.1191,
      longitude: -84.5081,
    },
    yearBuilt: 1835,
    category: 'site',
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500'],
    historicalSignificance: 'Birthplace of the only person to serve as both President and Chief Justice of the United States.',
    visitingHours: '10:00 AM - 4:00 PM (seasonal)',
    website: 'https://www.nps.gov/wiho',
    address: '2038 Auburn Ave, Cincinnati, OH 45219'
  }
];

const MapTab = () => {
  const { top } = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);

  const { user, updateUser } = useAuthStore();
  const userId = user?.id ?? '';

  const { bookmarkLandmark, unbookmarkLandmark } = useLandmarks(userId, false);
  const { createVisit, hasVisited: checkVisited, verifyLocation } = useVisits(userId, false);
  const { isPremium, requirePremium } = useSubscription();

  // Free users are limited to 10 bookmarks
  const FREE_BOOKMARK_LIMIT = 10;

  // Bottom sheet snap points
  const snapPoints = useMemo(() => ['35%', '60%'], []);

  // Handle marker press
  const handleMarkerPress = useCallback(async (landmark: Landmark) => {
    setSelectedLandmark(landmark);
    bottomSheetRef.current?.expand();

    // Check if already bookmarked using auth store data
    setIsBookmarked(user?.bookmarkedLandmarks?.includes(landmark.id) ?? false);

    // Check if already visited
    const visited = await checkVisited(landmark.id);
    setHasVisited(visited);
  }, [checkVisited, user]);

  // Handle bottom sheet close
  const handleSheetClose = useCallback(() => {
    setSelectedLandmark(null);
    bottomSheetRef.current?.close();
  }, []);

  // Render backdrop for bottom sheet
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

  // Handle bookmark toggle (free tier limited to FREE_BOOKMARK_LIMIT bookmarks)
  const handleBookmark = useCallback(async () => {
    if (!selectedLandmark || !userId) return;

    if (isBookmarked) {
      try {
        await unbookmarkLandmark(selectedLandmark.id);
        setIsBookmarked(false);
        updateUser({
          bookmarkedLandmarks: (user?.bookmarkedLandmarks ?? []).filter(
            id => id !== selectedLandmark.id
          ),
        });
      } catch (error) {
        console.error('Error removing bookmark:', error);
      }
      return;
    }

    // Adding a new bookmark — check free tier limit
    const currentBookmarkCount = user?.bookmarkedLandmarks?.length ?? 0;
    const atFreeLimit = !isPremium && currentBookmarkCount >= FREE_BOOKMARK_LIMIT;

    if (atFreeLimit) {
      requirePremium('UNLIMITED_BOOKMARKS', () => {});
      return;
    }

    try {
      await bookmarkLandmark(selectedLandmark.id);
      setIsBookmarked(true);
      updateUser({
        bookmarkedLandmarks: [
          ...(user?.bookmarkedLandmarks ?? []),
          selectedLandmark.id,
        ],
      });
    } catch (error) {
      console.error('Error bookmarking landmark:', error);
    }
  }, [selectedLandmark, userId, isBookmarked, bookmarkLandmark, unbookmarkLandmark, isPremium, requirePremium, FREE_BOOKMARK_LIMIT, user, updateUser]);

  // Handle offline map download (premium only)
  const handleOfflineMapDownload = useCallback(() => {
    requirePremium('OFFLINE_MAPS', () => {
      Alert.alert(
        'Download Offline Map',
        'Download the current map area for offline use? This may use up to 50MB of storage.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            onPress: () => {
              // TODO: Implement offline map download
              Alert.alert('Coming Soon', 'Offline map downloads are being set up. Check back soon!');
            },
          },
        ]
      );
    });
  }, [requirePremium]);

  // Handle visit check-in
  const handleVisit = useCallback(async () => {
    if (!selectedLandmark) return;

    try {
      // Get current location
      Geolocation.getCurrentPosition(
        async (position) => {
          const userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          // Verify location
          const isInRange = verifyLocation(userLocation, selectedLandmark.coordinates);

          if (!isInRange) {
            Alert.alert(
              'Too Far Away',
              'You must be within 100 meters of the landmark to check in.',
              [{ text: 'OK' }]
            );
            return;
          }

          // Create visit
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

  // Handle directions
  const handleDirections = useCallback(() => {
    if (!selectedLandmark) return;

    const { latitude, longitude } = selectedLandmark.coordinates;
    const label = encodeURIComponent(selectedLandmark.name);

    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}&q=${label}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
    });

    if (url) {
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback to Google Maps web
          const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
          Linking.openURL(googleMapsUrl);
        }
      });
    }
  }, [selectedLandmark]);

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <LocationSwitcherHeader title="Explore" />

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={CINCINNATI_REGION}
          showsUserLocation
          showsMyLocationButton
        >
          {CINCINNATI_LANDMARKS.map((landmark) => (
            <Marker
              key={landmark.id}
              coordinate={landmark.coordinates}
              onPress={() => handleMarkerPress(landmark)}
            >
              <View style={[styles.markerContainer, { backgroundColor: getCategoryColor(landmark.category) }]}>
                <View style={styles.markerInner} />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Offline map download button (premium feature) */}
        <TouchableOpacity
          style={styles.offlineButton}
          onPress={handleOfflineMapDownload}
          activeOpacity={0.85}
        >
          <Icon
            name={isPremium ? 'download' : 'lock'}
            size={14}
            color={theme.colors.primary[600]}
          />
          <Text style={styles.offlineButtonText}>
            {isPremium ? 'Save Offline' : 'Offline Maps'}
          </Text>
          {!isPremium && (
            <View style={styles.premiumBadge}>
              <Icon name="crown" size={8} color={theme.colors.white} solid />
            </View>
          )}
        </TouchableOpacity>
      </View>

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
            isBookmarked={isBookmarked}
            hasVisited={hasVisited}
            onBookmark={handleBookmark}
            onVisit={handleVisit}
            onDirections={handleDirections}
          />
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  offlineButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    ...theme.shadows.md,
  },
  offlineButtonText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary[700],
  },
  premiumBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
    ...theme.shadows.md,
  },
  markerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.white,
  },
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

export default MapTab;
