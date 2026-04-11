import { useState, useEffect, useCallback } from 'react';
import { followService } from '../services/followService';
import { useToast } from './useToast';

export interface UseFollowReturn {
  isFollowing: boolean;
  loading: boolean;
  followUser: () => Promise<void>;
  unfollowUser: () => Promise<void>;
  toggleFollow: () => Promise<void>;
}

export const useFollow = (
  currentUserId: string | undefined,
  targetUserId: string
): UseFollowReturn => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!currentUserId || currentUserId === targetUserId) return;

    followService.isFollowing(currentUserId, targetUserId).then(result => {
      setIsFollowing(result);
    });
  }, [currentUserId, targetUserId]);

  const followUser = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      await followService.followUser(currentUserId, targetUserId);
      setIsFollowing(true);
    } catch {
      showToast('Failed to follow user', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, targetUserId, showToast]);

  const unfollowUser = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      await followService.unfollowUser(currentUserId, targetUserId);
      setIsFollowing(false);
    } catch {
      showToast('Failed to unfollow user', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, targetUserId, showToast]);

  const toggleFollow = useCallback(async () => {
    if (isFollowing) {
      await unfollowUser();
    } else {
      await followUser();
    }
  }, [isFollowing, followUser, unfollowUser]);

  return { isFollowing, loading, followUser, unfollowUser, toggleFollow };
};
