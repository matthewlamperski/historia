import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Post, ActionSheet, ReportModal } from '../components/ui';
import { LevelTag } from '../components/ui/LevelTag';
import { ActionSheetOption } from '../components/ui/ActionSheet';
import { theme } from '../constants/theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  RootStackScreenProps,
  User,
  Post as PostType,
  RootStackParamList,
} from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../services/firebaseConfig';
import { messagingService } from '../services';
import { useToast, useModeration, useCompanions } from '../hooks';
import { useFollow } from '../hooks/useFollow';
import { useAuthStore } from '../store/authStore';
import { RelationshipStatus } from '../services/companionsService';

type ProfileViewRouteProp = RouteProp<RootStackParamList, 'ProfileView'>;

const ProfileView = () => {
  const navigation =
    useNavigation<RootStackScreenProps<'ProfileView'>['navigation']>();
  const route = useRoute<ProfileViewRouteProp>();
  const { userId } = route.params;

  const { user: currentUser } = useAuthStore();
  const currentUserId = currentUser?.id ?? '';
  const isOwnProfile = currentUserId === userId;

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Companion relationship state
  const [relationshipStatus, setRelationshipStatus] =
    useState<RelationshipStatus>('none');
  const [companionLoading, setCompanionLoading] = useState(false);
  // When status is 'request_received', we need the requestId to accept/reject
  const [receivedRequestId, setReceivedRequestId] = useState<string | null>(null);

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const { blockUser, isUserMuted, muteUser, unmuteUser } = useModeration();
  const { showToast } = useToast();

  const {
    sendRequest,
    cancelRequest,
    acceptRequest,
    rejectRequest,
    removeCompanion,
    getRelationshipStatus,
    getReceivedRequestId,
  } = useCompanions(currentUserId, false);

  const {
    isFollowing: isFollowingUser,
    loading: followLoading,
    toggleFollow,
  } = useFollow(currentUserId, userId);

  // Update header right button when we know if this is own profile
  useEffect(() => {
    if (isOwnProfile) return;
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowActionSheet(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ marginRight: 4 }}
        >
          <Icon name="ellipsis" size={20} color={theme.colors.gray[700]} />
        </TouchableOpacity>
      ),
    });
  }, [isOwnProfile, navigation]);

  // ─── Data Loading ────────────────────────────────────────────────────────────

  const loadUserData = useCallback(async () => {
    try {
      const userDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .get();

      if (userDoc.exists()) {
        setUser({ id: userDoc.id, ...(userDoc.data() as Omit<User, 'id'>) });
        setAvatarError(false);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      showToast('Failed to load profile', 'error');
    }
  }, [userId, showToast]);

  const loadUserPosts = useCallback(async () => {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.POSTS)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      const loadedPosts: PostType[] = await Promise.all(
        snapshot.docs.map(async doc => {
          const data = doc.data();

          // Fetch author data
          let postUser: User = user ?? ({} as User);
          if (!user) {
            const authorDoc = await firestore()
              .collection(COLLECTIONS.USERS)
              .doc(data.userId)
              .get();
            if (authorDoc.exists()) {
              postUser = { id: authorDoc.id, ...authorDoc.data() } as User;
            }
          }

          return {
            id: doc.id,
            ...data,
            user: postUser,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
          } as PostType;
        })
      );

      setPosts(loadedPosts);
    } catch (error) {
      console.error('Error loading user posts:', error);
    }
  }, [userId, user]);

  const loadRelationshipStatus = useCallback(async () => {
    if (!currentUserId || currentUserId === userId) return;
    try {
      const status = await getRelationshipStatus(userId);
      setRelationshipStatus(status);

      if (status === 'request_received') {
        const reqId = await getReceivedRequestId(userId);
        setReceivedRequestId(reqId);
      } else {
        setReceivedRequestId(null);
      }
    } catch (error) {
      console.error('Error loading relationship status:', error);
    }
  }, [currentUserId, userId, getRelationshipStatus, getReceivedRequestId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadUserData(), loadRelationshipStatus()]);
    setLoading(false);
  }, [loadUserData, loadRelationshipStatus]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Load posts after user data is set
  useEffect(() => {
    if (user) {
      loadUserPosts();
    }
  }, [user, loadUserPosts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadUserData(), loadRelationshipStatus(), loadUserPosts()]);
    setRefreshing(false);
  }, [loadUserData, loadRelationshipStatus, loadUserPosts]);

  // ─── Companion Actions ────────────────────────────────────────────────────────

  const handleCompanionPress = useCallback(async () => {
    if (!user || companionLoading) return;
    setCompanionLoading(true);

    try {
      switch (relationshipStatus) {
        case 'none':
          await sendRequest(userId);
          setRelationshipStatus('request_sent');
          break;

        case 'request_sent':
          Alert.alert(
            'Cancel Request',
            `Cancel your companion request to ${user.name}?`,
            [
              { text: 'Keep', style: 'cancel' },
              {
                text: 'Cancel Request',
                style: 'destructive',
                onPress: async () => {
                  await cancelRequest(userId);
                  setRelationshipStatus('none');
                },
              },
            ]
          );
          break;

        case 'request_received':
          // Show Accept/Decline sheet
          Alert.alert(
            'Companion Request',
            `${user.name} wants to be your companion`,
            [
              { text: 'Decline', style: 'destructive', onPress: handleDeclineRequest },
              { text: 'Accept', onPress: handleAcceptRequest },
            ]
          );
          break;

        case 'companions':
          Alert.alert(
            'Remove Companion',
            `Remove ${user.name} as a companion?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                  await removeCompanion(userId);
                  setRelationshipStatus('none');
                },
              },
            ]
          );
          break;
      }
    } finally {
      setCompanionLoading(false);
    }
  }, [
    user,
    userId,
    companionLoading,
    relationshipStatus,
    sendRequest,
    cancelRequest,
    removeCompanion,
  ]);

  const handleAcceptRequest = useCallback(async () => {
    if (!receivedRequestId) return;
    setCompanionLoading(true);
    try {
      await acceptRequest(receivedRequestId);
      setRelationshipStatus('companions');
      setReceivedRequestId(null);
    } finally {
      setCompanionLoading(false);
    }
  }, [receivedRequestId, acceptRequest]);

  const handleDeclineRequest = useCallback(async () => {
    if (!receivedRequestId) return;
    setCompanionLoading(true);
    try {
      await rejectRequest(receivedRequestId);
      setRelationshipStatus('none');
      setReceivedRequestId(null);
    } finally {
      setCompanionLoading(false);
    }
  }, [receivedRequestId, rejectRequest]);

  // ─── Companion Button ─────────────────────────────────────────────────────────

  const companionButtonLabel = () => {
    switch (relationshipStatus) {
      case 'none':           return 'Add Companion';
      case 'request_sent':   return 'Request Sent';
      case 'request_received': return 'Respond';
      case 'companions':     return 'Companions';
    }
  };

  const companionButtonVariant = (): 'primary' | 'outline' => {
    switch (relationshipStatus) {
      case 'none':
      case 'request_received':
        return 'primary';
      case 'request_sent':
      case 'companions':
        return 'outline';
    }
  };

  // ─── Message ──────────────────────────────────────────────────────────────────

  const handleMessage = useCallback(async () => {
    if (!user) return;
    try {
      const conversation = await messagingService.getOrCreateConversation(
        currentUserId,
        user.id
      );
      navigation.navigate('ChatScreen', {
        conversationId: conversation.id,
        otherUserId: user.id,
      });
    } catch (error) {
      showToast('Failed to open conversation', 'error');
    }
  }, [user, currentUserId, navigation, showToast]);

  // ─── Post handlers ────────────────────────────────────────────────────────────

  const handleComment = useCallback(
    (postId: string) => {
      const post = posts.find(p => p.id === postId);
      if (post) navigation.navigate('PostDetail', { post });
    },
    [navigation, posts]
  );

  const handleShare = useCallback((_postId: string) => {}, []);

  // ─── Moderation ───────────────────────────────────────────────────────────────

  const handleBlockUser = useCallback(async () => {
    if (!user) return;
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(user.id);
              showToast(`${user.name} has been blocked`, 'success');
              navigation.goBack();
            } catch {
              showToast('Failed to block user', 'error');
            }
          },
        },
      ]
    );
  }, [user, blockUser, showToast, navigation]);

  const handleToggleMute = useCallback(async () => {
    if (!user) return;
    const muted = isUserMuted(user.id);
    try {
      if (muted) {
        await unmuteUser(user.id);
        showToast(`${user.name} unmuted`, 'success');
      } else {
        await muteUser(user.id);
        showToast(`${user.name} muted — their posts and comments will be hidden`, 'success');
      }
    } catch {
      showToast('Failed to update mute status', 'error');
    }
  }, [user, isUserMuted, muteUser, unmuteUser, showToast]);

  const getActionSheetOptions = (): ActionSheetOption[] => {
    const muted = user ? isUserMuted(user.id) : false;
    return [
      {
        label: 'Report User',
        icon: 'flag',
        onPress: () => setShowReportModal(true),
      },
      {
        label: muted ? 'Unmute User' : 'Mute User',
        icon: muted ? 'volume-high' : 'volume-xmark',
        onPress: handleToggleMute,
      },
      {
        label: 'Block User',
        icon: 'user-slash',
        onPress: handleBlockUser,
        destructive: true,
      },
    ];
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  const handleDeletePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  const renderPost = useCallback(
    ({ item }: { item: PostType }) => (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => navigation.navigate('PostDetail', { post: item })}
      >
        <Post
          post={item}
          onComment={handleComment}
          onShare={handleShare}
          currentUserId={currentUserId}
          onDelete={handleDeletePost}
        />
      </TouchableOpacity>
    ),
    [handleComment, handleShare, currentUserId, navigation, handleDeletePost]
  );

  const renderHeader = () => {
    if (!user) return null;

    return (
      <View style={styles.profileContent}>
        {/* Avatar + info */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user.avatar && !avatarError ? (
              <Image
                source={{ uri: user.avatar }}
                style={styles.avatar}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="user" size={36} color={theme.colors.white} />
              </View>
            )}
          </View>

          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text variant="h3" style={styles.userName}>
                {user.name}
              </Text>
              {user.isVerified && (
                <Icon
                  name="badge-check"
                  size={20}
                  color={theme.colors.primary[500]}
                />
              )}
            </View>
            {user.username ? (
              <Text variant="caption" color="gray.500" style={styles.handleText}>
                @{user.username}
              </Text>
            ) : null}
            <LevelTag
              points={user.pointsBalance ?? 0}
              isPremium={user.isPremium ?? false}
              style={styles.levelBadge}
            />
            {user.location ? (
              <View style={styles.locationRow}>
                <Icon
                  name="location-dot"
                  size={14}
                  color={theme.colors.gray[500]}
                />
                <Text
                  variant="caption"
                  color="gray.500"
                  style={styles.locationText}
                >
                  {user.location}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bio */}
        {user.bio ? (
          <View style={styles.bioSection}>
            <Text variant="body" style={styles.bioText}>
              {user.bio}
            </Text>
            {user.website ? (
              <TouchableOpacity style={styles.websiteLink}>
                <Icon
                  name="link"
                  size={14}
                  color={theme.colors.primary[500]}
                />
                <Text
                  variant="body"
                  color="primary.500"
                  style={styles.websiteText}
                >
                  {user.website}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Action Buttons — only show for other users */}
        {!isOwnProfile && (
          <View style={styles.actions}>
            {/* Message icon button */}
            <TouchableOpacity
              style={[styles.actionBtnIcon, styles.actionBtnOutline]}
              onPress={handleMessage}
              activeOpacity={0.75}
            >
              <Icon name="message" size={17} color={theme.colors.primary[500]} />
            </TouchableOpacity>

            {/* Companion button */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                companionButtonVariant() === 'primary'
                  ? styles.actionBtnPrimary
                  : styles.actionBtnOutline,
              ]}
              onPress={handleCompanionPress}
              disabled={companionLoading}
              activeOpacity={0.75}
            >
              {companionLoading ? (
                <ActivityIndicator
                  size="small"
                  color={companionButtonVariant() === 'primary' ? theme.colors.white : theme.colors.primary[500]}
                />
              ) : (
                <>
                  <Icon
                    name={
                      relationshipStatus === 'companions' ? 'user-check' :
                      relationshipStatus === 'request_sent' ? 'user-clock' :
                      'user-plus'
                    }
                    size={14}
                    color={companionButtonVariant() === 'primary' ? theme.colors.white : theme.colors.primary[500]}
                  />
                  <Text style={[
                    styles.actionBtnText,
                    companionButtonVariant() === 'primary' ? styles.actionBtnTextPrimary : styles.actionBtnTextOutline,
                  ]}>
                    {companionButtonLabel()}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Follow button */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                isFollowingUser ? styles.actionBtnOutline : styles.actionBtnPrimary,
              ]}
              onPress={toggleFollow}
              disabled={followLoading}
              activeOpacity={0.75}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowingUser ? theme.colors.primary[500] : theme.colors.white} />
              ) : (
                <>
                  <Icon
                    name={isFollowingUser ? 'user-check' : 'user-plus'}
                    size={14}
                    color={isFollowingUser ? theme.colors.primary[500] : theme.colors.white}
                  />
                  <Text style={[
                    styles.actionBtnText,
                    isFollowingUser ? styles.actionBtnTextOutline : styles.actionBtnTextPrimary,
                  ]}>
                    {isFollowingUser ? 'Following' : 'Follow'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

          </View>
        )}

        {/* Posts header */}
        <View style={styles.postsHeader}>
          <Text variant="h4" weight="semibold">
            Posts
          </Text>
          <Text variant="caption" color="gray.500">
            {posts.length} post{posts.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyPosts = () => (
    <View style={styles.emptyState}>
      <Icon name="newspaper" size={48} color={theme.colors.gray[300]} />
      <Text variant="h4" color="gray.500" style={styles.emptyTitle}>
        No posts yet
      </Text>
      <Text variant="body" color="gray.400" style={styles.emptySubtitle}>
        {user?.name} hasn't shared anything yet
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text variant="body" color="gray.500" style={styles.loadingText}>
            Loading profile…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Icon name="user-slash" size={48} color={theme.colors.error[500]} />
          <Text variant="h4" color="error.500">
            User not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyPosts}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <ActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        options={getActionSheetOptions()}
      />

      {user && (
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportedId={user.id}
          reportedType="user"
          reportedUserId={user.id}
          contentSnapshot={{ userName: user.name }}
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
  list: {
    paddingBottom: theme.spacing.lg,
  },
  profileContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  avatarContainer: {
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  userName: {
    marginRight: theme.spacing.xs,
  },
  handleText: {
    marginTop: 1,
  },
  levelBadge: {
    marginTop: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    marginLeft: theme.spacing.xs,
  },
  bioSection: {
    marginBottom: theme.spacing.lg,
  },
  bioText: {
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  websiteLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  websiteText: {
    marginLeft: theme.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  actionBtnIcon: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: theme.colors.primary[500],
  },
  actionBtnOutline: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary[400],
    backgroundColor: 'transparent',
  },
  actionBtnText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  actionBtnTextPrimary: {
    color: theme.colors.white,
  },
  actionBtnTextOutline: {
    color: theme.colors.primary[600],
  },
  postsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
  },
  notFoundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing['3xl'],
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

export default ProfileView;
