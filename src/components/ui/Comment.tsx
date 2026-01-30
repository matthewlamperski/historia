import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '../ui';
import { theme } from '../../constants/theme';
import { Comment as CommentType } from '../../types';
import { formatDistanceToNow } from '../../utils/formatters';
import Icon from 'react-native-vector-icons/FontAwesome6';

interface CommentProps {
  comment: CommentType;
  onLike?: (commentId: string) => void;
  currentUserId?: string;
}

export const Comment: React.FC<CommentProps> = ({
  comment,
  onLike,
  currentUserId = 'mock-user-id',
}) => {
  const isLiked = comment.likes.includes(currentUserId);

  const handleLike = () => {
    onLike?.(comment.id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        {comment.user.avatar ? (
          <Image source={{ uri: comment.user.avatar }} style={styles.avatarImage} />
        ) : (
          <Icon name="user" size={16} color={theme.colors.gray[500]} />
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.bubble}>
          <Text variant="label" weight="semibold" style={styles.userName}>
            {comment.user.name}
          </Text>
          <Text variant="body" style={styles.commentText}>
            {comment.content}
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text variant="caption" color="gray.500">
            {formatDistanceToNow(comment.createdAt)}
          </Text>
          
          <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
            <Icon
              name="heart"
              size={12}
              color={isLiked ? theme.colors.error[500] : theme.colors.gray[400]}
              solid={isLiked}
            />
            {comment.likes.length > 0 && (
              <Text
                variant="caption"
                color={isLiked ? 'error.500' : 'gray.400'}
                style={styles.likeCount}
              >
                {comment.likes.length}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  content: {
    flex: 1,
  },
  bubble: {
    backgroundColor: theme.colors.gray[50],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xs,
  },
  userName: {
    marginBottom: 2,
  },
  commentText: {
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
  },
  likeCount: {
    marginLeft: theme.spacing.xs,
  },
});