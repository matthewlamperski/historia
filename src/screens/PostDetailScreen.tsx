import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Input, Post, Comment } from '../components/ui';
import { theme } from '../constants/theme';
import { useComments } from '../hooks';
import { Post as PostType, Comment as CommentType } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';

interface PostDetailScreenProps {
  route: {
    params: {
      post: PostType;
    };
  };
  navigation: {
    goBack: () => void;
  };
}

export const PostDetailScreen: React.FC<PostDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { post } = route.params;
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const {
    comments,
    loading,
    loadComments,
    createComment,
  } = useComments();

  useEffect(() => {
    loadComments(post.id);
  }, [post.id, loadComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submitting) return;

    try {
      setSubmitting(true);
      await createComment({
        postId: post.id,
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
    <View style={styles.commentWrapper}>
      <Comment comment={item} />
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Button variant="ghost" size="sm" onPress={navigation.goBack}>
        <Icon name="arrow-left" size={18} color={theme.colors.gray[600]} />
      </Button>
      <Text variant="h3" style={styles.headerTitle}>Post</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderEmptyComments = () => (
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

  const renderCommentInput = () => (
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
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Post Detail */}
        <View style={styles.postContainer}>
          <Post 
            post={post} 
            onLike={() => {}} 
            onComment={() => {}} 
            onShare={() => {}}
            showFullContent={true}
          />
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text variant="h4" style={styles.commentsTitle}>
            Comments ({post.commentCount})
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
              <Text variant="caption" color="gray.500" style={styles.loadingText}>
                Loading comments...
              </Text>
            </View>
          ) : comments.length > 0 ? (
            <FlatList
              data={comments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            renderEmptyComments()
          )}
        </View>
      </ScrollView>
      
      {renderCommentInput()}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as back button for centering
  },
  content: {
    flex: 1,
  },
  postContainer: {
    borderBottomWidth: 8,
    borderBottomColor: theme.colors.gray[100],
  },
  commentsSection: {
    flex: 1,
  },
  commentsTitle: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  commentWrapper: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[50],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing['3xl'],
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
    paddingVertical: theme.spacing['3xl'],
  },
  loadingText: {
    marginTop: theme.spacing.md,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    backgroundColor: theme.colors.white,
    paddingBottom: Platform.OS === 'ios' ? 0 : theme.spacing.md,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  textInput: {
    flex: 1,
    marginRight: theme.spacing.md,
    maxHeight: 100,
    minHeight: 40,
  },
  submitButton: {
    minWidth: 60,
  },
});