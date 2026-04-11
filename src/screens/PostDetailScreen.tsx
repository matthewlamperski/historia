import React, { useState, useEffect, useCallback } from 'react';
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
import { LandmarkModal } from '../components/ui/LandmarkModal';
import { theme } from '../constants/theme';
import { useComments } from '../hooks';
import { Post as PostType, Comment as CommentType, Landmark } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useAuthStore } from '../store/authStore';
import { useNavigation } from '@react-navigation/native';

interface PostDetailScreenProps {
  route: {
    params: {
      post: PostType;
    };
  };
}

export const PostDetailScreen: React.FC<PostDetailScreenProps> = ({
  route,
}) => {
  const { post } = route.params;
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const currentUserId = user?.id ?? '';
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [landmarkModalVisible, setLandmarkModalVisible] = useState(false);

  const {
    comments,
    loading,
    loadComments,
    createComment,
  } = useComments();

  useEffect(() => {
    loadComments(post.id);
  }, [post.id, loadComments]);

  const handlePostDeleted = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleLandmarkPress = useCallback((landmark: Landmark) => {
    setSelectedLandmark(landmark);
    setLandmarkModalVisible(true);
  }, []);

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
      <Comment comment={item} currentUserId={currentUserId} />
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
        <View style={{ flex: 1, justifyContent: 'center', marginRight: theme.spacing.md }}>
          <Input
            placeholder="Write a comment..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
            style={styles.textInput}
          />
        </View>
        <View>
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
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Post Detail */}
        <View>
          <Post
            post={post}
            currentUserId={currentUserId}
            onComment={() => {}}
            onLandmarkPress={handleLandmarkPress}
            onDelete={handlePostDeleted}
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

      {/* Landmark Detail Modal */}
      <LandmarkModal
        landmark={selectedLandmark}
        visible={landmarkModalVisible}
        onClose={() => {
          setLandmarkModalVisible(false);
          setSelectedLandmark(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  content: {
    flex: 1,
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  textInput: {},
  submitButton: {
    minWidth: 60,
  },
});
