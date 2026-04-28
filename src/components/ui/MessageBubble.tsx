import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Video from 'react-native-video';
import { Text } from './Text';
import { LevelTag } from './LevelTag';
import { ActionSheet } from './ActionSheet';
import { ReportModal } from './ReportModal';
import { ActionSheetOption } from './ActionSheet';
import { Message } from '../../types';
import { theme } from '../../constants/theme';
import { formatDistanceToNow } from '../../utils/formatters';
import { FontAwesome6 } from '@react-native-vector-icons/fontawesome6';

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  isConsecutive: boolean;
  onLike: (messageId: string) => void;
  onImagePress?: (images: string[], index: number) => void;
  onVideoPress?: (videos: string[], index: number) => void;
  onPostPress?: (postId: string) => void;
  onLandmarkPress?: (landmarkId: string) => void;
  showSenderName?: boolean;
}

const LANDMARK_CATEGORY_ICON: Record<string, string> = {
  monument: 'monument',
  building: 'building-columns',
  site: 'map-pin',
  battlefield: 'flag',
  other: 'landmark',
};

const LANDMARK_CATEGORY_COLOR: Record<string, string> = {
  monument: theme.colors.primary[500],
  building: theme.colors.warning[500],
  site: theme.colors.success[500],
  battlefield: theme.colors.error[500],
  other: theme.colors.secondary[500],
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  isConsecutive,
  onLike,
  onImagePress,
  onVideoPress,
  onPostPress,
  onLandmarkPress,
  showSenderName = false,
}) => {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const isSender = message.senderId === currentUserId;
  const isLiked = message.likes.includes(currentUserId);

  const handleLongPress = () => {
    // Only show report option for messages from other users
    if (!isSender) {
      setShowActionSheet(true);
    }
  };

  const getActionSheetOptions = (): ActionSheetOption[] => {
    return [
      {
        label: 'Report Message',
        icon: 'flag',
        onPress: () => setShowReportModal(true),
      },
    ];
  };

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      activeOpacity={0.9}
      delayLongPress={500}
    >
    <View
      style={[
        styles.container,
        isSender ? styles.sentContainer : styles.receivedContainer,
      ]}
    >
      {/* Avatar (only for received messages, not consecutive) */}
      {!isSender && !isConsecutive && (
        <View style={styles.avatarContainer}>
          {message.sender.avatar ? (
            <Image
              source={{ uri: message.sender.avatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {message.sender.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Spacer for consecutive received messages */}
      {!isSender && isConsecutive && <View style={styles.avatarSpacer} />}

      {/* Message content */}
      <View style={styles.messageContent}>
        {/* Sender name for group chats */}
        {showSenderName && !isSender && !isConsecutive && (
          <View style={styles.senderRow}>
            <Text variant="caption" weight="semibold" style={styles.senderName}>
              {message.sender.name}
            </Text>
            <LevelTag
              points={message.sender.pointsBalance}
              isPremium={message.sender.isPremium}
              size="compact"
            />
          </View>
        )}

        {/* Message bubble — only rendered when there's actual bubble content
            (text / images / videos / post reference). A lone landmark renders
            below with no bubble. */}
        {(message.text ||
          message.images.length > 0 ||
          (message.videos ?? []).length > 0 ||
          message.postReference) && (
        <View
          style={[
            styles.bubble,
            isSender ? styles.sentBubble : styles.receivedBubble,
            message.isEmojiOnly && styles.emojiBubble,
          ]}
        >
          {/* Text content */}
          {message.text && (
            <Text
              style={[
                styles.text,
                isSender ? styles.sentText : styles.receivedText,
                message.isEmojiOnly && styles.emojiText,
              ]}
            >
              {message.text}
            </Text>
          )}

          {/* Images */}
          {message.images.length > 0 && (
            <View style={styles.imagesContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imagesScroll}
              >
                {message.images.map((uri, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => onImagePress?.(message.images, idx)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri }}
                      style={[
                        styles.messageImage,
                        idx > 0 && styles.messageImageSpacing,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Videos */}
          {(message.videos ?? []).length > 0 && (
            <View style={styles.imagesContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imagesScroll}
              >
                {(message.videos ?? []).map((uri, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => onVideoPress?.(message.videos!, idx)}
                    activeOpacity={0.8}
                    style={[styles.videoWrapper, idx > 0 && styles.messageImageSpacing]}
                  >
                    <Video
                      source={{ uri }}
                      style={styles.messageImage}
                      paused
                      resizeMode="cover"
                    />
                    <View style={styles.videoPlayOverlay}>
                      <FontAwesome6
                        name="play"
                        size={20}
                        color={theme.colors.white}
                        iconStyle="solid"
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Post reference */}
          {message.postReference && (
            <TouchableOpacity
              style={styles.postPreview}
              onPress={() => onPostPress?.(message.postReference!.postId)}
              activeOpacity={0.7}
            >
              <View style={styles.postHeader}>
                <FontAwesome6
                  name="share-from-square"
                  size={14}
                  color={theme.colors.gray[600]}
                  style={styles.postIcon}
                />
                <Text variant="caption" weight="medium" color="gray.700">
                  {message.postReference.userName}
                </Text>
              </View>
              <Text
                variant="body"
                color="gray.900"
                numberOfLines={3}
                style={styles.postContent}
              >
                {message.postReference.content}
              </Text>
              {message.postReference.images[0] && (
                <Image
                  source={{ uri: message.postReference.images[0] }}
                  style={styles.postImage}
                />
              )}
            </TouchableOpacity>
          )}
        </View>
        )}

        {/* Landmark reference — rendered as a standalone card outside the
            bubble so it never sits inside a chat bubble. */}
        {message.landmarkReference && (
          <TouchableOpacity
            style={styles.landmarkStandalone}
            onPress={() =>
              onLandmarkPress?.(message.landmarkReference!.landmarkId)
            }
            activeOpacity={0.85}
          >
            {message.landmarkReference.image ? (
              <Image
                source={{ uri: message.landmarkReference.image }}
                style={styles.landmarkHero}
              />
            ) : (
              <View
                style={[
                  styles.landmarkHero,
                  styles.landmarkHeroFallback,
                  {
                    backgroundColor:
                      LANDMARK_CATEGORY_COLOR[
                        message.landmarkReference.category
                      ] ?? theme.colors.primary[500],
                  },
                ]}
              >
                <FontAwesome6
                  name={
                    (LANDMARK_CATEGORY_ICON[
                      message.landmarkReference.category
                    ] ?? 'landmark') as any
                  }
                  size={40}
                  color={theme.colors.white}
                  iconStyle="solid"
                />
              </View>
            )}
            <View style={styles.landmarkTitleRow}>
              <FontAwesome6
                name="location-dot"
                size={12}
                color={theme.colors.primary[600]}
                iconStyle="solid"
              />
              <Text
                variant="body"
                weight="semibold"
                color="gray.900"
                numberOfLines={2}
                style={styles.landmarkTitle}
              >
                {message.landmarkReference.name}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Message footer (timestamp + like) */}
        <View
          style={[
            styles.footer,
            isSender ? styles.sentFooter : styles.receivedFooter,
          ]}
        >
          <Text variant="caption" color="gray.500" style={styles.timestamp}>
            {formatDistanceToNow(message.timestamp)}
          </Text>
          <TouchableOpacity
            onPress={() => onLike(message.id)}
            style={styles.likeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome6
              name="heart"
              size={14}
              iconStyle={isLiked ? 'solid' : 'regular'}
              color={
                isLiked ? theme.colors.error[500] : theme.colors.gray[500]
              }
            />
            {message.likes.length > 0 && (
              <Text
                variant="caption"
                color={isLiked ? 'error.500' : 'gray.500'}
                style={styles.likeCount}
              >
                {message.likes.length}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Sheet */}
      <ActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        options={getActionSheetOptions()}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedId={message.id}
        reportedType="message"
        reportedUserId={message.senderId}
        contentSnapshot={{
          content: message.text,
          images: message.images,
          userName: message.sender.name,
        }}
      />
    </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    maxWidth: '100%',
  },
  sentContainer: {
    justifyContent: 'flex-end',
  },
  receivedContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: theme.spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  avatarSpacer: {
    width: 32,
    marginRight: theme.spacing.sm,
  },
  messageContent: {
    maxWidth: '75%',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    marginLeft: theme.spacing.xs,
  },
  senderName: {
    color: theme.colors.primary[600],
  },
  bubble: {
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  sentBubble: {
    backgroundColor: theme.colors.primary[500],
    borderTopRightRadius: theme.borderRadius.sm,
  },
  receivedBubble: {
    backgroundColor: theme.colors.gray[200],
    borderTopLeftRadius: theme.borderRadius.sm,
  },
  emojiBubble: {
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  text: {
    fontSize: theme.fontSize.base,
    lineHeight: 20,
  },
  sentText: {
    color: theme.colors.white,
  },
  receivedText: {
    color: theme.colors.gray[900],
  },
  emojiText: {
    fontSize: 48,
    lineHeight: 56,
  },
  imagesContainer: {
    marginTop: theme.spacing.sm,
  },
  imagesScroll: {
    flexDirection: 'row',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: theme.borderRadius.lg,
  },
  messageImageSpacing: {
    marginLeft: theme.spacing.sm,
  },
  videoWrapper: {
    position: 'relative',
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: theme.borderRadius.lg,
  },
  postPreview: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  postIcon: {
    marginRight: theme.spacing.xs,
  },
  postContent: {
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  postImage: {
    width: '100%',
    height: 120,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs,
  },
  landmarkCard: {
    marginTop: theme.spacing.xs,
    width: 240,
    gap: 6,
  },
  landmarkStandalone: {
    marginTop: theme.spacing.xs,
    width: 240,
    gap: 6,
  },
  landmarkHero: {
    width: '100%',
    height: 140,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.gray[200],
  },
  landmarkHeroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  landmarkTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  landmarkTitle: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  sentFooter: {
    justifyContent: 'flex-end',
  },
  receivedFooter: {
    justifyContent: 'flex-start',
  },
  timestamp: {
    fontSize: theme.fontSize.xs,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  likeCount: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.fontSize.xs,
  },
});
