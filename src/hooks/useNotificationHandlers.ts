import { useEffect, useRef } from 'react';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import Toast from 'react-native-toast-message';
import { navigationRef } from '../navigation/navigationRef';

type RemoteMessage = FirebaseMessagingTypes.RemoteMessage;

type NotificationData = {
  type?: string;
  conversationId?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  senderUsername?: string;
};

function parseData(message: RemoteMessage | null): NotificationData {
  const raw = (message?.data ?? {}) as Record<string, unknown>;
  const result: NotificationData = {};
  for (const key of Object.keys(raw)) {
    const value = raw[key];
    if (typeof value === 'string') {
      (result as Record<string, string>)[key] = value;
    }
  }
  return result;
}

function routeFromNotification(message: RemoteMessage | null): void {
  if (!navigationRef.isReady()) return;
  const data = parseData(message);
  switch (data.type) {
    case 'new_message': {
      if (!data.conversationId) return;
      navigationRef.navigate('ChatScreen', {
        conversationId: data.conversationId,
        otherUserId: data.senderId,
        otherUserName: data.senderName,
        otherUserAvatar: data.senderAvatar,
        otherUserUsername: data.senderUsername,
      });
      return;
    }
    // Extend here as new notification types are added.
    default:
      return;
  }
}

/**
 * Wires FCM delivery callbacks to the app:
 *   • foreground  → bottom toast (iOS/Android suppress OS banners while the app is focused)
 *   • background tap → deep-link into the right screen via the root navigation ref
 *   • killed-state tap → same, via getInitialNotification() on mount
 *
 * Mount ONCE at the app root (App.tsx).
 */
export const useNotificationHandlers = (): void => {
  const handledInitialRef = useRef(false);

  useEffect(() => {
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      const title = remoteMessage.notification?.title ?? 'New notification';
      const body = remoteMessage.notification?.body ?? '';
      Toast.show({
        type: 'info',
        text1: title,
        text2: body || undefined,
        position: 'bottom',
        bottomOffset: 60,
        visibilityTime: 4000,
        autoHide: true,
        onPress: () => {
          Toast.hide();
          routeFromNotification(remoteMessage);
        },
      });
    });

    const unsubscribeOpened = messaging().onNotificationOpenedApp(
      remoteMessage => routeFromNotification(remoteMessage),
    );

    if (!handledInitialRef.current) {
      handledInitialRef.current = true;
      messaging()
        .getInitialNotification()
        .then(remoteMessage => {
          if (remoteMessage) routeFromNotification(remoteMessage);
        })
        .catch(err => console.warn('getInitialNotification failed:', err));
    }

    return () => {
      unsubscribeForeground();
      unsubscribeOpened();
    };
  }, []);
};
