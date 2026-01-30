import { useState, useEffect, useCallback } from 'react';
import { Post, CreatePostData } from '../types';
import { postsService } from '../services/postsService';
import { useToast } from './useToast';

export interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  loadPosts: () => Promise<void>;
  loadMorePosts: () => Promise<void>;
  refreshPosts: () => Promise<void>;
  createPost: (postData: CreatePostData) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  loadPostsNearLocation: (latitude: number, longitude: number, radius?: number) => Promise<void>;
}

export const usePosts = (initialLoad: boolean = true): UsePostsReturn => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastPostId, setLastPostId] = useState<string | undefined>();
  
  const { showToast } = useToast();

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const newPosts = await postsService.getPosts(20);
      setPosts(newPosts);
      setLastPostId(newPosts[newPosts.length - 1]?.id);
      setHasMore(newPosts.length === 20);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load posts';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadMorePosts = useCallback(async () => {
    if (!hasMore || loading) return;

    try {
      setError(null);
      
      const newPosts = await postsService.getPosts(20, lastPostId);
      
      if (newPosts.length > 0) {
        setPosts(prev => [...prev, ...newPosts]);
        setLastPostId(newPosts[newPosts.length - 1]?.id);
        setHasMore(newPosts.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more posts';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    }
  }, [hasMore, loading, lastPostId, showToast]);

  const refreshPosts = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const newPosts = await postsService.getPosts(20);
      setPosts(newPosts);
      setLastPostId(newPosts[newPosts.length - 1]?.id);
      setHasMore(newPosts.length === 20);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh posts';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setRefreshing(false);
    }
  }, [showToast]);

  const createPost = useCallback(async (postData: CreatePostData) => {
    try {
      // For now, we'll use a mock user ID. In a real app, this would come from auth
      const userId = 'mock-user-id';
      
      const newPost = await postsService.createPost(postData, userId);
      setPosts(prev => [newPost, ...prev]);
      showToast('Post created successfully!', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
      showToast(errorMessage, 'error');
      throw err;
    }
  }, [showToast]);

  const toggleLike = useCallback(async (postId: string) => {
    try {
      // Optimistic update
      setPosts(prev => 
        prev.map(post => {
          if (post.id === postId) {
            const userId = 'mock-user-id'; // In real app, get from auth
            const isLiked = post.likes.includes(userId);
            
            return {
              ...post,
              likes: isLiked 
                ? post.likes.filter(id => id !== userId)
                : [...post.likes, userId]
            };
          }
          return post;
        })
      );

      await postsService.toggleLike(postId, 'mock-user-id');
    } catch (err) {
      // Revert optimistic update on error
      const errorMessage = err instanceof Error ? err.message : 'Failed to update like';
      showToast(errorMessage, 'error');
      
      // Revert the optimistic update
      setPosts(prev => 
        prev.map(post => {
          if (post.id === postId) {
            const userId = 'mock-user-id';
            const isLiked = post.likes.includes(userId);
            
            return {
              ...post,
              likes: isLiked 
                ? post.likes.filter(id => id !== userId)
                : [...post.likes, userId]
            };
          }
          return post;
        })
      );
    }
  }, [showToast]);

  const loadPostsNearLocation = useCallback(async (
    latitude: number, 
    longitude: number, 
    radius: number = 10
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const nearbyPosts = await postsService.getPostsNearLocation(
        latitude, 
        longitude, 
        radius,
        20
      );
      
      setPosts(nearbyPosts);
      setHasMore(false); // Location-based queries don't support pagination in this implementation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load nearby posts';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load posts on mount if initialLoad is true
  useEffect(() => {
    if (initialLoad) {
      loadPosts();
    }
  }, [initialLoad, loadPosts]);

  return {
    posts,
    loading,
    refreshing,
    error,
    hasMore,
    loadPosts,
    loadMorePosts,
    refreshPosts,
    createPost,
    toggleLike,
    loadPostsNearLocation,
  };
};