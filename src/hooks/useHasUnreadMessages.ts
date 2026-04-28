import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../services/firebaseConfig';

/**
 * Lightweight realtime listener that returns whether the current user has ANY
 * conversation with an unread count > 0. Used to drive the blue dot on the
 * Messages tab bar icon. Skips hydration and re-fetches on every snapshot —
 * cheap because we only read `unreadCount.{userId}` per doc.
 */
export const useHasUnreadMessages = (userId: string | null | undefined): boolean => {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHasUnread(false);
      return;
    }

    const unsubscribe = firestore()
      .collection(COLLECTIONS.CONVERSATIONS)
      .where('participants', 'array-contains', userId)
      .onSnapshot(
        snapshot => {
          const any = snapshot.docs.some(doc => {
            const counts = doc.data()?.unreadCount;
            const count = counts && typeof counts === 'object' ? counts[userId] : 0;
            return typeof count === 'number' && count > 0;
          });
          setHasUnread(any);
        },
        err => {
          console.warn('useHasUnreadMessages snapshot error:', err);
          setHasUnread(false);
        },
      );

    return unsubscribe;
  }, [userId]);

  return hasUnread;
};
