/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Required by RNFirebase Messaging: must be registered BEFORE AppRegistry.
// Our pushes carry `notification` + `data`, so the OS renders the banner
// itself — this handler is a no-op but satisfies the library's contract
// and silences the "no background handler" warning on Android.
messaging().setBackgroundMessageHandler(async () => {
  // Intentionally no-op.
});

AppRegistry.registerComponent(appName, () => App);
