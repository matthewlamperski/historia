import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeListView } from 'react-native-swipe-list-view';
import { Text, ConversationListItem, ActionSheet } from '../components/ui';
import { ActionSheetOption } from '../components/ui/ActionSheet';
import { theme } from '../constants/theme';
import { useConversations } from '../hooks';
import { TabScreenProps } from '../types';
import { FontAwesome6 } from '@react-native-vector-icons/fontawesome6';
import { useAuthStore } from '../store/authStore';

const MessagesTab: React.FC<TabScreenProps<'Messages'>> = ({ navigation }) => {
  const { user } = useAuthStore();
  const currentUserId = user?.id ?? '';
  const [showComposeSheet, setShowComposeSheet] = useState(false);

  const composeOptions: ActionSheetOption[] = [
    {
      label: 'New Message',
      icon: 'comment',
      onPress: () => (navigation as any).navigate('NewConversation'),
    },
    {
      label: 'New Group',
      icon: 'users',
      onPress: () => (navigation as any).navigate('NewGroup'),
    },
  ];

  const {
    conversations,
    loading,
    refreshing,
    error,
    hasMore,
    loadMoreConversations,
    refreshConversations,
    markAsRead,
    deleteConversation,
  } = useConversations(currentUserId);

  const handleConversationPress = useCallback(
    (conversationId: string) => {
      markAsRead(conversationId);
      const conversation = conversations.find(c => c.id === conversationId);
      const otherUser = conversation?.type !== 'group'
        ? conversation?.participantDetails.find(p => p.id !== currentUserId)
        : undefined;
      (navigation as any).navigate('ChatScreen', {
        conversationId,
        otherUserId: otherUser?.id,
        otherUserName: otherUser?.name,
        otherUserAvatar: otherUser?.avatar,
        otherUserUsername: otherUser?.username,
      });
    },
    [navigation, markAsRead, conversations, currentUserId]
  );

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadMoreConversations();
    }
  }, [hasMore, loading, loadMoreConversations]);

  const handleDelete = useCallback(
    (conversationId: string) => {
      deleteConversation(conversationId);
    },
    [deleteConversation]
  );

  const renderConversation = useCallback(
    ({ item }: any) => (
      <View style={styles.rowFront}>
        <ConversationListItem
          conversation={item}
          currentUserId={currentUserId}
          onPress={handleConversationPress}
        />
      </View>
    ),
    [handleConversationPress]
  );

  const renderHiddenItem = useCallback(
    ({ item }: any) => (
      <View style={styles.rowBack}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <FontAwesome6
            name="trash"
            size={20}
            color={theme.colors.white}
            iconStyle="solid"
          />
          <Text variant="body" color="white" style={styles.deleteText}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [handleDelete]
  );

  const renderEmptyState = () => {
    if (loading && conversations.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <FontAwesome6
          name="comments"
          size={64}
          color={theme.colors.gray[400]}
          iconStyle="regular"
        />
        <Text variant="h3" color="gray.400" style={styles.emptyTitle}>
          No Messages Yet
        </Text>
        <Text variant="body" color="gray.500" style={styles.emptyText}>
          Search for a handle to start a conversation
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading || conversations.length === 0) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.colors.primary[500]} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="h2">Messages</Text>
        <TouchableOpacity
          style={styles.composeBtn}
          onPress={() => setShowComposeSheet(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FontAwesome6
            name="pen-to-square"
            size={20}
            color={theme.colors.primary[500]}
            iconStyle="regular"
          />
        </TouchableOpacity>
      </View>

      {/* Conversation list */}
      <SwipeListView
        data={conversations}
        renderItem={renderConversation}
        renderHiddenItem={renderHiddenItem}
        keyExtractor={item => item.id}
        contentContainerStyle={
          conversations.length === 0 ? styles.emptyContainer : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshConversations}
            tintColor={theme.colors.primary[500]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        rightOpenValue={-100}
        disableRightSwipe
        stopRightSwipe={-100}
      />

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text variant="caption" color="error.500">
            {error}
          </Text>
        </View>
      )}

      {/* Compose action sheet */}
      <ActionSheet
        visible={showComposeSheet}
        onClose={() => setShowComposeSheet(false)}
        options={composeOptions}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
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
  composeBtn: {
    padding: theme.spacing.xs,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
  },
  footer: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  errorContainer: {
    position: 'absolute',
    bottom: theme.spacing.md,
    left: theme.spacing.md,
    right: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.error[50],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error[200],
  },
  rowFront: {
    backgroundColor: theme.colors.white,
    flex: 1,
  },
  rowBack: {
    alignItems: 'center',
    backgroundColor: theme.colors.error[500],
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: '100%',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.error[500],
  },
  deleteText: {
    fontWeight: theme.fontWeight.semibold,
  },
});

export default MessagesTab;
