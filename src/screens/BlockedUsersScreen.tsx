import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '../components/ui';
import { theme } from '../constants/theme';
import { useModeration, useToast } from '../hooks';
import { RootStackScreenProps, User, Block } from '../types';
import { userService } from '../services';
import Icon from 'react-native-vector-icons/FontAwesome6';
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../services/firebaseConfig';

interface BlockedUserItem extends Block {
  userDetails?: User;
}

export const BlockedUsersScreen: React.FC<
  RootStackScreenProps<'BlockedUsers'>
> = ({ navigation }) => {
  const { blockedUsers, unblockUser, isLoading: moderationLoading } = useModeration();
  const { showToast } = useToast();

  const [blockedUsersWithDetails, setBlockedUsersWithDetails] = useState<
    BlockedUserItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingIds, setUnblockingIds] = useState<Set<string>>(new Set());

  // Fetch user details for blocked users
  const fetchBlockedUserDetails = useCallback(async () => {
    if (blockedUsers.length === 0) {
      setBlockedUsersWithDetails([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const usersWithDetails: BlockedUserItem[] = await Promise.all(
        blockedUsers.map(async block => {
          try {
            const userDoc = await firestore()
              .collection(COLLECTIONS.USERS)
              .doc(block.blockedId)
              .get();

            if (userDoc.exists) {
              return {
                ...block,
                userDetails: {
                  id: block.blockedId,
                  ...userDoc.data(),
                } as User,
              };
            }
          } catch (error) {
            console.error('Error fetching user details:', error);
          }
          return block;
        })
      );

      setBlockedUsersWithDetails(usersWithDetails);
    } catch (error) {
      console.error('Error fetching blocked user details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [blockedUsers]);

  useEffect(() => {
    fetchBlockedUserDetails();
  }, [fetchBlockedUserDetails]);

  const handleUnblock = useCallback(
    async (blockedId: string, userName: string) => {
      Alert.alert(
        'Unblock User',
        `Are you sure you want to unblock ${userName}? They will be able to see your posts and send you messages again.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unblock',
            onPress: async () => {
              setUnblockingIds(prev => new Set([...prev, blockedId]));
              try {
                await unblockUser(blockedId);
                showToast(`${userName} has been unblocked`, 'success');
              } catch (error) {
                showToast('Failed to unblock user', 'error');
              } finally {
                setUnblockingIds(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(blockedId);
                  return newSet;
                });
              }
            },
          },
        ]
      );
    },
    [unblockUser, showToast]
  );

  const renderBlockedUser = useCallback(
    ({ item }: { item: BlockedUserItem }) => {
      const userName = item.userDetails?.name || 'Unknown User';
      const isUnblocking = unblockingIds.has(item.blockedId);

      return (
        <View style={styles.userItem}>
          <View style={styles.userInfo}>
            {item.userDetails?.avatar ? (
              <Image
                source={{ uri: item.userDetails.avatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Icon name="user" size={20} color={theme.colors.gray[500]} />
              </View>
            )}
            <View style={styles.userDetails}>
              <Text variant="body" weight="semibold">
                {userName}
              </Text>
            </View>
          </View>

          <Button
            variant="outline"
            size="sm"
            onPress={() => handleUnblock(item.blockedId, userName)}
            disabled={isUnblocking}
          >
            {isUnblocking ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary[500]}
              />
            ) : (
              'Unblock'
            )}
          </Button>
        </View>
      );
    },
    [handleUnblock, unblockingIds]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="user-check" size={48} color={theme.colors.gray[300]} />
      <Text variant="h4" color="gray.500" style={styles.emptyTitle}>
        No blocked users
      </Text>
      <Text variant="body" color="gray.400" style={styles.emptySubtitle}>
        Users you block will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={20} color={theme.colors.gray[700]} />
        </TouchableOpacity>
        <Text variant="h3" weight="semibold">
          Blocked Users
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Description */}
      <View style={styles.description}>
        <Text variant="body" color="gray.600">
          Blocked users can't see your posts, comments, or send you messages.
        </Text>
      </View>

      {/* Blocked Users List */}
      {isLoading || moderationLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={blockedUsersWithDetails}
          renderItem={renderBlockedUser}
          keyExtractor={item => item.id}
          contentContainerStyle={
            blockedUsersWithDetails.length === 0
              ? styles.emptyListContainer
              : styles.listContainer
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingVertical: theme.spacing.sm,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: theme.spacing.md,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});

export default BlockedUsersScreen;
