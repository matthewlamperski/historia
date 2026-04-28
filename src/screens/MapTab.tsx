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
import {
  useLandmarks,
  useVisits,
  useSubscription,
  useOfflineMaps,
  useEffectiveHometown,
  useRequireAuth,
} from '../hooks';
import Geolocation from 'react-native-geolocation-service';
import { useAuthStore } from '../store/authStore';
import LandmarkDetailSheet, { getCategoryColor } from '../components/ui/LandmarkDetailSheet';
import { ActionSheet } from '../components/ui';
import { useShareLandmark } from '../hooks';
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
import {
  loadCachedLandmarks,
  cacheLandmarks,
  isStale,
  isHardStale,
} from '../services/landmarksCacheService';
import { landmarksService } from '../services/landmarksService';
import { visitsService } from '../services/visitsService';
import { enrichAndPersist } from '../services/placesEnrichmentService';
import { isNoEnrichmentUid } from '../utils/admin';

// MapLibre does not use Mapbox tokens — set null for non-Mapbox tile sources
MapLibreGL.setAccessToken(null);

/**
 * Cheap fingerprint for the landmark set used by the cache swap guard. Sorted
 * + joined objectIDs — equal fingerprint means same set of landmarks (this
 * intentionally ignores per-field changes because the landmark _set_ is what
 * drives the GeoJSON identity; field changes go through the cache mutation
 * helpers and re-render naturally).
 */
const signatureFor = (hits: LandmarkHit[]): string => {
  if (hits.length === 0) return '0';
  const ids = hits.map(h => h.objectID).sort();
  return `${ids.length}:${ids.join(',')}`;
};

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
      address: hit.address ?? '',
      city: hit.city ?? '',
      state: hit.state ?? '',
      yearBuilt: hit.yearBuilt ?? null,
      website: hit.website ?? '',
      images: JSON.stringify(hit.images ?? []),
      coordinates_lat: lat,
      coordinates_lng: lng,
      // Small Places enrichment kept for the quick-preview sheet.
      populated: hit.populated ?? false,
      phone: hit.phone ?? '',
      googleMapsUri: hit.googleMapsUri ?? '',
      rating: hit.rating ?? null,
      ratingCount: hit.ratingCount ?? null,
      wheelchair: hit.wheelchair ?? null,
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
  const requireAuth = useRequireAuth();
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
  // Falls back to AsyncStorage for anonymous users — set during onboarding.
  const hometown = useEffectiveHometown();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LandmarkHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // ── Load all landmarks once on mount ────────────────────────────────────────
  // Cache-first: if we have a fresh on-device cache, render markers in <500ms
  // and skip the network call. Stale cache renders immediately and refreshes
  // in the background. Cold cache falls back to today's paginated streaming.
  useEffect(() => {
    let cancelled = false;

    /** Replace cached state with fresh hits, applying a swap guard so a
     *  truncated/empty Algolia response can't wipe a healthy cache. */
    const applyFresh = (fresh: LandmarkHit[], cachedCount: number) => {
      if (cancelled) return;
      if (fresh.length === 0) {
        console.warn('[landmarks] background refresh returned 0 hits — keeping cache');
        return;
      }
      if (cachedCount > 0 && fresh.length < cachedCount * 0.95) {
        console.warn(
          `[landmarks] background refresh shrunk by >5% (${cachedCount} → ${fresh.length}) — keeping cache`,
        );
        return;
      }
      // Cheap fingerprint: sorted objectIDs joined. Skip the swap if equal —
      // avoids a needless GeoJSON rebuild + MapLibre re-render.
      const cachedSig = signatureFor(allHitsRef.current);
      const freshSig = signatureFor(fresh);
      if (cachedSig === freshSig) return;

      setAllHits(fresh);
      cacheLandmarks(fresh).catch(err =>
        console.warn('[landmarks] cache write failed', err),
      );
    };

    /** Today's paginated streaming behavior — used when there's no cache to
     *  render from. The final concatenated set is persisted at the end. */
    const streamFromAlgolia = async () => {
      const collected: LandmarkHit[] = [];
      try {
        await browseAllLandmarks(pageHits => {
          if (cancelled) return;
          collected.push(...pageHits);
          setAllHits(prev => [...prev, ...pageHits]);
        });
        if (!cancelled && collected.length > 0) {
          cacheLandmarks(collected).catch(err =>
            console.warn('[landmarks] cache write failed', err),
          );
        }
      } catch (e) {
        console.error('browseAllLandmarks error:', e);
      } finally {
        if (!cancelled) setLandmarksLoading(false);
      }
    };

    /** Background refresh used when we already rendered from cache. */
    const refreshInBackground = async (cachedCount: number) => {
      try {
        const collected: LandmarkHit[] = [];
        await browseAllLandmarks(pageHits => {
          collected.push(...pageHits);
        });
        applyFresh(collected, cachedCount);
      } catch (e) {
        console.warn('[landmarks] background refresh failed', e);
      }
    };

    setLandmarksLoading(true);

    loadCachedLandmarks()
      .then(cached => {
        if (cancelled) return;

        if (cached && cached.hits.length > 0) {
          // Render from cache immediately
          setAllHits(cached.hits);
          setLandmarksLoading(false);

          const stale = isStale(cached.cachedAt);
          const hardStale = isHardStale(cached.cachedAt);
          if (stale || hardStale) {
            refreshInBackground(cached.hits.length);
          }
          return;
        }

        // No cache — stream from Algolia as today
        streamFromAlgolia();
      })
      .catch(err => {
        console.warn('[landmarks] cache read failed, falling back to network', err);
        if (!cancelled) streamFromAlgolia();
      });

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mirror `allHits` into a ref so the swap guard's fingerprint check sees
  // the latest value without retriggering the load effect.
  const allHitsRef = useRef<LandmarkHit[]>([]);
  useEffect(() => {
    allHitsRef.current = allHits;
  }, [allHits]);

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

  // Deterministic reveal tier (0..19) per landmark — stable cheap hash of
  // objectID. Used to progressively unlock icons as the user zooms in.
  // tier === 0 is also the "featured" ~5% that gets a brown highlight circle.
  const tierFor = useCallback((id: string): number => {
    let h = 0;
    for (let i = 0; i < id.length; i++) {
      h = (h * 31 + id.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % 20;
  }, []);

  // Recompute GeoJSON whenever hits, bookmarks, or visits change
  const allLandmarksGeoJSON = useMemo<FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: allHits.map(hit => {
      const f = landmarkHitToFeature(hit);
      const tier = tierFor(hit.objectID);
      // Use 1/0 instead of booleans — boolean literals are unreliable across the JS→native bridge
      f.properties!.bookmarked = bookmarkedIds.has(hit.objectID) ? 1 : 0;
      f.properties!.visited = visitedIds.has(hit.objectID) ? 1 : 0;
      f.properties!.featured = tier === 0 ? 1 : 0;
      f.properties!.tier = tier;
      return f;
    }),
  }), [allHits, bookmarkedIds, visitedIds, tierFor]);


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
      // Expand is deferred to a useEffect below so the sheet's children are
      // committed before the native expand animation runs. The very first tap
      // would otherwise no-op because the BottomSheet's child (`LandmarkDetailSheet`)
      // is conditionally rendered on `selectedLandmark` and isn't mounted yet
      // when `expand()` is called synchronously.
      setIsBookmarked(bookmarkedIds.has(landmark.id));
      const visited = await checkVisited(landmark.id);
      setHasVisited(visited);

      // Enrich from Google Places if this landmark hasn't been populated yet.
      // Skip entirely for the curating-admin UIDs so they only ever see what's
      // already on the Firestore doc and we don't make any write back.
      if (!landmark.populated && !isNoEnrichmentUid(userId)) {
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
    [checkVisited, bookmarkedIds, userId],
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

  // Expand the bottom sheet once React has committed the child. Calling
  // `expand()` inside the tap handler fires before the conditionally-rendered
  // LandmarkDetailSheet is mounted, which the BottomSheet library silently
  // ignores — causing the first tap after app launch to appear dead.
  // Even with a useEffect the first tap can no-op: the native sheet needs
  // one layout pass to resolve its percentage snap points against the just-
  // mounted child. A one-frame deferral fixes the first-tap-after-launch
  // bug without any user-visible delay.
  useEffect(() => {
    if (!selectedLandmark) return;
    const id = setTimeout(() => {
      bottomSheetRef.current?.expand();
    }, 16);
    return () => clearTimeout(id);
  }, [selectedLandmark?.id]);

  // No-op: retained so onRegionDidChange has a stable ref. The built-in
  // MapLibre compass now handles reset-to-north.
  const handleMapRegionChange = useCallback((_feature: any) => {}, []);

  const handleSheetClose = useCallback(() => {
    setSelectedLandmark(null);
    bottomSheetRef.current?.close();
  }, []);

  const handleDeleteLandmark = useCallback(async () => {
    if (!selectedLandmark) return;
    const deletedId = selectedLandmark.id;
    const deletedName = selectedLandmark.name;
    await landmarksService.deleteLandmark(deletedId);
    setAllHits(prev => prev.filter(h => h.objectID !== deletedId));
    bottomSheetRef.current?.close();
    setSelectedLandmark(null);
    Alert.alert('Deleted', `"${deletedName}" has been deleted.`);
  }, [selectedLandmark]);

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

    // Instant quick-preview from the feature properties we already have —
    // the long-form content was intentionally stripped from the Algolia fetch
    // to make the map load fast. We pull it from Firestore just below.
    const quickPreview: Landmark = {
      id: props.id,
      name: props.name,
      description: '',
      shortDescription: props.shortDescription ?? '',
      category: (props.category as Landmark['category']) ?? 'other',
      landmarkType: props.landmarkType || undefined,
      address: props.address ?? '',
      city: props.city || undefined,
      state: props.state || undefined,
      historicalSignificance: '',
      yearBuilt: props.yearBuilt ?? undefined,
      website: props.website || undefined,
      images: (() => { try { return JSON.parse(props.images ?? '[]'); } catch { return []; } })(),
      coordinates: {
        latitude: props.coordinates_lat,
        longitude: props.coordinates_lng,
      },
      populated: Boolean(props.populated),
      phone: props.phone || undefined,
      googleMapsUri: props.googleMapsUri || undefined,
      rating: props.rating != null ? Number(props.rating) : undefined,
      ratingCount: props.ratingCount != null ? Number(props.ratingCount) : undefined,
      wheelchair: props.wheelchair != null ? Boolean(props.wheelchair) : undefined,
    };
    handleMarkerPress(quickPreview);
    setIsEnriching(true);

    // Fetch the full record from Firestore and hot-swap into the open sheet.
    landmarksService
      .getLandmark(props.id)
      .then(full => {
        if (!full) return;
        setSelectedLandmark(prev => (prev?.id === full.id ? full : prev));
      })
      .catch(err => console.warn('getLandmark (post-tap enrich) failed:', err))
      .finally(() => setIsEnriching(false));
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
    if (!selectedLandmark) return;
    if (!requireAuth()) return;

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
    selectedLandmark, isBookmarked, bookmarkLandmark, unbookmarkLandmark,
    isPremium, requirePremium, user, updateUser, bookmarkedIds, requireAuth,
  ]);

  // Save offline — gated behind premium AND auth (premium implies signed in)
  const handleSaveOffline = useCallback(() => {
    if (!selectedLandmark) return;
    if (!requireAuth()) return;
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
  }, [selectedLandmark, requirePremium, isDownloading, isLandmarkSaved, downloadLandmark, requireAuth]);


  // Visit check-in
  const handleVisit = useCallback(async () => {
    if (!selectedLandmark) return;
    if (!requireAuth()) return;
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
  }, [selectedLandmark, createVisit, verifyLocation, visitedIds, requireAuth]);

  // Directions
  const handleDirections = useCallback(() => {
    if (!selectedLandmark) return;
    const { latitude, longitude } = selectedLandmark.coordinates;
    openDirections(latitude, longitude, selectedLandmark.name);
  }, [selectedLandmark]);

  // Share flow (action sheet → in-app send or native share)
  const {
    isActionSheetVisible: shareSheetVisible,
    openShareSheet,
    closeShareSheet,
    handleSendViaHistoria,
    handleShareLink,
  } = useShareLandmark(selectedLandmark);

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
          onPress={() => {
            if (!requireAuth()) return;
            navigation.navigate('NearbyUsers');
          }}
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
          compassEnabled
          compassViewPosition={1}
          compassViewMargins={{ x: 16, y: 72 }}
          onRegionDidChange={handleMapRegionChange}
          onPress={dismissSearch}
        >
          <MapLibreGL.Camera
            ref={cameraRef}
            maxZoomLevel={17}
            defaultSettings={{
              centerCoordinate: hometown
                ? [hometown.longitude, hometown.latitude]
                : DEFAULT_CENTER,
              zoomLevel: 11,
            }}
          />
          <MapLibreGL.Images images={landmarkMapImages} />
          <MapLibreGL.UserLocation visible renderMode="native" />

          {/* State / province boundaries overlay. Voyager's built-in state
              layer is hidden below zoom 4 and nearly invisible (#d4d5d6 at
              0.5px), so we draw our own on top of the same vector-tile source
              the basemap already loaded — no extra tiles fetched. */}
          <MapLibreGL.LineLayer
            id="stateBoundariesOverlay"
            sourceID="carto"
            sourceLayerID="boundary"
            filter={[
              'all',
              ['==', ['get', 'admin_level'], 4],
              ['==', ['get', 'maritime'], 0],
            ]}
            style={{
              lineColor: '#7a6a52',
              lineOpacity: 0.7,
              lineWidth: [
                'interpolate', ['linear'], ['zoom'],
                0, 0.6,
                4, 0.8,
                8, 1.2,
                12, 1.6,
              ],
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />

          <MapLibreGL.ShapeSource
            id="landmarksSource"
            ref={shapeSourceRef}
            shape={allLandmarksGeoJSON}
            onPress={handleShapeSourcePress}
            hitbox={{ width: 44, height: 44 }}
          >
            {/* Regular (non-highlighted) landmark circles — small dots so they
                don't dominate the map when a lot of them are visible. */}
            <MapLibreGL.CircleLayer
              id="landmarkCirclesRegular"
              filter={[
                'all',
                ['!=', ['get', 'visited'], 1],
                ['!=', ['get', 'bookmarked'], 1],
                ['!=', ['get', 'featured'], 1],
              ]}
              style={{
                circleColor: '#927f61',
                // Small at low zoom; past the icon-reveal threshold (12) they
                // size up to match the important circles so everything looks
                // uniform once icons are visible.
                circleRadius: [
                  'interpolate', ['linear'], ['zoom'],
                  8, 2,
                  11, 3.5,
                  12, 12,
                  17, 18,
                ],
                circleStrokeWidth: [
                  'interpolate', ['linear'], ['zoom'],
                  8, 0.5,
                  11, 1,
                  12, 2,
                ],
                circleStrokeColor: '#ffffff',
              }}
            />
            {/* Highlighted circles — visited (brick red), bookmarked (sage),
                or featured (brown). Larger than regulars below zoom 12 so they
                stand out among the tiny dots; same size from zoom 12 up. */}
            <MapLibreGL.CircleLayer
              id="landmarkCirclesImportant"
              filter={[
                'any',
                ['==', ['get', 'visited'], 1],
                ['==', ['get', 'bookmarked'], 1],
                ['==', ['get', 'featured'], 1],
              ]}
              style={{
                circleColor: [
                  'case',
                  ['==', ['get', 'visited'], 1],    '#b74840',
                  ['==', ['get', 'bookmarked'], 1], '#567545',
                  '#927f61',
                ],
                circleRadius: [
                  'interpolate', ['linear'], ['zoom'],
                  8, 7,
                  11, 10,
                  12, 12,
                  17, 18,
                ],
                circleStrokeWidth: [
                  'interpolate', ['linear'], ['zoom'],
                  8, 1.25,
                  12, 2,
                ],
                circleStrokeColor: '#ffffff',
              }}
            />
            {/* FA6 solid icon on top of the circle, keyed by landmarkType.
                Icon visibility:
                  • visited / bookmarked / featured → always visible
                  • everyone else → fades in between zoom 11.5 → 12.5
                This keeps the map readable when zoomed out (just colored dots
                + a sprinkling of icons) and becomes fully icon-ed at city zoom. */}
            <MapLibreGL.SymbolLayer
              id="landmarkIcons"
              style={{
                iconImage: [
                  'case',
                  ['==', ['get', 'landmarkType'], 'museum'],        'lm-museum',
                  ['==', ['get', 'landmarkType'], 'historic_site'],  'lm-historic',
                  ['==', ['get', 'landmarkType'], 'manufacturer'],   'lm-manufacturer',
                  'lm-default',
                ],
                iconSize: [
                  'interpolate', ['linear'], ['zoom'],
                  8, 0.4,
                  12, 0.7,
                  15, 0.9,
                ],
                iconAllowOverlap: true,
                iconIgnorePlacement: true,
                // Keep `step(zoom)` at the top level — MapLibre's RN bridge
                // marshals this shape reliably. Nesting `interpolate(zoom)`
                // inside a `case` crashed the native side on iOS.
                // Tiered reveal (tier range 0..19). Icons stay hidden until
                // roughly city-level zoom; visited/bookmarked always show.
                iconOpacity: [
                  'step',
                  ['zoom'],
                  // < 8: only visited + bookmarked
                  [
                    'case',
                    ['==', ['get', 'visited'], 1], 1,
                    ['==', ['get', 'bookmarked'], 1], 1,
                    0,
                  ],
                  8,
                  // 8–9.9 (region): +tier 0 (~5%)
                  [
                    'case',
                    ['==', ['get', 'visited'], 1], 1,
                    ['==', ['get', 'bookmarked'], 1], 1,
                    ['<=', ['get', 'tier'], 0], 1,
                    0,
                  ],
                  10,
                  // 10–10.9 (metro): +tier ≤ 4 (~25%)
                  [
                    'case',
                    ['==', ['get', 'visited'], 1], 1,
                    ['==', ['get', 'bookmarked'], 1], 1,
                    ['<=', ['get', 'tier'], 4], 1,
                    0,
                  ],
                  11,
                  // 11–11.9 (city): +tier ≤ 10 (~55%)
                  [
                    'case',
                    ['==', ['get', 'visited'], 1], 1,
                    ['==', ['get', 'bookmarked'], 1], 1,
                    ['<=', ['get', 'tier'], 10], 1,
                    0,
                  ],
                  12,
                  // ≥ 12 (neighborhood): everyone
                  1,
                ],
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
        onClose={() => setSelectedLandmark(null)}
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
            onShare={openShareSheet}
            onAskBede={() => {
              if (!requireAuth()) return;
              navigation.navigate('AskBede', {
                landmarkId: selectedLandmark.id,
                landmarkName: selectedLandmark.name,
              });
            }}
            onLandmarkUpdated={setSelectedLandmark}
            isOfflineSaved={selectedIsOfflineSaved}
            offlineDownloadProgress={selectedOfflineProgress}
            isEnriching={isEnriching}
            onDelete={handleDeleteLandmark}
          />
        )}
      </BottomSheet>

      <ActionSheet
        visible={shareSheetVisible}
        onClose={closeShareSheet}
        title={selectedLandmark?.name}
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
