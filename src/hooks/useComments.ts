import { useState, useCallback } from 'react';
import { Comment, CreateCommentData } from '../types';
import { postsService } from '../services/postsService';
import { useToast } from './useToast';
import { useModeration } from '../context/ModerationContext';
import { useAuthStore } from '../store/authStore';

export interface UseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  loadComments: (postId: string) => Promise<void>;
  createComment: (commentData: CreateCommentData) => Promise<void>;
  refreshComments: (postId: string) => Promise<void>;
}

export const useComments = (): UseCommentsReturn => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();
  const { mutedUserIds } = useModeration();
  const { user } = useAuthStore();

  const loadComments = useCallback(async (postId: string) => {
    try {
      setLoading(true);
      setError(null);

      const postComments = await postsService.getComments(postId, 50);
      setComments(postComments.filter(c => !mutedUserIds.includes(c.userId)));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load comments';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, mutedUserIds]);

  const createComment = useCallback(async (commentData: CreateCommentData) => {
    try {
      const userId = user?.id ?? '';

      const newComment = await postsService.createComment(commentData, userId);
      setComments(prev => [newComment, ...prev]);
      showToast('Comment added successfully!', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add comment';
      showToast(errorMessage, 'error');
      throw err;
    }
  }, [user?.id, showToast]);

  const refreshComments = useCallback(async (postId: string) => {
    await loadComments(postId);
  }, [loadComments]);

  return {
    comments,
    loading,
    error,
    loadComments,
    createComment,
    refreshComments,
  };
};