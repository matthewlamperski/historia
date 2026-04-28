import { useEffect, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../services/firebaseConfig';

async function requestPushPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  // Android 13+ requires explicit runtime permission for notifications.
  // Older Android versions grant it implicitly — the API returns GRANTED.
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      // String literal keeps this compatible with older RN type defs.
      'android.permission.POST_NOTIFICATIONS' as any,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true;
}

/**
 * Requests FCM notification permission, obtains the device token, and stores
 * it in Firestore under users/{userId}.fcmToken. Keeps the stored token in
 * sync with token refreshes. Foreground/tap handling lives in
 * useNotificationHandlers so it has access to the navigation tree.
 */
export const useFCMToken = (userId: string | null | undefined) => {
  const registerToken = useCallback(async (uid: string) => {
    try {
      const granted = await requestPushPermission();
      if (!granted) return;

      const token = await messaging().getToken();
      if (!token) return;

      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(uid)
        .update({ fcmToken: token });
    } catch (error) {
      // Non-fatal — push notifications are a nice-to-have.
      console.warn('FCM token registration failed:', error);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    registerToken(userId);

    const unsubscribeRefresh = messaging().onTokenRefresh(async newToken => {
      try {
        await firestore()
          .collection(COLLECTIONS.USERS)
          .doc(userId)
          .update({ fcmToken: newToken });
      } catch (error) {
        console.warn('FCM token refresh failed:', error);
      }
    });

    return () => {
      unsubscribeRefresh();
    };
  }, [userId, registerToken]);
};

/** Clears the stored FCM token and deletes the device token. Call on sign-out. */
export async function clearFCMToken(userId: string): Promise<void> {
  try {
    await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({ fcmToken: firestore.FieldValue.delete() });
  } catch (err) {
    console.warn('Failed to clear fcmToken in Firestore:', err);
  }
  try {
    await messaging().deleteToken();
  } catch (err) {
    console.warn('messaging().deleteToken() failed:', err);
  }
}
