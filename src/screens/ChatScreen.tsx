import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
} from 'react-native';
import Video from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, MessageBubble, MessageInput, ActionSheet, ReportModal, ImageViewerModal } from '../components/ui';
import { ActionSheetOption } from '../components/ui/ActionSheet';
import { theme } from '../constants/theme';
import { useMessages, useMessageInput, useModeration, useToast } from '../hooks';
import { RootStackScreenProps, CreateMessageData, Conversation } from '../types';
import { FontAwesome6 } from '@react-native-vector-icons/fontawesome6';
import { useHeaderHeight } from '@react-navigation/elements';
import { messagingService } from '../services';
import { useAuthStore } from '../store/authStore';

export const ChatScreen: React.FC<RootStackScreenProps<'ChatScreen'>> = ({
  route,
  navigation,
}) => {
  const { conversationId, otherUserName, otherUserAvatar, otherUserUsername, otherUserId } = route.params;
  const { user } = useAuthStore();
  const currentUserId = user?.id ?? '';
  const headerHeight = useHeaderHeight();

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);

  // Load conversation metadata (type, name, participants)
  useEffect(() => {
    messagingService.getConversation(conversationId).then(conv => {
      if (conv) setConversation(conv);
    });
  }, [conversationId]);

  const isGroup = conversation?.type === 'group';

  const {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    sendMessageWithMedia,
    loadMoreMessages,
    toggleLike,
    markAsRead,
  } = useMessages(conversationId, currentUserId);

  const {
    text,
    setText,
    selectedMedia,
    pickImages,
    removeMedia,
    sharedPost,
    setSharedPost,
    clearAll,
    canSend,
  } = useMessageInput();

  const { blockUser } = useModeration();
  const { showToast } = useToast();
  const flatListRef = useRef<FlatList>(null);

  // Get other user — prefer data from messages, fall back to nav params for new conversations
  const otherUserFromMessages = messages.find(m => m.senderId !== currentUserId)?.sender ?? null;
  const otherUser = otherUserFromMessages ?? (
    otherUserName
      ? { id: otherUserId ?? '', name: otherUserName, avatar: otherUserAvatar, username: otherUserUsername }
      : null
  );

  const handleMorePress = useCallback(() => {
    setShowActionSheet(true);
  }, []);

  // Update native header whenever conversation / otherUser resolves
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => {
        if (isGroup) {
          return (
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('GroupInfo', { conversationId })}
              style={{ flexDirection: 'row', alignItems: 'center' }}
              activeOpacity={0.7}
            >
              <View style={styles.headerGroupAvatar}>
                <FontAwesome6 name="users" size={16} color={theme.colors.primary[500]} iconStyle="solid" />
              </View>
              <View>
                <Text variant="label" weight="semibold" numberOfLines={1}>
                  {conversation?.name ?? 'Group'}
                </Text>
                <Text variant="caption" color="gray.500">
                  {conversation?.participants.length ?? 0} members
                </Text>
              </View>
            </TouchableOpacity>
          );
        }
        if (otherUser) {
          return (
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileView', { userId: otherUser.id })}
              style={{ flexDirection: 'row', alignItems: 'center' }}
              activeOpacity={0.7}
            >
              {otherUser.avatar ? (
                <Image source={{ uri: otherUser.avatar }} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{otherUser.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text variant="label" weight="semibold" numberOfLines={1}>
                {otherUser.name}
              </Text>
            </TouchableOpacity>
          );
        }
        return null;
      },
      headerRight: (isGroup || otherUser) ? () => (
        <TouchableOpacity
          onPress={handleMorePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ marginRight: 4 }}
        >
          <FontAwesome6 name="ellipsis-vertical" size={20} color={theme.colors.gray[600]} iconStyle="solid" />
        </TouchableOpacity>
      ) : undefined,
    });
  }, [conversation, otherUser, isGroup, conversationId, navigation, handleMorePress]);

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
    if (isGroup) {
      return [
        {
          label: 'Group Info',
          icon: 'circle-info',
          onPress: () => (navigation as any).navigate('GroupInfo', { conversationId }),
        },
      ];
    }
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

    const imageUris = selectedMedia.filter(m => m.type === 'image').map(m => m.uri);
    const videoUris = selectedMedia.filter(m => m.type === 'video').map(m => m.uri);

    // Clear input immediately — optimistic message already shows media in the chat
    clearAll();

    try {
      if (imageUris.length > 0 || videoUris.length > 0) {
        await sendMessageWithMedia(messageData, imageUris, videoUris);
      } else {
        await sendMessage(messageData);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  }, [
    canSend,
    conversationId,
    text,
    sharedPost,
    selectedMedia,
    sendMessage,
    sendMessageWithMedia,
    clearAll,
  ]);

  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [videoLightbox, setVideoLightbox] = useState<{ uri: string } | null>(null);

  const handleImagePress = useCallback((images: string[], index: number) => {
    setLightbox({ images, index });
  }, []);

  const handleVideoPress = useCallback((videos: string[], index: number) => {
    setVideoLightbox({ uri: videos[index] });
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
          currentUserId={currentUserId}
          isConsecutive={isConsecutive}
          onLike={toggleLike}
          onImagePress={handleImagePress}
          onVideoPress={handleVideoPress}
          onPostPress={handlePostPress}
          showSenderName={isGroup}
        />
      );
    },
    [messages, toggleLike, handleImagePress, handleVideoPress, handlePostPress]
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
          {otherUser ? `Send ${otherUser.name} a message` : 'Send a message to begin chatting'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Messages list + input — KAV lifts both above keyboard */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
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
        selectedMedia={selectedMedia}
        onPickImages={pickImages}
        onRemoveMedia={removeMedia}
        sharedPost={sharedPost}
        onClearSharedPost={() => setSharedPost(null)}
        onSend={handleSend}
        canSend={canSend}
        placeholder={isGroup ? `Message ${conversation?.name ?? 'group'}...` : `Message ${otherUser?.name || 'user'}...`}
      />
      </KeyboardAvoidingView>

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

      {/* Image lightbox */}
      {lightbox && (
        <ImageViewerModal
          visible={lightbox !== null}
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Video lightbox */}
      {videoLightbox && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setVideoLightbox(null)}
        >
          <View style={styles.videoLightboxContainer}>
            <Video
              source={{ uri: videoLightbox.uri }}
              style={styles.videoLightboxPlayer}
              resizeMode="contain"
              controls
            />
            <TouchableOpacity
              style={styles.videoLightboxClose}
              onPress={() => setVideoLightbox(null)}
            >
              <FontAwesome6 name="xmark" size={20} color={theme.colors.white} iconStyle="solid" />
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: theme.spacing.xs,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGroupAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    marginRight: theme.spacing.xs,
  },
  avatarText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.bold,
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
  videoLightboxContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLightboxPlayer: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  videoLightboxClose: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
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
