import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
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
import Icon from 'react-native-vector-icons/FontAwesome6';
import { Text } from './Text';
import { Button } from './Button';
import { theme } from '../../constants/theme';
import { GOOGLE_PLACES_API_KEY } from '../../constants/googlePlaces';
import { OFFLINE_STYLE_URL } from '../../services/offlineMapService';

MapLibreGL.setAccessToken(null);
const MapView = MapLibreGL.MapView as React.ComponentType<any>;

const DEFAULT_COORD: [number, number] = [-84.512, 39.106];

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PickedLocation {
  latitude: number;
  longitude: number;
  city: string;
}

interface LocationPickerModalProps {
  visible: boolean;
  onConfirm: (location: PickedLocation) => void;
  onCancel: () => void;
  initialLocation?: PickedLocation;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  onConfirm,
  onCancel,
  initialLocation,
}) => {
  const cameraRef = useRef<any>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseGeocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticMoveRef = useRef(false);

  const [selectedCoord, setSelectedCoord] = useState<[number, number]>(DEFAULT_COORD);
  const [selectedCityName, setSelectedCityName] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dropdownTop, setDropdownTop] = useState(120);

  const pinLiftAnim = useRef(new Animated.Value(0)).current;

  // Initialize from initialLocation or geolocate when modal opens
  useEffect(() => {
    if (!visible) return;
    if (initialLocation) {
      const coord: [number, number] = [initialLocation.longitude, initialLocation.latitude];
      programmaticMoveRef.current = true;
      setSelectedCoord(coord);
      setSelectedCityName(initialLocation.city);
      setTimeout(() => {
        cameraRef.current?.setCamera({
          centerCoordinate: coord,
          zoomLevel: 10,
          animationDuration: 0,
        });
      }, 100);
    } else {
      setIsLocating(true);
      setSelectedCoord(DEFAULT_COORD);
      setSelectedCityName('');
      geolocate();
    }
    setSearchQuery('');
    setSuggestions([]);
    setSearchError(null);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const geolocate = () => {
    if (Platform.OS === 'android') {
      const { PermissionsAndroid } = require('react-native');
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then(
        (granted: string) => {
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setIsLocating(false);
            return;
          }
          doGeolocate();
        }
      );
    } else {
      doGeolocate();
    }
  };

  const doGeolocate = () => {
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        const coord: [number, number] = [longitude, latitude];
        programmaticMoveRef.current = true;
        setSelectedCoord(coord);
        cameraRef.current?.setCamera({
          centerCoordinate: coord,
          zoomLevel: 11,
          animationDuration: 1000,
          animationMode: 'flyTo',
        });
        reverseGeocode(latitude, longitude);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

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
    } catch {
      setSelectedCityName(`${lat.toFixed(3)}, ${lng.toFixed(3)}`);
    }
  }, []);

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
        setSearchError(
          data.status === 'REQUEST_DENIED'
            ? 'Search unavailable — API key not authorized'
            : 'Search unavailable. Try again.'
        );
        setSuggestions([]);
      } else {
        setSuggestions(data.predictions || []);
      }
    } catch {
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
        Alert.alert('Error', 'Could not load location details. Please try again.');
        return;
      }
      const loc = data.result?.geometry?.location;
      if (loc) {
        const coord: [number, number] = [loc.lng, loc.lat];
        programmaticMoveRef.current = true;
        setSelectedCoord(coord);
        setSelectedCityName(place.structured_formatting.main_text + (place.structured_formatting.secondary_text ? `, ${place.structured_formatting.secondary_text.split(',')[0]}` : ''));
        cameraRef.current?.setCamera({
          centerCoordinate: coord,
          zoomLevel: 11,
          animationDuration: 1000,
          animationMode: 'flyTo',
        });
      }
    } catch {
      Alert.alert('Error', 'Could not load location details. Check your connection.');
    }
  };

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
      if (reverseGeocodeDebounceRef.current) clearTimeout(reverseGeocodeDebounceRef.current);
      reverseGeocodeDebounceRef.current = setTimeout(() => reverseGeocode(lat, lng), 400);
    },
    [reverseGeocode, pinLiftAnim]
  );

  const handleConfirm = () => {
    if (!selectedCityName) return;
    const [lng, lat] = selectedCoord;
    onConfirm({ latitude: lat, longitude: lng, city: selectedCityName });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Text variant="label" color="gray.600">Cancel</Text>
          </TouchableOpacity>
          <Text variant="h3">Select Location</Text>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!selectedCityName}
            style={[styles.headerBtn, !selectedCityName && styles.headerBtnDisabled]}
          >
            <Text variant="label" color={selectedCityName ? 'primary.600' : 'gray.400'}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Search input */}
          <View
            style={styles.searchRow}
            onLayout={e => {
              const { y, height } = e.nativeEvent.layout;
              setDropdownTop(y + height + 4);
            }}
          >
            <Icon name="magnifying-glass" size={15} color={theme.colors.gray[400]} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a city, town, or place…"
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

          {searchError && (
            <Text variant="caption" style={styles.searchError}>{searchError}</Text>
          )}

          {/* Suggestions dropdown */}
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

            {isLocating && (
              <View style={styles.locatingBadge}>
                <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                <Text variant="caption" color="gray.600" style={{ marginLeft: 6 }}>
                  Finding your location…
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
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
                {selectedCityName || 'Drag the map or search to select a location'}
              </Text>
            </View>

            <Button
              variant="primary"
              fullWidth
              onPress={handleConfirm}
              disabled={!selectedCityName}
            >
              Confirm Location
            </Button>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  headerBtn: {
    minWidth: 60,
  },
  headerBtnDisabled: {
    opacity: 0.4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
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
  searchError: {
    color: theme.colors.error[500],
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  suggestionsContainer: {
    position: 'absolute',
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
});
