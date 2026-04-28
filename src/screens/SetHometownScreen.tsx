import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapLibreGL from '@maplibre/maplibre-react-native';
import Geolocation from 'react-native-geolocation-service';
import { NavigationContext } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { theme } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { userService } from '../services/userService';
import { useAnonymousHometownStore } from '../hooks/useAnonymousHometown';
import { GOOGLE_PLACES_API_KEY } from '../constants/googlePlaces';
import { OFFLINE_STYLE_URL } from '../services/offlineMapService';

MapLibreGL.setAccessToken(null);
const MapView = MapLibreGL.MapView as React.ComponentType<any>;

// Cincinnati as a sensible default until we detect real location
const DEFAULT_COORD: [number, number] = [-84.512, 39.106];

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const SetHometownScreen: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const setAnonHometown = useAnonymousHometownStore(s => s.setHometown);
  const navigationCtx = useContext(NavigationContext);

  const cameraRef = useRef<any>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseGeocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Map & location state
  const [selectedCoord, setSelectedCoord] = useState<[number, number]>(DEFAULT_COORD);
  const [selectedCityName, setSelectedCityName] = useState<string>('');
  const [isLocating, setIsLocating] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Dropdown position — measured dynamically from the search row layout
  const [dropdownTop, setDropdownTop] = useState(160);

  // Pin lift animation — value 0 = resting, 1 = lifted during drag
  const pinLiftAnim = useRef(new Animated.Value(0)).current;

  // Track whether current map position came from a programmatic move
  // (so we don't override the city name with a reverse geocode result)
  const programmaticMoveRef = useRef(false);

  // ── Geolocation ──────────────────────────────────────────────────────────────

  useEffect(() => {
    requestLocationPermissionAndCenter();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestLocationPermissionAndCenter = async () => {
    if (Platform.OS === 'android') {
      const { PermissionsAndroid } = require('react-native');
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Historia needs your location to center the map on your area.',
          buttonPositive: 'Allow',
          buttonNegative: 'Not now',
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setIsLocating(false);
        return;
      }
    }

    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        const coord: [number, number] = [longitude, latitude];
        programmaticMoveRef.current = true;
        setSelectedCoord(coord);
        cameraRef.current?.setCamera({
          centerCoordinate: coord,
          zoomLevel: 9,
          animationDuration: 1200,
          animationMode: 'flyTo',
        });
        reverseGeocode(latitude, longitude);
        setIsLocating(false);
      },
      _err => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // ── Reverse geocoding ─────────────────────────────────────────────────────────

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!GOOGLE_PLACES_API_KEY) {
      setSelectedCityName(`${lat.toFixed(3)}, ${lng.toFixed(3)}`);
      return;
    }
    try {
      const url =
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}` +
        `&result_type=locality|administrative_area_level_1&key=${GOOGLE_PLACES_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('[Places] Geocode error:', data.status, data.error_message);
        setSelectedCityName(`${lat.toFixed(3)}, ${lng.toFixed(3)}`);
        return;
      }
      if (data.results && data.results.length > 0) {
        const components = data.results[0].address_components as Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
        const city = components.find(c => c.types.includes('locality'))?.long_name;
        const state = components.find(c =>
          c.types.includes('administrative_area_level_1')
        )?.short_name;
        setSelectedCityName(
          city && state ? `${city}, ${state}` : data.results[0].formatted_address
        );
      } else {
        setSelectedCityName(`${lat.toFixed(3)}, ${lng.toFixed(3)}`);
      }
    } catch (err) {
      console.error('[Places] Geocode fetch failed:', err);
      setSelectedCityName(`${lat.toFixed(3)}, ${lng.toFixed(3)}`);
    }
  }, []);

  // ── Places autocomplete ───────────────────────────────────────────────────────

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setSearchError(null);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!text || text.length < 2) {
      setSuggestions([]);
      return;
    }
    searchDebounceRef.current = setTimeout(() => fetchSuggestions(text), 350);
  };

  const fetchSuggestions = async (query: string) => {
    if (!GOOGLE_PLACES_API_KEY) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}` +
        `&types=(cities)&key=${GOOGLE_PLACES_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('[Places] Autocomplete error:', data.status, data.error_message);
        setSearchError(
          data.status === 'REQUEST_DENIED'
            ? 'Search unavailable — API key not authorized'
            : 'Search unavailable. Try again.'
        );
        setSuggestions([]);
      } else {
        setSuggestions(data.predictions || []);
      }
    } catch (err) {
      console.error('[Places] Autocomplete fetch failed:', err);
      setSearchError('Search unavailable. Check your connection.');
      setSuggestions([]);
    }
    setIsSearching(false);
  };

  const handleSelectSuggestion = async (place: PlacePrediction) => {
    setSearchQuery('');
    setSuggestions([]);
    if (!GOOGLE_PLACES_API_KEY) return;
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}` +
        `&fields=geometry&key=${GOOGLE_PLACES_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status && data.status !== 'OK') {
        console.error('[Places] Place details error:', data.status, data.error_message);
        Alert.alert('Error', 'Could not load location details. Please try again.');
        return;
      }
      const loc = data.result?.geometry?.location;
      if (loc) {
        const coord: [number, number] = [loc.lng, loc.lat];
        programmaticMoveRef.current = true;
        setSelectedCoord(coord);
        setSelectedCityName(place.description);
        cameraRef.current?.setCamera({
          centerCoordinate: coord,
          zoomLevel: 10,
          animationDuration: 1000,
          animationMode: 'flyTo',
        });
      }
    } catch (err) {
      console.error('[Places] Place details fetch failed:', err);
      Alert.alert('Error', 'Could not load location details. Check your connection.');
    }
  };

  // ── Map drag handlers ─────────────────────────────────────────────────────────

  const handleRegionWillChange = useCallback(() => {
    Animated.spring(pinLiftAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 0,
    }).start();
  }, [pinLiftAnim]);

  const handleRegionDidChange = useCallback(
    (feature: any) => {
      // Drop the pin back with a small bounce
      Animated.spring(pinLiftAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }).start();

      if (programmaticMoveRef.current) {
        programmaticMoveRef.current = false;
        return;
      }
      const coords = feature?.geometry?.coordinates as [number, number] | undefined;
      if (!coords) return;
      const [lng, lat] = coords;
      setSelectedCoord([lng, lat]);
      // Debounce to avoid hammering the API on quick successive drags
      if (reverseGeocodeDebounceRef.current) clearTimeout(reverseGeocodeDebounceRef.current);
      reverseGeocodeDebounceRef.current = setTimeout(() => reverseGeocode(lat, lng), 400);
    },
    [reverseGeocode, pinLiftAnim]
  );

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedCityName) {
      Alert.alert('Select a Location', 'Please search for a city or drag the map to set your hometown.');
      return;
    }
    setIsSaving(true);
    const [lng, lat] = selectedCoord;
    const hometown = { latitude: lat, longitude: lng, city: selectedCityName };
    try {
      if (user?.id) {
        // Authenticated user — persist to Firestore + auth store.
        await userService.updateHometown(user.id, hometown);
        updateUser({ hometown });
      }
      // Always mirror to AsyncStorage. Anonymous users need it for the
      // RootNavigator gate to clear; authenticated users benefit from a
      // local copy that survives signout (no re-onboarding required).
      await setAnonHometown(hometown);
      // If inside a navigator stack, go back. Otherwise the authStore /
      // anonymous-hometown update causes RootNavigator to switch to the
      // main app automatically.
      if (navigationCtx?.canGoBack()) {
        navigationCtx.goBack();
      }
    } catch {
      Alert.alert('Error', 'Failed to save your hometown. Please try again.');
    }
    setIsSaving(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Text variant="caption" color="gray.500" style={styles.subtitle}>
          Discover history and find Historia users around your hometown.
        </Text>

        {/* Search input */}
        <View
          style={styles.searchRow}
          onLayout={(e) => {
            const { y, height } = e.nativeEvent.layout;
            setDropdownTop(y + height + 4);
          }}
        >
          <Icon name="magnifying-glass" size={15} color={theme.colors.gray[400]} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a city or town…"
            placeholderTextColor={theme.colors.gray[400]}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
          />
          {isSearching && (
            <ActivityIndicator size="small" color={theme.colors.primary[500]} style={styles.searchSpinner} />
          )}
          {searchQuery.length > 0 && !isSearching && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSuggestions([]); }}>
              <Icon name="xmark" size={14} color={theme.colors.gray[400]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search error */}
        {searchError && (
          <Text variant="caption" style={styles.searchError}>{searchError}</Text>
        )}

        {/* Suggestions dropdown (overlays the map, positioned relative to search row) */}
        {suggestions.length > 0 && (
          <View style={[styles.suggestionsContainer, { top: dropdownTop }]}>
            <FlatList
              data={suggestions}
              keyExtractor={item => item.place_id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(item)}
                  activeOpacity={0.7}
                >
                  <Icon name="location-dot" size={13} color={theme.colors.primary[400]} style={styles.suggestionIcon} />
                  <View style={styles.suggestionText}>
                    <Text variant="body" weight="medium" numberOfLines={1}>
                      {item.structured_formatting.main_text}
                    </Text>
                    <Text variant="caption" color="gray.500" numberOfLines={1}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
            />
          </View>
        )}

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            mapStyle={OFFLINE_STYLE_URL}
            logoEnabled={false}
            attributionEnabled={false}
            onRegionWillChange={handleRegionWillChange}
            onRegionDidChange={handleRegionDidChange}
          >
            <MapLibreGL.Camera
              ref={cameraRef}
              defaultSettings={{
                centerCoordinate: DEFAULT_COORD,
                zoomLevel: 9,
              }}
            />
            <MapLibreGL.UserLocation visible renderMode="native" />
          </MapView>

          {/* Pin — tip stays at map center; lifts during drag */}
          <Animated.View
            style={[
              styles.pinOverlay,
              {
                transform: [{
                  translateY: pinLiftAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -14],
                  }),
                }],
              },
            ]}
            pointerEvents="none"
          >
            <Icon name="location-pin" size={44} color={theme.colors.primary[500]} />
          </Animated.View>

          {/* Shadow — stays at map center, shrinks as pin lifts */}
          <Animated.View
            style={[
              styles.pinShadowOverlay,
              {
                transform: [{
                  scale: pinLiftAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.5],
                  }),
                }],
                opacity: pinLiftAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.2, 0.07],
                }),
              },
            ]}
            pointerEvents="none"
          >
            <View style={styles.pinShadow} />
          </Animated.View>

          {/* Locating indicator */}
          {isLocating && (
            <View style={styles.locatingBadge}>
              <ActivityIndicator size="small" color={theme.colors.primary[500]} />
              <Text variant="caption" color="gray.600" style={{ marginLeft: 6 }}>
                Finding your location…
              </Text>
            </View>
          )}
        </View>

        {/* Footer: selected city + confirm button */}
        <View style={styles.footer}>
          <View style={styles.selectedRow}>
            <Icon
              name={selectedCityName ? 'circle-check' : 'location-crosshairs'}
              size={16}
              color={selectedCityName ? theme.colors.success[500] : theme.colors.gray[400]}
            />
            <Text
              variant="body"
              weight={selectedCityName ? 'semibold' : 'normal'}
              style={[styles.selectedCity, !selectedCityName && { color: theme.colors.gray[400] }]}
              numberOfLines={1}
            >
              {selectedCityName || 'Drag the map or search to set your hometown'}
            </Text>
          </View>

          <Button
            variant="primary"
            fullWidth
            onPress={handleSave}
            disabled={!selectedCityName || isSaving}
            style={styles.saveButton}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              'Confirm Hometown'
            )}
          </Button>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  flex: {
    flex: 1,
  },
  subtitle: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.gray[50],
    paddingHorizontal: theme.spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[900],
    padding: 0,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    // top is set dynamically via onLayout on the search row
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    zIndex: 999,
    maxHeight: 260,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: 10,
  },
  suggestionIcon: {
    width: 16,
  },
  suggestionText: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.gray[100],
    marginLeft: theme.spacing.md + 26,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  pinOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    // paddingBottom = pin height so the TIP of the icon lands at the true map center
    paddingBottom: 44,
  },
  pinShadowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinShadow: {
    width: 14,
    height: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,1)',
  },
  locatingBadge: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    ...theme.shadows.md,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[100],
    backgroundColor: theme.colors.white,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  selectedCity: {
    flex: 1,
    color: theme.colors.gray[800],
  },
  saveButton: {
    marginBottom: 0,
  },
  skipNote: {
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  searchError: {
    color: theme.colors.error[500],
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
});

export default SetHometownScreen;
