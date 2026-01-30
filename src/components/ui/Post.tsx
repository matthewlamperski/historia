import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Text } from '../ui';
import { theme } from '../../constants/theme';
import { Post as PostType } from '../../types';
import { formatDistanceToNow } from '../../utils/formatters';
import Icon from 'react-native-vector-icons/FontAwesome6';

interface PostProps {
  post: PostType;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare?: (postId: string) => void;
  onUserPress?: (userId: string) => void;
  currentUserId?: string;
  showFullContent?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const imageWidth = screenWidth - theme.spacing.lg * 2;

export const Post: React.FC<PostProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  onUserPress,
  currentUserId = 'mock-user-1',
  showFullContent = false,
}) => {
  const [imageIndex, setImageIndex] = useState(0);
  const isLiked = post.likes.includes(currentUserId);

  const handleLike = () => {
    onLike(post.id);
  };

  const handleComment = () => {
    onComment(post.id);
  };

  const handleShare = () => {
    onShare?.(post.id);
  };

  const handleUserPress = () => {
    if (onUserPress && post.userId !== currentUserId) {
      onUserPress(post.userId);
    }
  };

  const renderImages = () => {
    if (post.images.length === 0) return null;

    if (post.images.length === 1) {
      return (
        <Image
          source={{ uri: post.images[0] }}
          style={styles.singleImage}
          resizeMode="cover"
        />
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
            <Image
              key={index}
              source={{ uri }}
              style={styles.multipleImage}
              resizeMode="cover"
            />
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.userInfo} 
          onPress={handleUserPress}
          disabled={!onUserPress || post.userId === currentUserId}
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
        
        {post.location && (
          <View style={styles.location}>
            <Icon name="location-dot" size={12} color={theme.colors.gray[500]} />
            <Text variant="caption" color="gray.500" style={styles.locationText}>
              {post.location.address || 'Location'}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      {post.content.trim() && (
        <Text variant="body" style={styles.content}>
          {post.content}
        </Text>
      )}

      {/* Images */}
      {renderImages()}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Icon
            name={isLiked ? 'heart' : 'heart'}
            size={20}
            color={isLiked ? theme.colors.error[500] : theme.colors.gray[500]}
            solid={isLiked}
          />
          <Text
            variant="caption"
            color={isLiked ? 'error.500' : 'gray.500'}
            style={styles.actionText}
          >
            {post.likes.length}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
          <Icon name="comment" size={18} color={theme.colors.gray[500]} />
          <Text variant="caption" color="gray.500" style={styles.actionText}>
            {post.commentCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Icon name="share" size={18} color={theme.colors.gray[500]} />
          <Text variant="caption" color="gray.500" style={styles.actionText}>
            Share
          </Text>
        </TouchableOpacity>
      </View>
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
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  locationText: {
    marginLeft: theme.spacing.xs,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    lineHeight: 22,
  },
  imageContainer: {
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