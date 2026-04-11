import { useState, useEffect, useCallback } from 'react';
import { Post, CreatePostData } from '../types';
import { postsService } from '../services/postsService';
import { pointsService } from '../services/pointsService';
import { useToast } from './useToast';
import { useAuthStore } from '../store/authStore';

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
  removePost: (postId: string) => void;
  loadPostsNearLocation: (latitude: number, longitude: number, radius?: number) => Promise<void>;
  loadCompanionPosts: (companionIds: string[]) => Promise<void>;
}

export const usePosts = (initialLoad: boolean = true): UsePostsReturn => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastPostId, setLastPostId] = useState<string | undefined>();

  const { user, updateUser } = useAuthStore();
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
    if (!user) {
      showToast('You must be signed in to post', 'error');
      return;
    }

    // Hard limit: 10 posts per day
    const todayCount = await pointsService.getTodayPostCount(user.id);
    if (todayCount >= 10) {
      showToast("You've reached today's limit of 10 posts", 'error');
      return;
    }

    try {
      const newPost = await postsService.createPost(postData, user.id, user);
      setPosts(prev => [newPost, ...prev]);

      // Reflect earned points locally: 5 pts base + 1 pt per photo/video
      const imageCount = postData.images?.length ?? 0;
      const videoCount = postData.videos?.length ?? 0;
      const earned = 5 + imageCount + videoCount;
      updateUser({ pointsBalance: (user.pointsBalance ?? 0) + earned });

      showToast('Post created successfully!', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
      showToast(errorMessage, 'error');
      throw err;
    }
  }, [user, showToast, updateUser]);

  const loadCompanionPosts = useCallback(async (companionIds: string[]) => {
    try {
      setLoading(true);
      setError(null);

      const companionPosts = await postsService.getCompanionPosts(companionIds, 20);
      setPosts(companionPosts);
      setLastPostId(companionPosts[companionPosts.length - 1]?.id);
      setHasMore(companionPosts.length === 20);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load companion posts';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const removePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

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
    removePost,
    loadPostsNearLocation,
    loadCompanionPosts,
  };
};