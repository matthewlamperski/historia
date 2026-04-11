import { Alert, Linking, Platform } from 'react-native';

/**
 * Opens turn-by-turn directions to a coordinate.
 * On iOS: prompts the user to choose Apple Maps or Google Maps.
 * On Android: opens Google Maps directly (app if installed, web otherwise).
 */
export function openDirections(
  latitude: number,
  longitude: number,
  name: string,
): void {
  const label = encodeURIComponent(name);
  const googleScheme = `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`;
  const googleWeb = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  const appleMaps = `maps://app?daddr=${latitude},${longitude}&q=${label}`;

  const openGoogle = () => {
    Linking.canOpenURL(googleScheme).then(installed => {
      Linking.openURL(installed ? googleScheme : googleWeb);
    });
  };

  if (Platform.OS === 'ios') {
    Alert.alert('Open in Maps', undefined, [
      { text: 'Apple Maps', onPress: () => Linking.openURL(appleMaps) },
      { text: 'Google Maps', onPress: openGoogle },
      { text: 'Cancel', style: 'cancel' },
    ]);
  } else {
    openGoogle();
  }
}
