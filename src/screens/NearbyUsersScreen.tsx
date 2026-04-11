import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { Text } from '../components/ui/Text';
import { theme } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types';
import {
  searchNearbyUsers,
  formatDistance,
  NearbyUserHit,
} from '../services/algoliaUsersService';
import { messagingService } from '../services/messagingService';
import { getLevelForPoints } from '../constants/levels';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const RADIUS_OPTIONS_MI = [25, 50, 100, 250] as const;
type RadiusMi = (typeof RADIUS_OPTIONS_MI)[number];

// ── User card ──────────────────────────────────────────────────────────────────

interface UserCardProps {
  hit: NearbyUserHit;
  isMessaging: boolean;
  onPressProfile: () => void;
  onPressMessage: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ hit, isMessaging, onPressProfile, onPressMessage }) => {
  const points = hit.pointsBalance ?? 0;
  const level = getLevelForPoints(points);
  const distanceM = hit._rankingInfo?.geoDistance;

  return (
    <TouchableOpacity style={styles.card} onPress={onPressProfile} activeOpacity={0.75}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {hit.avatar ? (
          <Image source={{ uri: hit.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Icon name="user" size={22} color={theme.colors.gray[400]} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <Text variant="body" weight="semibold" numberOfLines={1} style={styles.displayName}>
          {hit.name || hit.handle}
        </Text>
        <Text variant="caption" color="gray.500" numberOfLines={1}>
          @{hit.handle}
        </Text>

        <View style={styles.metaRow}>
          {/* Level badge */}
          <View style={[styles.levelBadge, { borderColor: level.color + '55' }]}>
            <View style={[styles.levelDot, { backgroundColor: level.color }]} />
            <Text variant="caption" weight="semibold" style={[styles.levelName, { color: level.color }]}>
              {level.name}
            </Text>
          </View>

          {/* Distance */}
          {distanceM != null && (
            <Text variant="caption" color="gray.400" style={styles.distance}>
              {formatDistance(distanceM)}
            </Text>
          )}
        </View>
      </View>

      {/* Message button */}
      <TouchableOpacity
        style={[styles.messageBtn, isMessaging && styles.messageBtnLoading]}
        onPress={onPressMessage}
        disabled={isMessaging}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.7}
      >
        {isMessaging ? (
          <ActivityIndicator size="small" color={theme.colors.primary[500]} />
        ) : (
          <Icon name="comment" size={18} color={theme.colors.primary[500]} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ── Main screen ────────────────────────────────────────────────────────────────

const NearbyUsersScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuthStore();

  const [users, setUsers] = useState<NearbyUserHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [radiusMi, setRadiusMi] = useState<RadiusMi>(100);
  const [messagingUserId, setMessagingUserId] = useState<string | null>(null);

  const hometown = user?.hometown;

  const loadNearbyUsers = useCallback(async () => {
    if (!hometown) return;
    setIsLoading(true);
    try {
      const hits = await searchNearbyUsers(
        hometown.latitude,
        hometown.longitude,
        radiusMi,
        user?.id
      );
      setUsers(hits);
    } catch (err) {
      console.error('Nearby users search failed:', err);
      Alert.alert('Search Error', 'Could not load nearby users. Please try again.');
    }
    setIsLoading(false);
  }, [hometown, radiusMi, user?.id]);

  useEffect(() => {
    loadNearbyUsers();
  }, [loadNearbyUsers]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={{ alignItems: 'center' }}>
          <Text variant="label" weight="semibold">Nearby Users</Text>
          {hometown && (
            <Text variant="caption" color="gray.500">{hometown.city}</Text>
          )}
        </View>
      ),
      headerRight: hometown ? () => (
        <TouchableOpacity
          onPress={loadNearbyUsers}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginRight: 4 }}
        >
          <Icon name="rotate-right" size={16} color={theme.colors.primary[500]} />
        </TouchableOpacity>
      ) : undefined,
    });
  }, [hometown, loadNearbyUsers, navigation]);

  const handleMessage = useCallback(
    async (hit: NearbyUserHit) => {
      if (!user?.id) return;
      setMessagingUserId(hit.objectID);
      try {
        const conversation = await messagingService.getOrCreateConversation(
          user.id,
          hit.objectID
        );
        navigation.navigate('ChatScreen', {
          conversationId: conversation.id,
          otherUserId: hit.objectID,
          otherUserName: hit.name || hit.handle,
          otherUserAvatar: hit.avatar ?? undefined,
          otherUserUsername: hit.handle,
        });
      } catch {
        Alert.alert('Error', 'Could not open the conversation. Please try again.');
      }
      setMessagingUserId(null);
    },
    [user?.id, navigation]
  );

  const handleProfile = useCallback(
    (hit: NearbyUserHit) => {
      navigation.navigate('ProfileView', { userId: hit.objectID });
    },
    [navigation]
  );

  // ── No hometown set ────────────────────────────────────────────────────────

  if (!hometown) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <View style={styles.emptyContainer}>
          <Icon name="location-crosshairs" size={48} color={theme.colors.gray[300]} />
          <Text variant="h3" weight="semibold" style={styles.emptyTitle}>
            Set Your Hometown First
          </Text>
          <Text variant="body" color="gray.500" style={styles.emptyBody}>
            You need to set your hometown before you can discover nearby users.
          </Text>
          <TouchableOpacity
            style={styles.setHometownBtn}
            onPress={() => navigation.navigate('SetHometown')}
          >
            <Text variant="body" weight="semibold" style={{ color: theme.colors.white }}>
              Set Hometown
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      {/* Radius picker */}
      <View style={styles.radiusRow}>
        <Icon name="location-dot" size={13} color={theme.colors.gray[400]} />
        <Text variant="caption" color="gray.500" style={{ marginRight: 8 }}>
          Within:
        </Text>
        {RADIUS_OPTIONS_MI.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.radiusChip, r === radiusMi && styles.radiusChipActive]}
            onPress={() => setRadiusMi(r)}
          >
            <Text
              variant="caption"
              weight={r === radiusMi ? 'semibold' : 'normal'}
              style={{ color: r === radiusMi ? theme.colors.primary[700] : theme.colors.gray[500] }}
            >
              {r} mi
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={users}
        keyExtractor={item => item.objectID}
        contentContainerStyle={[styles.listContent, users.length === 0 && styles.listContentEmpty]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadNearbyUsers}
            tintColor={theme.colors.primary[500]}
            colors={[theme.colors.primary[500]]}
          />
        }
        renderItem={({ item }) => (
          <UserCard
            hit={item}
            isMessaging={messagingUserId === item.objectID}
            onPressProfile={() => handleProfile(item)}
            onPressMessage={() => {
              if (messagingUserId === item.objectID) return;
              handleMessage(item);
            }}
          />
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyContainer}>
              <Icon name="users-slash" size={40} color={theme.colors.gray[300]} />
              <Text variant="h3" weight="semibold" style={styles.emptyTitle}>
                No Users Found
              </Text>
              <Text variant="body" color="gray.500" style={styles.emptyBody}>
                No Historia users have set their hometown within {radiusMi} miles of{' '}
                {hometown.city}. Try expanding the search radius.
              </Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  radiusChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  radiusChipActive: {
    borderColor: theme.colors.primary[300],
    backgroundColor: theme.colors.primary[50],
  },
  listContent: {
    paddingVertical: theme.spacing.sm,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing['2xl'],
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    color: theme.colors.gray[700],
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    lineHeight: 22,
  },
  setHometownBtn: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  avatarContainer: {
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    backgroundColor: theme.colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  displayName: {
    color: theme.colors.gray[900],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 4,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  levelName: {
    fontSize: 11,
  },
  distance: {
    fontSize: 11,
  },
  messageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
  },
  messageBtnLoading: {
    opacity: 0.6,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.gray[100],
    marginLeft: theme.spacing.lg + 52 + theme.spacing.md,
  },
});

export default NearbyUsersScreen;
