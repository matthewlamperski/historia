import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '../components/ui';
import { theme } from '../constants/theme';
import { useModeration, useToast } from '../hooks';
import { RootStackScreenProps, User, Mute } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../services/firebaseConfig';

interface MutedUserItem extends Mute {
  userDetails?: User;
}

export const MutedUsersScreen: React.FC<
  RootStackScreenProps<'MutedUsers'>
> = () => {
  const { mutedUsers, unmuteUser, isLoading: moderationLoading } = useModeration();
  const { showToast } = useToast();

  const [mutedUsersWithDetails, setMutedUsersWithDetails] = useState<
    MutedUserItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unmutingIds, setUnmutingIds] = useState<Set<string>>(new Set());

  const fetchMutedUserDetails = useCallback(async () => {
    if (mutedUsers.length === 0) {
      setMutedUsersWithDetails([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const usersWithDetails: MutedUserItem[] = await Promise.all(
        mutedUsers.map(async mute => {
          try {
            const userDoc = await firestore()
              .collection(COLLECTIONS.USERS)
              .doc(mute.mutedId)
              .get();

            if (userDoc.exists) {
              return {
                ...mute,
                userDetails: {
                  id: mute.mutedId,
                  ...userDoc.data(),
                } as User,
              };
            }
          } catch (error) {
            console.error('Error fetching user details:', error);
          }
          return mute;
        })
      );

      setMutedUsersWithDetails(usersWithDetails);
    } catch (error) {
      console.error('Error fetching muted user details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [mutedUsers]);

  useEffect(() => {
    fetchMutedUserDetails();
  }, [fetchMutedUserDetails]);

  const handleUnmute = useCallback(
    async (mutedId: string, userName: string) => {
      Alert.alert(
        'Unmute User',
        `Unmute ${userName}? Their posts and comments will appear in your feed again.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unmute',
            onPress: async () => {
              setUnmutingIds(prev => new Set([...prev, mutedId]));
              try {
                await unmuteUser(mutedId);
                showToast(`${userName} has been unmuted`, 'success');
              } catch (error) {
                showToast('Failed to unmute user', 'error');
              } finally {
                setUnmutingIds(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(mutedId);
                  return newSet;
                });
              }
            },
          },
        ]
      );
    },
    [unmuteUser, showToast]
  );

  const renderMutedUser = useCallback(
    ({ item }: { item: MutedUserItem }) => {
      const userName = item.userDetails?.name || 'Unknown User';
      const isUnmuting = unmutingIds.has(item.mutedId);

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
              {item.userDetails?.username && (
                <Text variant="caption" color="gray.500">
                  @{item.userDetails.username}
                </Text>
              )}
            </View>
          </View>

          <Button
            variant="outline"
            size="sm"
            onPress={() => handleUnmute(item.mutedId, userName)}
            disabled={isUnmuting}
          >
            {isUnmuting ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary[500]}
              />
            ) : (
              'Unmute'
            )}
          </Button>
        </View>
      );
    },
    [handleUnmute, unmutingIds]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="volume-high" size={48} color={theme.colors.gray[300]} />
      <Text variant="h4" color="gray.500" style={styles.emptyTitle}>
        No muted users
      </Text>
      <Text variant="body" color="gray.400" style={styles.emptySubtitle}>
        Users you mute will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Description */}
      <View style={styles.description}>
        <Text variant="body" color="gray.600">
          Muted users' posts and comments are hidden from your feed. They remain your companion and can't tell they've been muted.
        </Text>
      </View>

      {/* Muted Users List */}
      {isLoading || moderationLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={mutedUsersWithDetails}
          renderItem={renderMutedUser}
          keyExtractor={item => item.id}
          contentContainerStyle={
            mutedUsersWithDetails.length === 0
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

export default MutedUsersScreen;
