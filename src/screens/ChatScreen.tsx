import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, MessageBubble, MessageInput, ActionSheet, ReportModal } from '../components/ui';
import { ActionSheetOption } from '../components/ui/ActionSheet';
import { theme } from '../constants/theme';
import { useMessages, useMessageInput, useModeration, useToast } from '../hooks';
import { RootStackScreenProps, CreateMessageData } from '../types';
import { FontAwesome6 } from '@react-native-vector-icons/fontawesome6';

const MOCK_USER_ID = 'mock-user-id'; // TODO: Replace with actual user ID from auth store

export const ChatScreen: React.FC<RootStackScreenProps<'ChatScreen'>> = ({
  route,
  navigation,
}) => {
  const { conversationId } = route.params;

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    sendMessageWithImages,
    loadMoreMessages,
    toggleLike,
    markAsRead,
  } = useMessages(conversationId, MOCK_USER_ID);

  const {
    text,
    setText,
    selectedImages,
    pickImages,
    removeImage,
    sharedPost,
    setSharedPost,
    clearAll,
    canSend,
  } = useMessageInput();

  const { blockUser } = useModeration();
  const { showToast } = useToast();
  const flatListRef = useRef<FlatList>(null);

  // Get other user from messages
  const otherUser =
    messages.length > 0
      ? messages.find(m => m.senderId !== MOCK_USER_ID)?.sender
      : null;

  const handleMorePress = () => {
    setShowActionSheet(true);
  };

  const handleBlockUser = useCallback(async () => {
    if (!otherUser) return;

    Alert.alert(
      'Block User',
      `Are you sure you want to block ${otherUser.name}? They won't be able to send you messages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(otherUser.id);
              showToast(`${otherUser.name} has been blocked`, 'success');
              navigation.goBack();
            } catch (err) {
              showToast('Failed to block user', 'error');
            }
          },
        },
      ]
    );
  }, [otherUser, blockUser, showToast, navigation]);

  const getActionSheetOptions = (): ActionSheetOption[] => {
    return [
      {
        label: 'Report User',
        icon: 'flag',
        onPress: () => setShowReportModal(true),
      },
      {
        label: 'Block User',
        icon: 'user-slash',
        onPress: handleBlockUser,
        destructive: true,
      },
    ];
  };

  // Mark as read on mount and when messages change
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    const messageData: CreateMessageData = {
      conversationId,
      text: text.trim(),
      images: [],
      postReference: sharedPost
        ? {
            postId: sharedPost.id,
            content: sharedPost.content,
            images: sharedPost.images,
            userId: sharedPost.userId,
            userName: sharedPost.user.name,
          }
        : undefined,
    };

    try {
      if (selectedImages.length > 0) {
        await sendMessageWithImages(messageData, selectedImages);
      } else {
        await sendMessage(messageData);
      }
      clearAll();
    } catch (err) {
      console.error('Error sending message:', err);
    }
  }, [
    canSend,
    conversationId,
    text,
    sharedPost,
    selectedImages,
    sendMessage,
    sendMessageWithImages,
    clearAll,
  ]);

  const handleImagePress = useCallback((uri: string) => {
    // TODO: Open image viewer
    console.log('Open image:', uri);
  }, []);

  const handlePostPress = useCallback(
    (postId: string) => {
      // TODO: Navigate to post detail
      console.log('Navigate to post:', postId);
    },
    []
  );

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadMoreMessages();
    }
  }, [hasMore, loading, loadMoreMessages]);

  const renderMessage = useCallback(
    ({ item, index }: any) => {
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const isConsecutive = prevMessage?.senderId === item.senderId;

      return (
        <MessageBubble
          message={item}
          currentUserId={MOCK_USER_ID}
          isConsecutive={isConsecutive}
          onLike={toggleLike}
          onImagePress={handleImagePress}
          onPostPress={handlePostPress}
        />
      );
    },
    [messages, toggleLike, handleImagePress, handlePostPress]
  );

  const renderHeader = () => {
    if (!loading || messages.length > 0) return null;

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary[500]} />
      </View>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <FontAwesome6
          name="comment"
          size={64}
          color={theme.colors.gray[400]}
          iconStyle="regular"
        />
        <Text variant="h3" color="gray.400" style={styles.emptyTitle}>
          Start the conversation
        </Text>
        <Text variant="body" color="gray.500" style={styles.emptyText}>
          Send a message to begin chatting
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome6
            name="chevron-left"
            size={24}
            color={theme.colors.gray[900]}
            iconStyle="solid"
          />
        </TouchableOpacity>

        {otherUser && (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('ProfileView', { userId: otherUser.id })
            }
            style={styles.userInfo}
            activeOpacity={0.7}
          >
            {otherUser.avatar ? (
              <Image
                source={{ uri: otherUser.avatar }}
                style={styles.headerAvatar}
              />
            ) : (
              <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {otherUser.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text variant="h4" style={styles.headerName}>
              {otherUser.name}
            </Text>
          </TouchableOpacity>
        )}

        {otherUser && (
          <TouchableOpacity
            onPress={handleMorePress}
            style={styles.moreButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome6
              name="ellipsis-vertical"
              size={20}
              color={theme.colors.gray[600]}
              iconStyle="solid"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages list */}
      <View style={styles.content}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={
            messages.length === 0
              ? styles.emptyListContainer
              : styles.listContainer
          }
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          showsVerticalScrollIndicator={false}
          inverted={false}
        />
      </View>

      {/* Message input */}
      <MessageInput
        text={text}
        onChangeText={setText}
        selectedImages={selectedImages}
        onPickImages={pickImages}
        onRemoveImage={removeImage}
        sharedPost={sharedPost}
        onClearSharedPost={() => setSharedPost(null)}
        onSend={handleSend}
        canSend={canSend}
        placeholder={`Message ${otherUser?.name || 'user'}...`}
      />

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text variant="caption" color="error.500">
            {error}
          </Text>
        </View>
      )}

      {/* Action Sheet */}
      <ActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        options={getActionSheetOptions()}
      />

      {/* Report Modal */}
      {otherUser && (
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportedId={otherUser.id}
          reportedType="user"
          reportedUserId={otherUser.id}
          contentSnapshot={{
            userName: otherUser.name,
          }}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  backButton: {
    marginRight: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.sm,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  headerName: {
    flex: 1,
  },
  moreButton: {
    padding: theme.spacing.xs,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyContainer: {
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
  loadingContainer: {
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
});
