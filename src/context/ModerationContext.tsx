import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { moderationService } from '../services/moderationService';
import { useAuthStore } from '../store/authStore';
import { Block, UserBan } from '../types';

interface ModerationContextType {
  blockedUserIds: string[];
  blockedUsers: Block[];
  isUserBlocked: (userId: string) => boolean;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  refreshBlockedUsers: () => Promise<void>;
  userBan: UserBan | null;
  isCurrentUserBanned: boolean;
  checkBanStatus: () => Promise<void>;
  isLoading: boolean;
}

const ModerationContext = createContext<ModerationContextType | undefined>(
  undefined
);

interface ModerationProviderProps {
  children: ReactNode;
}

export const ModerationProvider: React.FC<ModerationProviderProps> = ({
  children,
}) => {
  const { user } = useAuthStore();
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<Block[]>([]);
  const [userBan, setUserBan] = useState<UserBan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if a user is blocked
  const isUserBlocked = useCallback(
    (userId: string): boolean => {
      return blockedUserIds.includes(userId);
    },
    [blockedUserIds]
  );

  // Fetch blocked users
  const refreshBlockedUsers = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const blocks = await moderationService.getBlockedUsers(user.id);
      setBlockedUsers(blocks);
      setBlockedUserIds(blocks.map(b => b.blockedId));
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Block a user
  const blockUser = useCallback(
    async (blockedId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const block = await moderationService.blockUser(user.id, blockedId);
        setBlockedUsers(prev => [block, ...prev]);
        setBlockedUserIds(prev => [...prev, blockedId]);
      } catch (error) {
        console.error('Error blocking user:', error);
        throw error;
      }
    },
    [user?.id]
  );

  // Unblock a user
  const unblockUser = useCallback(
    async (blockedId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        await moderationService.unblockUser(user.id, blockedId);
        setBlockedUsers(prev => prev.filter(b => b.blockedId !== blockedId));
        setBlockedUserIds(prev => prev.filter(id => id !== blockedId));
      } catch (error) {
        console.error('Error unblocking user:', error);
        throw error;
      }
    },
    [user?.id]
  );

  // Check ban status
  const checkBanStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      const ban = await moderationService.getUserBanStatus(user.id);
      setUserBan(ban);
    } catch (error) {
      console.error('Error checking ban status:', error);
    }
  }, [user?.id]);

  // Subscribe to blocked users on mount and when user changes
  useEffect(() => {
    if (!user?.id) {
      setBlockedUserIds([]);
      setBlockedUsers([]);
      setUserBan(null);
      return;
    }

    // Initial fetch
    refreshBlockedUsers();
    checkBanStatus();

    // Set up real-time subscription for blocked users
    const unsubscribe = moderationService.subscribeToBlockedUsers(
      user.id,
      blockedIds => {
        setBlockedUserIds(blockedIds);
      }
    );

    return () => unsubscribe();
  }, [user?.id, refreshBlockedUsers, checkBanStatus]);

  const value: ModerationContextType = {
    blockedUserIds,
    blockedUsers,
    isUserBlocked,
    blockUser,
    unblockUser,
    refreshBlockedUsers,
    userBan,
    isCurrentUserBanned: userBan?.isBanned ?? false,
    checkBanStatus,
    isLoading,
  };

  return (
    <ModerationContext.Provider value={value}>
      {children}
    </ModerationContext.Provider>
  );
};

export const useModeration = (): ModerationContextType => {
  const context = useContext(ModerationContext);
  if (!context) {
    throw new Error('useModeration must be used within a ModerationProvider');
  }
  return context;
};

export default ModerationContext;
