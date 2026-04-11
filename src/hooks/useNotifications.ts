import { useState, useEffect, useCallback } from 'react';
import { AppNotification } from '../types';
import { notificationService } from '../services';
import { useToast } from './useToast';

export interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
}

export const useNotifications = (
  userId: string
): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = notificationService.subscribeToNotifications(
      userId,
      incoming => {
        setNotifications(incoming);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = useCallback(
    async (notificationId: string) => {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      await notificationService.markAsRead(notificationId);
    },
    []
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await notificationService.markAllRead(userId);
    } catch {
      showToast('Failed to mark all as read', 'error');
    }
  }, [userId, showToast]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      await notificationService.deleteNotification(notificationId);
    },
    []
  );

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllRead,
    deleteNotification,
  };
};
