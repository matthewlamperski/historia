import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../services/firebaseConfig';

/**
 * Requests FCM notification permission, obtains the device token,
 * stores it in Firestore under users/{userId}.fcmToken, and sets up
 * a foreground message listener that logs incoming pushes (you can
 * extend this to drive local UI updates).
 */
export const useFCMToken = (userId: string | null | undefined) => {
  const registerToken = useCallback(async (uid: string) => {
    try {
      // iOS: request permission
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const isGranted =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        if (!isGranted) return;
      }

      // Get the FCM token
      const token = await messaging().getToken();
      if (!token) return;

      // Store it in the user's Firestore document
      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(uid)
        .update({ fcmToken: token });
    } catch (error) {
      // Non-fatal — push notifications are a nice-to-have
      console.warn('FCM token registration failed:', error);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    registerToken(userId);

    // Handle token refresh
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

    // Handle foreground messages (when app is open)
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      // The in-app notification center already updates via Firestore listener.
      // This handler is kept for extensibility (e.g. playing a sound).
      console.log('FCM foreground message:', remoteMessage.notification?.title);
    });

    return () => {
      unsubscribeRefresh();
      unsubscribeForeground();
    };
  }, [userId, registerToken]);
};
