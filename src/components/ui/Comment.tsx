import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Text } from '../ui';
import { LevelTag } from './LevelTag';
import { ActionSheet, ActionSheetOption } from './ActionSheet';
import { ReportModal } from './ReportModal';
import { theme } from '../../constants/theme';
import { Comment as CommentType } from '../../types';
import { formatDistanceToNow } from '../../utils/formatters';
import { moderationService } from '../../services/moderationService';
import { useToast } from '../../hooks/useToast';
import Icon from 'react-native-vector-icons/FontAwesome6';

interface CommentProps {
  comment: CommentType;
  onLike?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  currentUserId?: string;
}

export const Comment: React.FC<CommentProps> = ({
  comment,
  onLike,
  onDelete,
  currentUserId = '',
}) => {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  const isOwnComment = comment.userId === currentUserId;

  const handleLongPress = () => {
    setShowActionSheet(true);
  };

  const handleDeleteComment = useCallback(async () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await moderationService.deleteComment(
                comment.id,
                comment.postId,
                currentUserId
              );
              showToast('Comment deleted', 'success');
              onDelete?.(comment.id);
            } catch (error) {
              console.error('Error deleting comment:', error);
              showToast('Failed to delete comment', 'error');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [comment.id, comment.postId, currentUserId, showToast, onDelete]);

  const getActionSheetOptions = (): ActionSheetOption[] => {
    if (isOwnComment) {
      return [
        {
          label: 'Delete Comment',
          icon: 'trash',
          onPress: handleDeleteComment,
          destructive: true,
        },
      ];
    }
    return [
      {
        label: 'Report Comment',
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
      <View style={styles.container}>
        <View style={styles.avatar}>
          {comment.user.avatar ? (
            <Image
              source={{ uri: comment.user.avatar }}
              style={styles.avatarImage}
            />
          ) : (
            <Icon name="user" size={16} color={theme.colors.gray[500]} />
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.bubble}>
            <View style={styles.userNameRow}>
              <Text variant="label" weight="semibold" style={styles.userName}>
                {comment.user.name}
              </Text>
              <LevelTag
                points={comment.user.pointsBalance}
                isPremium={comment.user.isPremium}
                size="compact"
              />
            </View>
            <Text variant="body" style={styles.commentText}>
              {comment.content}
            </Text>
          </View>

          <View style={styles.footer}>
            <Text variant="caption" color="gray.500">
              {formatDistanceToNow(comment.createdAt)}
            </Text>
          </View>
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
        reportedId={comment.id}
        reportedType="comment"
        reportedUserId={comment.userId}
        contentSnapshot={{
          content: comment.content,
          userName: comment.user.name,
        }}
      />
    </TouchableOpacity>
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
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  userName: {
    flexShrink: 1,
  },
  commentText: {
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
});
