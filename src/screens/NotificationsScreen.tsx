import React, { useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/ui';
import { theme } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { RootStackScreenProps, AppNotification } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useNotifications, useCompanions } from '../hooks';
import { useAuthStore } from '../store/authStore';

const timeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const NotificationsScreen = () => {
  const navigation =
    useNavigation<RootStackScreenProps<'Notifications'>['navigation']>();
  const { user } = useAuthStore();
  const userId = user?.id ?? '';

  const { notifications, unreadCount, loading, markAsRead, markAllRead, deleteNotification } =
    useNotifications(userId);

  const { acceptRequest, rejectRequest } = useCompanions(userId, false);

  const handleAccept = useCallback(
    async (notification: AppNotification) => {
      try {
        await acceptRequest(notification.referenceId);
        await deleteNotification(notification.id);
      } catch {
        // toast shown by hook
      }
    },
    [acceptRequest, deleteNotification]
  );

  const handleDecline = useCallback(
    async (notification: AppNotification) => {
      try {
        await rejectRequest(notification.referenceId);
        await deleteNotification(notification.id);
      } catch {
        // toast shown by hook
      }
    },
    [rejectRequest, deleteNotification]
  );

  const handleNotificationPress = useCallback(
    async (notification: AppNotification) => {
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }
      // Navigate to the sender's profile
      navigation.navigate('ProfileView', { userId: notification.senderId });
    },
    [markAsRead, navigation]
  );

  const handleMarkAllRead = useCallback(() => {
    if (unreadCount === 0) return;
    markAllRead();
  }, [unreadCount, markAllRead]);

  useEffect(() => {
    navigation.setOptions({
      title: 'Notifications',
      headerRight: () => (
        <TouchableOpacity
          onPress={handleMarkAllRead}
          disabled={unreadCount === 0}
          style={{ marginRight: 4, opacity: unreadCount === 0 ? 0.4 : 1 }}
        >
          <Text variant="caption" weight="medium" style={{ color: theme.colors.primary[500] }}>
            Mark all read
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [unreadCount, handleMarkAllRead, navigation]);

  const getNotificationText = (notification: AppNotification): string => {
    const name = notification.senderName;
    switch (notification.type) {
      case 'companion_request':
        return `${name} sent you a companion request`;
      case 'companion_accepted':
        return `${name} accepted your companion request`;
      default:
        return `New notification from ${name}`;
    }
  };

  const renderNotification = useCallback(
    ({ item }: { item: AppNotification }) => {
      const isRequest = item.type === 'companion_request';
      return (
        <TouchableOpacity
          style={[
            styles.notificationItem,
            !item.isRead && styles.notificationUnread,
          ]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.75}
        >
          <View style={styles.avatarContainer}>
            {item.senderAvatar ? (
              <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text variant="body" color="white" weight="bold">
                  {item.senderName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.iconBadge}>
              <Icon
                name={isRequest ? 'user-plus' : 'user-check'}
                size={10}
                color={theme.colors.white}
              />
            </View>
          </View>

          <View style={styles.notificationBody}>
            <Text variant="body" style={styles.notificationText}>
              <Text variant="body" weight="semibold">
                {item.senderName}
              </Text>
              {item.type === 'companion_request'
                ? ' sent you a companion request'
                : ' accepted your companion request'}
            </Text>
            <Text variant="caption" color="gray.400" style={styles.timeText}>
              {timeAgo(item.createdAt)}
            </Text>

            {isRequest && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAccept(item)}
                >
                  <Text
                    variant="caption"
                    weight="semibold"
                    style={styles.acceptButtonText}
                  >
                    Accept
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => handleDecline(item)}
                >
                  <Text
                    variant="caption"
                    weight="semibold"
                    style={styles.declineButtonText}
                  >
                    Decline
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!item.isRead && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      );
    },
    [handleNotificationPress, handleAccept, handleDecline]
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Icon name="bell" size={48} color={theme.colors.gray[200]} />
      <Text variant="h4" color="gray.400" style={styles.emptyTitle}>
        No notifications yet
      </Text>
      <Text variant="body" color="gray.300" style={styles.emptySubtitle}>
        Companion requests and updates will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary[500]}
          />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyContainer : undefined
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  notificationUnread: {
    backgroundColor: theme.colors.primary[50],
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  notificationBody: {
    flex: 1,
  },
  notificationText: {
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },
  timeText: {
    marginBottom: theme.spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  acceptButtonText: {
    color: theme.colors.white,
  },
  declineButton: {
    backgroundColor: theme.colors.gray[100],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  declineButtonText: {
    color: theme.colors.gray[700],
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary[500],
    marginTop: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});

export default NotificationsScreen;
