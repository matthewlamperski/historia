import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '../components/ui';
import { theme } from '../constants/theme';
import { RootStackScreenProps } from '../types';
import { User } from '../types';
import { followService } from '../services/followService';
import { useFollow } from '../hooks/useFollow';
import { useAuthStore } from '../store/authStore';
import Icon from 'react-native-vector-icons/FontAwesome6';

type Props = RootStackScreenProps<'FollowList'>;

const FollowUserRow: React.FC<{ person: User; currentUserId?: string; onPress: () => void }> = ({
  person,
  currentUserId,
  onPress,
}) => {
  const { isFollowing, loading, toggleFollow } = useFollow(currentUserId, person.id);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        {person.avatar ? (
          <Image source={{ uri: person.avatar }} style={styles.avatarImage} />
        ) : (
          <Icon name="user" size={18} color={theme.colors.gray[500]} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{person.name}</Text>
        {person.username ? (
          <Text style={styles.handle}>@{person.username}</Text>
        ) : null}
      </View>
      {currentUserId && currentUserId !== person.id && (
        <Button
          variant={isFollowing ? 'outline' : 'primary'}
          size="sm"
          onPress={toggleFollow}
          loading={loading}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </Button>
      )}
    </TouchableOpacity>
  );
};

export default function FollowListScreen({ route, navigation }: Props) {
  const { userId, mode } = route.params;
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchUsers = mode === 'following'
      ? followService.getFollowingList(userId)
      : followService.getFollowersList(userId);

    fetchUsers
      .then(list => setUsers(list))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, mode]);

  const title = mode === 'following' ? 'Following' : 'Followers';

  useEffect(() => {
    navigation.setOptions({ title });
  }, [title, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {loading ? (
        <ActivityIndicator style={styles.spinner} color={theme.colors.primary[500]} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <FollowUserRow
              person={item}
              currentUserId={currentUser?.id}
              onPress={() => navigation.navigate('ProfileView', { userId: item.id })}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {mode === 'following' ? 'Not following anyone yet.' : 'No followers yet.'}
            </Text>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  spinner: {
    marginTop: theme.spacing['3xl'],
  },
  listContent: {
    paddingBottom: theme.spacing['3xl'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
  },
  handle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    marginTop: 1,
  },
  empty: {
    textAlign: 'center',
    marginTop: theme.spacing['3xl'],
    color: theme.colors.gray[500],
    fontSize: theme.fontSize.base,
  },
});
