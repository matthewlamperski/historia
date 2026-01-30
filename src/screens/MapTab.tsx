import React, { useMemo, useRef, useCallback, useState } from 'react';
import { View, StyleSheet, Text, Image, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import MapView, { Marker } from 'react-native-maps';
import LocationSwitcherHeader from '../components/ui/LocationSwitcherHeader';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Landmark } from '../types';

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

const { width: screenWidth } = Dimensions.get('window');

const MapTab = () => {
  const { top } = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);

  // Bottom sheet snap points
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  // Handle marker press
  const handleMarkerPress = useCallback((landmark: Landmark) => {
    setSelectedLandmark(landmark);
    bottomSheetRef.current?.expand();
  }, []);

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

  // Get category color
  const getCategoryColor = (category: Landmark['category']) => {
    switch (category) {
      case 'monument':
        return theme.colors.primary[500];
      case 'building':
        return theme.colors.warning[500];
      case 'site':
        return theme.colors.success[500];
      case 'battlefield':
        return theme.colors.error[500];
      default:
        return theme.colors.secondary[500];
    }
  };

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
        <BottomSheetView style={styles.bottomSheetContent}>
          {selectedLandmark && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header Image */}
              <Image
                source={{ uri: selectedLandmark.images[0] }}
                style={styles.landmarkImage}
                resizeMode="cover"
              />
              
              {/* Content */}
              <View style={styles.landmarkContent}>
                {/* Title and Category */}
                <View style={styles.landmarkHeader}>
                  <Text style={styles.landmarkTitle}>{selectedLandmark.name}</Text>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(selectedLandmark.category) }]}>
                    <Text style={styles.categoryText}>
                      {selectedLandmark.category.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Year and Address */}
                <View style={styles.landmarkMeta}>
                  {selectedLandmark.yearBuilt && (
                    <Text style={styles.yearText}>Built in {selectedLandmark.yearBuilt}</Text>
                  )}
                  <Text style={styles.addressText}>{selectedLandmark.address}</Text>
                </View>

                {/* Description */}
                <Text style={styles.descriptionText}>{selectedLandmark.description}</Text>

                {/* Historical Significance */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Historical Significance</Text>
                  <Text style={styles.sectionText}>{selectedLandmark.historicalSignificance}</Text>
                </View>

                {/* Visiting Information */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Visit Information</Text>
                  {selectedLandmark.visitingHours && (
                    <Text style={styles.sectionText}>Hours: {selectedLandmark.visitingHours}</Text>
                  )}
                  {selectedLandmark.website && (
                    <TouchableOpacity style={styles.websiteButton}>
                      <Text style={styles.websiteText}>Visit Website</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>
          )}
        </BottomSheetView>
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
  },
  map: {
    flex: 1,
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
  bottomSheetContent: {
    flex: 1,
  },
  landmarkImage: {
    width: screenWidth,
    height: 200,
  },
  landmarkContent: {
    padding: theme.spacing.md,
  },
  landmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  landmarkTitle: {
    flex: 1,
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    marginRight: theme.spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  categoryText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.white,
  },
  landmarkMeta: {
    marginBottom: theme.spacing.md,
  },
  yearText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary[600],
    marginBottom: theme.spacing.xs,
  },
  addressText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
  },
  descriptionText: {
    fontSize: theme.fontSize.base,
    lineHeight: 24,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
    marginBottom: theme.spacing.sm,
  },
  sectionText: {
    fontSize: theme.fontSize.base,
    lineHeight: 22,
    color: theme.colors.gray[700],
  },
  websiteButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
  },
  websiteText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.white,
  },
});

export default MapTab;