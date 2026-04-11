import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { openDirections } from '../utils';
import { Text } from '../components/ui/Text';
import MapLibreGL, { ShapeSourceRef } from '@maplibre/maplibre-react-native';
import type { FeatureCollection, Feature } from 'geojson';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Landmark } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useLandmarks, useVisits, useSubscription, useOfflineMaps } from '../hooks';
import Geolocation from 'react-native-geolocation-service';
import { useAuthStore } from '../store/authStore';
import LandmarkDetailSheet, { getCategoryColor } from '../components/ui/LandmarkDetailSheet';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { OFFLINE_STYLE_URL } from '../services/offlineMapService';
import HapticFeedback from 'react-native-haptic-feedback';
import {
  searchLandmarks,
  browseAllLandmarks,
  formatLandmarkDistance,
  LandmarkHit,
} from '../services/algoliaLandmarksService';
import { landmarksService } from '../services/landmarksService';
import { visitsService } from '../services/visitsService';
import { enrichAndPersist } from '../services/placesEnrichmentService';

// MapLibre does not use Mapbox tokens — set null for non-Mapbox tile sources
MapLibreGL.setAccessToken(null);

// Convert an Algolia LandmarkHit to a GeoJSON Feature for the ShapeSource
const landmarkHitToFeature = (hit: LandmarkHit): Feature => {
  const lat = hit.coordinates?.latitude ?? hit._geoloc?.lat ?? 0;
  const lng = hit.coordinates?.longitude ?? hit._geoloc?.lng ?? 0;
  return {
    type: 'Feature',
    id: hit.objectID,
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {
      id: hit.objectID,
      name: hit.name,
      category: hit.category ?? 'other',
      landmarkType: hit.landmarkType ?? '',
      shortDescription: hit.shortDescription ?? '',
      description: hit.description ?? '',
      historicalSignificance: hit.historicalSignificance ?? '',
      address: hit.address ?? '',
      city: hit.city ?? '',
      state: hit.state ?? '',
      yearBuilt: hit.yearBuilt ?? null,
      visitingHours: hit.visitingHours ?? '',
      website: hit.website ?? '',
      images: JSON.stringify(hit.images ?? []),
      coordinates_lat: lat,
      coordinates_lng: lng,
      // Places enrichment
      populated: hit.populated ?? false,
      phone: hit.phone ?? '',
      googleMapsUri: hit.googleMapsUri ?? '',
      rating: hit.rating ?? null,
      ratingCount: hit.ratingCount ?? null,
      openingHours: JSON.stringify(hit.openingHours ?? []),
      wheelchair: hit.wheelchair ?? null,
      editorialSummary: hit.editorialSummary ?? '',
    },
  };
};


// MapLibre TS definitions don't declare children on MapView; cast to accept them
const MapView = MapLibreGL.MapView as React.ComponentType<any>;

// Default map center: downtown Cincinnati (where current landmarks are)
const DEFAULT_CENTER: [number, number] = [-84.5120, 39.1060]; // [lng, lat] — GeoJSON order

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const LandmarkMarker = React.memo(({ color }: { color: string }) => (
  <View style={[styles.markerContainer, { backgroundColor: color }]}>
    <View style={styles.markerInner} />
  </View>
));

const MapTab = () => {
  const { top } = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const cameraRef = useRef<any>(null);
  const shapeSourceRef = useRef<ShapeSourceRef>(null);

  const [allHits, setAllHits] = useState<LandmarkHit[]>([]);
  const [landmarksLoading, setLandmarksLoading] = useState(true);
  const [landmarkMapImages, setLandmarkMapImages] = useState<Record<string, any>>({});

  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  const { user, updateUser } = useAuthStore();
  const userId = user?.id ?? '';

  const { bookmarkLandmark, unbookmarkLandmark } = useLandmarks(userId, false);
  const { createVisit, hasVisited: checkVisited, verifyLocation } = useVisits(userId, false);
  const { isPremium, requirePremium } = useSubscription();
  const {
    downloadLandmark,
    isDownloading,
    downloadProgress,
    isLandmarkSaved,
    error: offlineError,
  } = useOfflineMaps();

  const FREE_BOOKMARK_LIMIT = 10;
  const snapPoints = useMemo(() => ['35%', '60%'], []);

  // ── Landmark search state ────────────────────────────────────────────────────
  const hometown = user?.hometown;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LandmarkHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // ── Load all landmarks once on mount ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLandmarksLoading(true);
    browseAllLandmarks()
      .then(hits => { if (!cancelled) setAllHits(hits); })
      .catch(e => console.error('browseAllLandmarks error:', e))
      .finally(() => { if (!cancelled) setLandmarksLoading(false); });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Bookmark/visit ID sets — loaded from subcollections, updated locally on action
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      landmarksService.getBookmarkedLandmarkIds(userId),
      visitsService.getVisitedLandmarkIds(userId),
    ]).then(([bIds, vIds]) => {
      setBookmarkedIds(new Set(bIds));
      setVisitedIds(new Set(vIds));
    }).catch(console.error);
  }, [userId]);

  // Recompute GeoJSON whenever hits, bookmarks, or visits change
  const allLandmarksGeoJSON = useMemo<FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: allHits.map(hit => {
      const f = landmarkHitToFeature(hit);
      // Use 1/0 instead of booleans — boolean literals are unreliable across the JS→native bridge
      f.properties!.bookmarked = bookmarkedIds.has(hit.objectID) ? 1 : 0;
      f.properties!.visited = visitedIds.has(hit.objectID) ? 1 : 0;
      return f;
    }),
  }), [allHits, bookmarkedIds, visitedIds]);


  // Load FA6 solid icons into MapLibre's image atlas.
  // The 4th argument to getImageSource selects the 'solid' style variant —
  // without it the library defaults to 'regular', which lacks most content icons.
  useEffect(() => {
    Promise.all([
      Icon.getImageSource('building-columns', 18, '#ffffff', 'solid'), // museum
      Icon.getImageSource('monument',         18, '#ffffff', 'solid'), // historic site
      Icon.getImageSource('industry',         18, '#ffffff', 'solid'), // manufacturer
      Icon.getImageSource('location-dot',     18, '#ffffff', 'solid'), // default
    ]).then(([museum, historic, manufacturer, dflt]) => {
      setLandmarkMapImages({
        'lm-museum':       museum,
        'lm-historic':     historic,
        'lm-manufacturer': manufacturer,
        'lm-default':      dflt,
      });
    }).catch(err => console.error('Failed to load landmark map icons:', err));
  }, []);

  const dismissSearch = useCallback(() => {
    setSearchResults([]);
    searchInputRef.current?.blur();
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (!text.trim()) {
        setSearchResults([]);
        return;
      }
      searchDebounceRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const hits = await searchLandmarks(text);
          setSearchResults(hits);
        } catch (e) {
          console.error('Landmark search error:', e);
        }
        setIsSearching(false);
      }, 300);
    },
    []
  );

  // Handle landmark marker tap
  const handleMarkerPress = useCallback(
    async (landmark: Landmark) => {
      setSelectedLandmark(landmark);
      bottomSheetRef.current?.expand();
      setIsBookmarked(bookmarkedIds.has(landmark.id));
      const visited = await checkVisited(landmark.id);
      setHasVisited(visited);

      // Enrich from Google Places if this landmark hasn't been populated yet
      if (!landmark.populated) {
        setIsEnriching(true);
        enrichAndPersist(landmark)
          .then(updates => {
            setSelectedLandmark(prev =>
              prev?.id === landmark.id ? { ...prev, ...updates } : prev
            );
          })
          .catch(console.error)
          .finally(() => setIsEnriching(false));
      }
    },
    [checkVisited, bookmarkedIds],
  );

  // Select a result from Algolia search — flies camera and opens bottom sheet
  const handleSearchSelect = useCallback(
    (hit: LandmarkHit) => {
      setSearchQuery('');
      setSearchResults([]);
      searchInputRef.current?.blur();

      const coords = hit.coordinates ??
        (hit._geoloc ? { latitude: hit._geoloc.lat, longitude: hit._geoloc.lng } : null);
      if (!coords) return;

      const FLY_DURATION = 800;

      cameraRef.current?.setCamera({
        centerCoordinate: [coords.longitude, coords.latitude],
        zoomLevel: 15,
        animationDuration: FLY_DURATION,
        animationMode: 'flyTo',
      });

      const landmark: Landmark = {
        id: hit.objectID,
        name: hit.name,
        description: hit.description ?? '',
        shortDescription: hit.shortDescription ?? '',
        coordinates: coords,
        category: (hit.category as Landmark['category']) ?? 'other',
        images: hit.images ?? [],
        historicalSignificance: hit.historicalSignificance ?? '',
        address: hit.address ?? '',
        city: hit.city,
        state: hit.state,
        yearBuilt: hit.yearBuilt,
        visitingHours: hit.visitingHours,
        website: hit.website,
        populated: hit.populated,
        phone: hit.phone,
        googleMapsUri: hit.googleMapsUri,
        rating: hit.rating,
        ratingCount: hit.ratingCount,
        openingHours: hit.openingHours,
        wheelchair: hit.wheelchair,
        editorialSummary: hit.editorialSummary,
      };

      // Wait for the fly-to animation to finish before opening the sheet
      setTimeout(() => handleMarkerPress(landmark), FLY_DURATION + 100);
    },
    [handleMarkerPress]
  );

  // No-op: kept so onRegionDidChange has a stable ref; no longer triggers Algolia fetches
  const handleMapRegionChange = useCallback((_feature: any) => {}, []);

  const handleSheetClose = useCallback(() => {
    setSelectedLandmark(null);
    bottomSheetRef.current?.close();
  }, []);

  const handleShapeSourcePress = useCallback(async (event: any) => {
    const feature = event.features?.[0];
    if (!feature) return;

    const props = feature.properties;

    if (props?.cluster) {
      // Cluster tap — zoom in to expand
      try {
        const expansionZoom: number =
          await shapeSourceRef.current!.getClusterExpansionZoom(feature);
        cameraRef.current?.setCamera({
          centerCoordinate: feature.geometry.coordinates,
          zoomLevel: expansionZoom,
          animationDuration: 400,
          animationMode: 'flyTo',
        });
      } catch (e) {
        console.error('getClusterExpansionZoom error:', e);
      }
      return;
    }

    HapticFeedback.trigger('impactMedium', { enableVibrateFallback: true, ignoreAndroidSystemSettings: false });

    // Individual landmark tap — reconstruct Landmark from GeoJSON properties
    const landmark: Landmark = {
      id: props.id,
      name: props.name,
      description: props.description ?? '',
      shortDescription: props.shortDescription ?? '',
      category: (props.category as Landmark['category']) ?? 'other',
      landmarkType: props.landmarkType || undefined,
      address: props.address ?? '',
      city: props.city || undefined,
      state: props.state || undefined,
      historicalSignificance: props.historicalSignificance ?? '',
      yearBuilt: props.yearBuilt ?? undefined,
      visitingHours: props.visitingHours || undefined,
      website: props.website || undefined,
      images: (() => { try { return JSON.parse(props.images ?? '[]'); } catch { return []; } })(),
      coordinates: {
        latitude: props.coordinates_lat,
        longitude: props.coordinates_lng,
      },
      // Places enrichment
      populated: Boolean(props.populated),
      phone: props.phone || undefined,
      googleMapsUri: props.googleMapsUri || undefined,
      rating: props.rating != null ? Number(props.rating) : undefined,
      ratingCount: props.ratingCount != null ? Number(props.ratingCount) : undefined,
      openingHours: (() => { try { return JSON.parse(props.openingHours ?? '[]'); } catch { return []; } })(),
      wheelchair: props.wheelchair != null ? Boolean(props.wheelchair) : undefined,
      editorialSummary: props.editorialSummary || undefined,
    };

    handleMarkerPress(landmark);
  }, [handleMarkerPress]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  // Bookmark toggle
  const handleBookmark = useCallback(async () => {
    if (!selectedLandmark || !userId) return;

    if (isBookmarked) {
      try {
        await unbookmarkLandmark(selectedLandmark.id);
        setIsBookmarked(false);
        setBookmarkedIds(prev => { const s = new Set(prev); s.delete(selectedLandmark.id); return s; });
        updateUser({ bookmarkCount: Math.max(0, (user?.bookmarkCount ?? 1) - 1) });
      } catch (err) {
        console.error('Error removing bookmark:', err);
      }
      return;
    }

    if (!isPremium && bookmarkedIds.size >= FREE_BOOKMARK_LIMIT) {
      requirePremium('UNLIMITED_BOOKMARKS', () => {});
      return;
    }

    try {
      await bookmarkLandmark(selectedLandmark.id);
      setIsBookmarked(true);
      setBookmarkedIds(prev => new Set([...prev, selectedLandmark.id]));
      updateUser({ bookmarkCount: (user?.bookmarkCount ?? 0) + 1 });
    } catch (err) {
      console.error('Error bookmarking landmark:', err);
    }
  }, [
    selectedLandmark, userId, isBookmarked, bookmarkLandmark, unbookmarkLandmark,
    isPremium, requirePremium, user, updateUser, bookmarkedIds,
  ]);

  // Save offline — gated behind premium
  const handleSaveOffline = useCallback(() => {
    if (!selectedLandmark) return;
    requirePremium('OFFLINE_MAPS', () => {
      if (isDownloading) return;
      if (isLandmarkSaved(selectedLandmark.id)) {
        Alert.alert('Already Saved', 'This area is already saved for offline use.');
        return;
      }
      Alert.alert(
        'Save for Offline',
        `Download the map area around ${selectedLandmark.name}? This saves roughly a 5 km radius at walking detail level.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            onPress: () => downloadLandmark(selectedLandmark),
          },
        ],
      );
    });
  }, [selectedLandmark, requirePremium, isDownloading, isLandmarkSaved, downloadLandmark]);


  // Visit check-in
  const handleVisit = useCallback(async () => {
    if (!selectedLandmark) return;
    Geolocation.getCurrentPosition(
      async position => {
        const userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const inRange = verifyLocation(userLocation, selectedLandmark.coordinates);
        if (!inRange) {
          Alert.alert('Too Far Away', 'You must be within 100 meters of the landmark to check in.');
          return;
        }
        await createVisit(selectedLandmark.id, userLocation);
        setHasVisited(true);
        setVisitedIds(prev => new Set([...prev, selectedLandmark.id]));
        Alert.alert('Success!', 'You have checked in at this landmark!');
      },
      err => {
        console.error('Location error:', err);
        Alert.alert('Location Error', 'Unable to get your current location.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }, [selectedLandmark, createVisit, verifyLocation, visitedIds]);

  // Directions
  const handleDirections = useCallback(() => {
    if (!selectedLandmark) return;
    const { latitude, longitude } = selectedLandmark.coordinates;
    openDirections(latitude, longitude, selectedLandmark.name);
  }, [selectedLandmark]);

  // Derived offline state for the selected landmark
  const selectedIsOfflineSaved = selectedLandmark
    ? isLandmarkSaved(selectedLandmark.id)
    : false;
  const selectedOfflineProgress =
    downloadProgress != null && downloadProgress.landmarkId === selectedLandmark?.id
      ? downloadProgress.percentage
      : undefined;


  return (
    <View style={[styles.container, { paddingTop: top }]}>
      {/* Header: hometown + nearby users button */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.hometownBtn}
          onPress={() => navigation.navigate('SetHometown')}
          activeOpacity={0.75}
        >
          <Icon name="chevron-down" size={14} color={theme.colors.gray[600]} />
          <Text variant="body" weight="medium" style={styles.hometownText}>
            {hometown?.city ?? 'Set Hometown'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nearbyBtn}
          onPress={() => navigation.navigate('NearbyUsers')}
          activeOpacity={0.75}
        >
          <Icon name="users" size={17} color={theme.colors.primary[600]} />
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          mapStyle={OFFLINE_STYLE_URL}
          logoEnabled={false}
          attributionEnabled={false}
          onRegionDidChange={handleMapRegionChange}
          onPress={dismissSearch}
        >
          <MapLibreGL.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: hometown
                ? [hometown.longitude, hometown.latitude]
                : DEFAULT_CENTER,
              zoomLevel: 11,
            }}
          />
          <MapLibreGL.Images images={landmarkMapImages} />
          <MapLibreGL.UserLocation visible renderMode="native" />

          <MapLibreGL.ShapeSource
            id="landmarksSource"
            ref={shapeSourceRef}
            shape={allLandmarksGeoJSON}
            cluster
            clusterRadius={40}
            clusterMaxZoomLevel={11}
            onPress={handleShapeSourcePress}
            hitbox={{ width: 44, height: 44 }}
          >
            {/* Cluster bubbles */}
            <MapLibreGL.CircleLayer
              id="clusterCircles"
              filter={['has', 'point_count']}
              style={{
                circleColor: [
                  'step', ['get', 'point_count'],
                  '#927f61', 10, '#7a6a52', 50, '#625543',
                ],
                circleRadius: [
                  'step', ['get', 'point_count'],
                  20, 10, 26, 50, 34,
                ],
                circleOpacity: 0.9,
                circleStrokeWidth: 2,
                circleStrokeColor: '#ffffff',
              }}
            />
            {/* Cluster count labels */}
            <MapLibreGL.SymbolLayer
              id="clusterCounts"
              filter={['has', 'point_count']}
              style={{
                textField: ['get', 'point_count_abbreviated'],
                textSize: 13,
                textColor: '#ffffff',
                textAllowOverlap: true,
                textIgnorePlacement: true,
              }}
            />
            {/* Circle — brick-red if visited, sage green if bookmarked, uniform brown otherwise */}
            <MapLibreGL.CircleLayer
              id="landmarkCircles"
              filter={['!', ['has', 'point_count']]}
              style={{
                circleColor: [
                  'case',
                  ['==', ['get', 'visited'], 1],    '#b74840', // warm brick red
                  ['==', ['get', 'bookmarked'], 1], '#567545', // earthy sage green
                  '#927f61',                                   // uniform app brown
                ],
                circleRadius: 16,
                circleStrokeWidth: 2,
                circleStrokeColor: '#ffffff',
              }}
            />
            {/* FA6 solid icon on top of the circle, keyed by landmarkType */}
            <MapLibreGL.SymbolLayer
              id="landmarkIcons"
              filter={['!', ['has', 'point_count']]}
              style={{
                iconImage: [
                  'case',
                  ['==', ['get', 'landmarkType'], 'museum'],        'lm-museum',
                  ['==', ['get', 'landmarkType'], 'historic_site'],  'lm-historic',
                  ['==', ['get', 'landmarkType'], 'manufacturer'],   'lm-manufacturer',
                  'lm-default',
                ],
                iconSize: 0.9,
                iconAllowOverlap: true,
                iconIgnorePlacement: true,
              }}
            />
          </MapLibreGL.ShapeSource>
        </MapView>

        {/* Subtle loading spinner — bottom-right, only while landmarks are fetching */}
        {landmarksLoading && (
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="small" color={theme.colors.primary[500]} />
          </View>
        )}

        {/* ── Landmark search bar ─────────────────────────────────────────── */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            {isSearching ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary[500]}
                style={styles.searchLeadIcon}
              />
            ) : (
              <Icon
                name="magnifying-glass"
                size={15}
                color={theme.colors.gray[400]}
                style={styles.searchLeadIcon}
              />
            )}
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search landmarks…"
              placeholderTextColor={theme.colors.gray[400]}
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
              onSubmitEditing={() => {
                // Keep results open on submit — just blur keyboard
                searchInputRef.current?.blur();
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => { setSearchQuery(''); setSearchResults([]); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="xmark" size={14} color={theme.colors.gray[400]} />
              </TouchableOpacity>
            )}
          </View>

          {/* Results dropdown */}
          {searchResults.length > 0 && (
            <ScrollView
              style={styles.searchResults}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {searchResults.map((hit, index) => (
                <TouchableOpacity
                  key={hit.objectID}
                  style={[
                    styles.searchResultItem,
                    index > 0 && styles.searchResultDivider,
                  ]}
                  onPress={() => handleSearchSelect(hit)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.resultCategoryDot,
                      {
                        backgroundColor: getCategoryColor(
                          (hit.category ?? 'other') as Landmark['category']
                        ),
                      },
                    ]}
                  />
                  <View style={styles.resultBody}>
                    <Text variant="body" weight="medium" numberOfLines={1}>
                      {hit.name}
                    </Text>
                    <Text variant="caption" color="gray.500" numberOfLines={1}>
                      {hit.city && hit.state
                        ? `${hit.city}, ${hit.state}`
                        : hit.address ?? ''}
                    </Text>
                  </View>
                  {hit._rankingInfo?.geoDistance != null && (
                    <Text variant="caption" color="gray.400" style={styles.resultDistance}>
                      {formatLandmarkDistance(hit._rankingInfo.geoDistance)}
                    </Text>
                  )}
                  <Icon
                    name="chevron-right"
                    size={11}
                    color={theme.colors.gray[300]}
                    style={styles.resultChevron}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        topInset={top}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetHandle}
        containerStyle={styles.bottomSheetContainer}
      >
        {selectedLandmark && (
          <LandmarkDetailSheet
            landmark={selectedLandmark}
            isBookmarked={isBookmarked}
            hasVisited={hasVisited}
            onBookmark={handleBookmark}
            onVisit={handleVisit}
            onDirections={handleDirections}
            onSaveOffline={handleSaveOffline}
            isOfflineSaved={selectedIsOfflineSaved}
            offlineDownloadProgress={selectedOfflineProgress}
            isEnriching={isEnriching}
          />
        )}
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
    backgroundColor: theme.colors.white,
  },
  hometownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hometownText: {
    color: theme.colors.gray[900],
  },
  nearbyBtn: {
    position: 'absolute',
    right: theme.spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingSpinner: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
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
  // ── Landmark search ──────────────────────────────────────────────────────────
  searchContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 20,
  },
  bottomSheetContainer: {
    zIndex: 100,
    elevation: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius['2xl'],
    paddingHorizontal: 14,
    height: 46,
    ...theme.shadows.lg,
  },
  searchLeadIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[900],
    padding: 0,
  },
  searchResults: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    marginTop: 8,
    maxHeight: 320,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    gap: 10,
  },
  searchResultDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.gray[200],
  },
  resultCategoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  resultBody: {
    flex: 1,
    gap: 1,
  },
  resultDistance: {
    flexShrink: 0,
    fontSize: 11,
  },
  resultChevron: {
    marginLeft: 2,
  },
});

export default MapTab;
