import { useState, useCallback, useEffect } from 'react';
import { Post } from '../types';
import { postsService } from '../services/postsService';
import { useToast } from './useToast';

export interface UseUserPostsReturn {
  posts: Post[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  removePost: (postId: string) => void;
}

export const useUserPosts = (userId: string): UseUserPostsReturn => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const loadPosts = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const fetched = await postsService.getPostsByUser(userId);
      setPosts(fetched);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load posts';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, showToast]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const removePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  return { posts, loading, error, refresh: loadPosts, removePost };
};
