import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import Video from 'react-native-video';
import { Text } from '../ui';
import { ActionSheet, ActionSheetOption } from './ActionSheet';
import { ReportModal } from './ReportModal';
import { ImageViewerModal } from './ImageViewerModal';
import { theme } from '../../constants/theme';
import { Post as PostType, Landmark } from '../../types';
import { formatDistanceToNow } from '../../utils/formatters';
import { moderationService } from '../../services/moderationService';
import { useToast } from '../../hooks/useToast';
import { useModeration } from '../../context/ModerationContext';
import Icon from 'react-native-vector-icons/FontAwesome6';

interface PostProps {
  post: PostType;
  onComment: (postId: string) => void;
  onShare?: (postId: string) => void;
  onUserPress?: (userId: string) => void;
  onDelete?: (postId: string) => void;
  onLandmarkPress?: (landmark: Landmark) => void;
  currentUserId?: string;
  showFullContent?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const imageWidth = screenWidth - theme.spacing.lg * 2;

export const Post: React.FC<PostProps> = ({
  post,
  onComment,
  onUserPress,
  onDelete,
  onLandmarkPress,
  currentUserId = '',
  showFullContent = false,
}) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();
  const { isUserMuted, muteUser, unmuteUser } = useModeration();

  const isOwnPost = post.userId === currentUserId;

  const handleComment = () => {
    onComment(post.id);
  };

  const handleUserPress = () => {
    if (onUserPress) {
      onUserPress(post.userId);
    }
  };

  const handleMorePress = () => {
    setShowActionSheet(true);
  };

  const handleDeletePost = useCallback(async () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await moderationService.deletePost(post.id, currentUserId);
              showToast('Post deleted successfully', 'success');
              onDelete?.(post.id);
            } catch (error) {
              console.error('Error deleting post:', error);
              showToast('Failed to delete post', 'error');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [post.id, currentUserId, showToast, onDelete]);

  const handleToggleMute = useCallback(async () => {
    const muted = isUserMuted(post.userId);
    try {
      if (muted) {
        await unmuteUser(post.userId);
        showToast(`${post.user.name} unmuted`, 'success');
      } else {
        await muteUser(post.userId);
        showToast(`${post.user.name} muted`, 'success');
      }
    } catch {
      showToast('Failed to update mute status', 'error');
    }
  }, [post.userId, post.user.name, isUserMuted, muteUser, unmuteUser, showToast]);

  const getActionSheetOptions = (): ActionSheetOption[] => {
    if (isOwnPost) {
      return [
        {
          label: 'Delete Post',
          icon: 'trash',
          onPress: handleDeletePost,
          destructive: true,
        },
      ];
    }
    const muted = isUserMuted(post.userId);
    return [
      {
        label: muted ? 'Unmute User' : 'Mute User',
        icon: muted ? 'volume-high' : 'volume-xmark',
        onPress: handleToggleMute,
      },
      {
        label: 'Report Post',
        icon: 'flag',
        onPress: () => setShowReportModal(true),
      },
    ];
  };

  const renderImages = () => {
    if (post.images.length === 0) return null;

    if (post.images.length === 1) {
      return (
        <TouchableOpacity activeOpacity={0.9} onPress={() => setLightboxIndex(0)}>
          <Image
            source={{ uri: post.images[0] }}
            style={styles.singleImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.imageContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(event) => {
            const contentOffsetX = event.nativeEvent.contentOffset.x;
            const index = Math.floor(contentOffsetX / imageWidth);
            setImageIndex(index);
          }}
          scrollEventThrottle={16}
        >
          {post.images.map((uri, index) => (
            <TouchableOpacity key={index} activeOpacity={0.9} onPress={() => setLightboxIndex(index)}>
              <Image
                source={{ uri }}
                style={styles.multipleImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {post.images.length > 1 && (
          <View style={styles.imageIndicator}>
            {post.images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicatorDot,
                  index === imageIndex && styles.activeDot,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderVideos = () => {
    const videos = post.videos ?? [];
    if (videos.length === 0) return null;
    return (
      <View>
        {videos.map((uri, index) => (
          <Video
            key={index}
            source={{ uri }}
            style={styles.videoPlayer}
            controls
            resizeMode="contain"
            paused
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={handleUserPress}
          disabled={!onUserPress}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            {post.user.avatar ? (
              <Image source={{ uri: post.user.avatar }} style={styles.avatarImage} />
            ) : (
              <Icon name="user" size={20} color={theme.colors.gray[500]} />
            )}
          </View>
          <View style={styles.userDetails}>
            <Text variant="label" weight="semibold">
              {post.user.name}
            </Text>
            <Text variant="caption" color="gray.500">
              {formatDistanceToNow(post.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          {post.location && (
            <View style={styles.location}>
              <Icon name="location-dot" size={12} color={theme.colors.gray[500]} />
              <Text variant="caption" color="gray.500" style={styles.locationText}>
                {post.location.address || 'Location'}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.moreButton}
            onPress={handleMorePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="ellipsis" size={18} color={theme.colors.gray[500]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {post.content.trim() && (
        <Text variant="body" style={styles.content}>
          {post.content}
        </Text>
      )}

      {/* Landmark Tag */}
      {post.landmark && (
        <TouchableOpacity
          style={styles.landmarkTag}
          onPress={() => onLandmarkPress?.(post.landmark!)}
          disabled={!onLandmarkPress}
          activeOpacity={onLandmarkPress ? 0.7 : 1}
        >
          <Icon name="landmark" size={14} color={theme.colors.primary[600]} />
          <Text variant="caption" color="primary.600" style={styles.landmarkText}>
            {post.landmark.name}
          </Text>
          {onLandmarkPress && (
            <Icon name="chevron-right" size={10} color={theme.colors.primary[400]} style={{ marginLeft: 2 }} />
          )}
        </TouchableOpacity>
      )}

      {/* Images */}
      {renderImages()}

      {/* Videos */}
      {renderVideos()}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
          <Icon name="comment" size={18} color={theme.colors.gray[500]} />
          <Text variant="caption" color="gray.500" style={styles.actionText}>
            {post.commentCount}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Sheet */}
      <ActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        title={isOwnPost ? 'Post Options' : undefined}
        options={getActionSheetOptions()}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedId={post.id}
        reportedType="post"
        reportedUserId={post.userId}
        contentSnapshot={{
          content: post.content,
          images: post.images,
          userName: post.user.name,
        }}
      />

      {/* Image lightbox */}
      {lightboxIndex !== null && (
        <ImageViewerModal
          visible={lightboxIndex !== null}
          images={post.images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDetails: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  locationText: {
    marginLeft: theme.spacing.xs,
  },
  moreButton: {
    padding: theme.spacing.xs,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    lineHeight: 22,
  },
  landmarkTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.primary[50],
    alignSelf: 'flex-start',
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
  },
  landmarkText: {
    marginLeft: theme.spacing.xs,
    fontWeight: theme.fontWeight.medium,
  },
  imageContainer: {
    marginBottom: theme.spacing.sm,
  },
  videoPlayer: {
    width: imageWidth,
    height: 240,
    backgroundColor: theme.colors.gray[900],
    marginBottom: theme.spacing.sm,
  },
  singleImage: {
    width: imageWidth,
    height: 300,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  multipleImage: {
    width: imageWidth,
    height: 300,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  imageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.gray[300],
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: theme.colors.primary[500],
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.xl,
  },
  actionText: {
    marginLeft: theme.spacing.xs,
  },
});
