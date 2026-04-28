import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { LevelTag } from './LevelTag';
import { ActionSheet, ActionSheetOption } from './ActionSheet';
import { ReportModal } from './ReportModal';
import { ImageViewerModal } from './ImageViewerModal';
import { VideoViewerModal } from './VideoViewerModal';
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

const MIN_ASPECT = 0.75; // 3:4 — tallest we'll allow in the feed
const MAX_ASPECT = 1.91; // ~16:8.4 — widest we'll allow in the feed
const DEFAULT_ASPECT = 1; // square placeholder until we learn the real aspect
const clampAspect = (a: number) => Math.max(MIN_ASPECT, Math.min(MAX_ASPECT, a));

type MediaItem =
  | { type: 'image'; uri: string; imageIndex: number }
  | { type: 'video'; uri: string; videoIndex: number };

interface MediaSlideProps {
  item: MediaItem;
  width: number;
  /** When provided, every slide uses this aspect ratio (for multi-item
   *  carousels where slides must be uniform). When omitted, the slide adapts
   *  to its own content. */
  fixedAspect?: number;
  onPress: () => void;
}

const MediaSlide: React.FC<MediaSlideProps> = ({ item, width, fixedAspect, onPress }) => {
  const [aspect, setAspect] = useState<number>(DEFAULT_ASPECT);

  useEffect(() => {
    if (fixedAspect != null) return; // uniform — no need to measure
    if (item.type !== 'image') return;
    let cancelled = false;
    Image.getSize(
      item.uri,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) setAspect(clampAspect(w / h));
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [item.type, item.uri, fixedAspect]);

  const containerStyle = { width, aspectRatio: fixedAspect ?? aspect };

  if (item.type === 'image') {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View style={[styles.mediaSlide, containerStyle]}>
          <Image source={{ uri: item.uri }} style={styles.mediaFill} resizeMode="cover" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <View style={[styles.mediaSlide, containerStyle]}>
        <Video
          source={{ uri: item.uri }}
          style={styles.mediaFill}
          resizeMode="cover"
          paused
          muted
          repeat={false}
          onLoad={(data: any) => {
            if (fixedAspect != null) return;
            const size = data?.naturalSize;
            if (size && size.width > 0 && size.height > 0) {
              const isPortrait =
                size.orientation === 'portrait' || size.height > size.width;
              const ratio = isPortrait
                ? Math.min(size.width, size.height) / Math.max(size.width, size.height)
                : size.width / size.height;
              setAspect(clampAspect(ratio));
            }
          }}
        />
        <View pointerEvents="none" style={styles.playOverlay}>
          <View style={styles.playCircle}>
            <Icon name="play" size={22} color={theme.colors.white} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const Post: React.FC<PostProps> = ({
  post,
  onComment,
  onUserPress,
  onDelete,
  onLandmarkPress,
  currentUserId = '',
  showFullContent = false,
}) => {
  const [mediaPage, setMediaPage] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [videoViewerIndex, setVideoViewerIndex] = useState<number | null>(null);
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

  const mediaItems = useMemo<MediaItem[]>(() => {
    const imgs: MediaItem[] = (post.images ?? []).map((uri, i) => ({
      type: 'image',
      uri,
      imageIndex: i,
    }));
    const vids: MediaItem[] = (post.videos ?? []).map((uri, i) => ({
      type: 'video',
      uri,
      videoIndex: i,
    }));
    return [...imgs, ...vids];
  }, [post.images, post.videos]);

  const handleMediaPress = useCallback(
    (item: MediaItem) => {
      if (item.type === 'image') {
        setLightboxIndex(item.imageIndex);
      } else {
        setVideoViewerIndex(item.videoIndex);
      }
    },
    [],
  );

  const renderMedia = () => {
    if (mediaItems.length === 0) return null;

    if (mediaItems.length === 1) {
      return (
        <View style={styles.mediaContainer}>
          <MediaSlide
            item={mediaItems[0]}
            width={imageWidth}
            onPress={() => handleMediaPress(mediaItems[0])}
          />
        </View>
      );
    }

    return (
      <View style={styles.mediaContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={event => {
            const x = event.nativeEvent.contentOffset.x;
            setMediaPage(Math.round(x / imageWidth));
          }}
          scrollEventThrottle={16}
        >
          {mediaItems.map((item, index) => (
            <MediaSlide
              key={`${item.type}-${index}`}
              item={item}
              width={imageWidth}
              fixedAspect={1}
              onPress={() => handleMediaPress(item)}
            />
          ))}
        </ScrollView>

        <View style={styles.imageIndicator}>
          {mediaItems.map((_, index) => (
            <View
              key={index}
              style={[styles.indicatorDot, index === mediaPage && styles.activeDot]}
            />
          ))}
        </View>
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
            <View style={styles.userNameRow}>
              <Text variant="label" weight="semibold" numberOfLines={1} style={styles.userName}>
                {post.user.name}
              </Text>
              <LevelTag
                points={post.user.pointsBalance}
                isPremium={post.user.isPremium}
                size="compact"
              />
            </View>
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

      {/* Media (images + videos) */}
      {renderMedia()}

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

      {/* Video viewer */}
      {videoViewerIndex !== null && (
        <VideoViewerModal
          visible={videoViewerIndex !== null}
          uri={(post.videos ?? [])[videoViewerIndex]}
          onClose={() => setVideoViewerIndex(null)}
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
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  userName: {
    flexShrink: 1,
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
  mediaContainer: {
    marginBottom: theme.spacing.sm,
  },
  mediaSlide: {
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.gray[100],
  },
  mediaFill: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
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
