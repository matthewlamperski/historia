import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Input } from '../ui';
import { Comment } from '../ui/Comment';
import { theme } from '../../constants/theme';
import { useComments } from '../../hooks';
import { Comment as CommentType } from '../../types';
import Icon from 'react-native-vector-icons/FontAwesome6';

interface CommentsModalProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  postId,
  onClose,
}) => {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const {
    comments,
    loading,
    loadComments,
    createComment,
  } = useComments();

  useEffect(() => {
    if (visible && postId) {
      loadComments(postId);
    }
  }, [visible, postId, loadComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submitting) return;

    try {
      setSubmitting(true);
      await createComment({
        postId,
        content: newComment.trim(),
      });
      setNewComment('');
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({ item }: { item: CommentType }) => (
    <Comment comment={item} />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text variant="h3">Comments</Text>
      <Button variant="ghost" size="sm" onPress={onClose}>
        <Icon name="xmark" size={18} color={theme.colors.gray[600]} />
      </Button>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="comment" size={48} color={theme.colors.gray[300]} />
      <Text variant="body" color="gray.500" style={styles.emptyText}>
        No comments yet
      </Text>
      <Text variant="caption" color="gray.400" style={styles.emptySubtext}>
        Be the first to share your thoughts
      </Text>
    </View>
  );

  const renderFooter = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.footer}
    >
      <View style={styles.commentInput}>
        <Input
          placeholder="Write a comment..."
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={500}
          style={styles.textInput}
        />
        <Button
          variant="primary"
          size="sm"
          onPress={handleSubmitComment}
          disabled={!newComment.trim() || submitting}
          loading={submitting}
          style={styles.submitButton}
        >
          Post
        </Button>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            <Text variant="caption" color="gray.500" style={styles.loadingText}>
              Loading comments...
            </Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.list,
              comments.length === 0 && styles.emptyList,
            ]}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        )}
        
        {renderFooter()}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  list: {
    paddingVertical: theme.spacing.sm,
  },
  emptyList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    backgroundColor: theme.colors.white,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  textInput: {
    flex: 1,
    marginRight: theme.spacing.sm,
    maxHeight: 100,
  },
  submitButton: {
    minWidth: 60,
  },
});