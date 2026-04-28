import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Post, SignupCTA } from '../components/ui';
import { ChallengeCoin } from '../components/ui/ChallengeCoin';
import { theme } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { RootStackScreenProps, Post as PostType } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useVisits, useSubscription, useNotifications, useReferral, useUserPosts, useCompanions } from '../hooks';
import { useAuthStore } from '../store/authStore';
import { usePointsConfig } from '../context/PointsConfigContext';

const ProfileTab = () => {
  const navigation = useNavigation<RootStackScreenProps<'Main'>['navigation']>();

  const { user, authUser } = useAuthStore();
  const currentUserId = user?.id ?? '';
  const [avatarError, setAvatarError] = useState(false);
  // Prefer the Firestore name; fall back to the Auth displayName for the
  // brief moment between sign-in and Firestore profile load. Deliberately
  // do NOT fall back to the email prefix — that masks bugs and leaks email
  // addresses into the UI.
  const displayName = user?.name || authUser?.displayName || 'Explorer';

  const { posts, removePost } = useUserPosts(currentUserId);
  const { companions } = useCompanions(currentUserId, !!currentUserId);

  const { visits } = useVisits(currentUserId, !!currentUserId);
  const { isPremium, isOnTrial, showSubscriptionScreen } = useSubscription();
  const { unreadCount } = useNotifications(currentUserId);
  const { referralCode, referralCount, isSharing, shareReferralLink } = useReferral();
  const { getLevelForPoints, getNextLevel, status: pointsConfigStatus } = usePointsConfig();

  const handleEditProfile = useCallback(() => {
    navigation.navigate('EditProfile');
  }, [navigation]);

  const handleSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const handleComment = useCallback((postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      navigation.navigate('PostDetail', { post });
    }
  }, [navigation, posts]);

  const handleShare = useCallback((postId: string) => {
    console.log('Share post:', postId);
  }, []);

  const handleUserPress = useCallback((userId: string) => {
    navigation.navigate('ProfileView', { userId });
  }, [navigation]);

  const renderPost = useCallback(({ item }: { item: PostType }) => (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => navigation.navigate('PostDetail', { post: item })}
    >
      <Post
        post={item}
        currentUserId={currentUserId}
        onComment={handleComment}
        onShare={handleShare}
        onUserPress={handleUserPress}
        onDelete={removePost}
      />
    </TouchableOpacity>
  ), [handleComment, handleShare, handleUserPress, navigation, currentUserId, removePost]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <SignupCTA
          icon="user"
          title="Create your profile"
          subtitle="Bookmark historic sites, check in at landmarks, earn points & rewards, save historic sites, and build your travel journal."
        />
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View style={styles.profileContent}>
      {/* Top action bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={styles.bellButton}
          accessibilityLabel="Notifications"
        >
          <Icon name="bell" size={20} color={theme.colors.gray[700]} />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text variant="caption" weight="bold" style={styles.bellBadgeText}>
                {unreadCount > 9 ? '9+' : String(unreadCount)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={handleEditProfile} style={styles.avatarContainer}>
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
          <View style={styles.avatarEditIcon}>
            <Icon name="camera" size={14} color={theme.colors.white} />
          </View>
        </TouchableOpacity>

        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text variant="h3" style={styles.userName}>
              {displayName}
            </Text>
            {user.isVerified && (
              <Icon name="badge-check" size={20} color={theme.colors.primary[500]} />
            )}
          </View>
          {user.username ? (
            <Text variant="caption" color="gray.500" style={styles.handleText}>
              @{user.username}
            </Text>
          ) : null}
          {user.location ? (
            <View style={styles.locationRow}>
              <Icon name="location-dot" size={14} color={theme.colors.gray[500]} />
              <Text variant="caption" color="gray.500" style={styles.locationText}>
                {user.location}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Bio / Website */}
      <View style={styles.bioSection}>
        <TouchableOpacity onPress={handleEditProfile}>
          <Text variant="body" style={styles.bioText}>
            {user.bio || 'Tap Edit Profile to add a bio...'}
          </Text>
        </TouchableOpacity>
        {user.website ? (
          <TouchableOpacity style={styles.websiteLink}>
            <Icon name="link" size={14} color={theme.colors.primary[500]} />
            <Text variant="body" color="primary.500" style={styles.websiteText}>
              {user.website}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Social Stats — private, visible only to self */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => navigation.navigate('CompanionsList', { userId: currentUserId })}
          activeOpacity={0.7}
        >
          <Text style={styles.statNumber}>{companions.length}</Text>
          <Text style={styles.statLabel}>Companions</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => navigation.navigate('FollowList', { userId: currentUserId, mode: 'following' })}
          activeOpacity={0.7}
        >
          <Text style={styles.statNumber}>{user.followingCount ?? 0}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => navigation.navigate('FollowList', { userId: currentUserId, mode: 'followers' })}
          activeOpacity={0.7}
        >
          <Text style={styles.statNumber}>{user.followerCount ?? 0}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          variant="primary"
          onPress={handleEditProfile}
          style={styles.actionButton}
        >
          Edit Profile
        </Button>
        <Button
          variant="outline"
          onPress={handleSettings}
          style={styles.actionButton}
        >
          Settings
        </Button>
      </View>

      {/* Points & Level Card — shown for all users */}
      {(() => {
        if (pointsConfigStatus !== 'ready') return null;
        const pts = user.pointsBalance ?? 0;
        const level = getLevelForPoints(pts);
        if (!level) return null;
        const next = getNextLevel(level);
        const ptsToNext = next ? next.minPoints - pts : null;
        return (
          <TouchableOpacity
            style={[styles.pointsCard, { borderColor: level.color }]}
            onPress={() =>
              isPremium
                ? navigation.navigate('Levels', { userId: currentUserId })
                : showSubscriptionScreen()
            }
            activeOpacity={0.85}
          >
            <ChallengeCoin level={level} size="lg" />
            <View style={styles.pointsCardInfo}>
              <View style={styles.pointsCardHeader}>
                <Text variant="label" weight="semibold" style={[styles.pointsLevelName, { color: level.color }]}>
                  {level.name}
                </Text>
                {isOnTrial && (
                  <View style={styles.trialChip}>
                    <Text variant="caption" weight="medium" style={styles.trialChipText}>
                      Trial
                    </Text>
                  </View>
                )}
              </View>
              <Text variant="h3" weight="bold" style={styles.pointsBalance}>
                {pts.toLocaleString()} pts
              </Text>
              <Text variant="caption" color="gray.500">
                {ptsToNext !== null
                  ? `${ptsToNext.toLocaleString()} pts to ${next!.name}`
                  : 'Maximum level reached 🏆'}
              </Text>
            </View>
            <Icon name="chevron-right" size={14} color={theme.colors.gray[400]} />
          </TouchableOpacity>
        );
      })()}

      {/* Premium promo — still shown for free users */}
      {!isPremium && (
        <TouchableOpacity
          style={styles.premiumPromoCard}
          onPress={showSubscriptionScreen}
          activeOpacity={0.85}
        >
          <View style={styles.premiumPromoLeft}>
            <View style={styles.premiumPromoIcon}>
              <Icon name="crown" size={20} color={theme.colors.primary[500]} solid />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label" weight="semibold" style={styles.premiumPromoTitle}>
                Upgrade to Historia Pro
              </Text>
              <Text variant="caption" color="gray.500" style={styles.premiumPromoSub}>
                Offline maps · Exclusive badges · More features
              </Text>
            </View>
          </View>
          <View style={styles.premiumPromoCta}>
            <Text variant="caption" weight="bold" style={styles.premiumPromoCtaText}>
              Try Free
            </Text>
            <Icon name="chevron-right" size={10} color={theme.colors.white} solid />
          </View>
        </TouchableOpacity>
      )}

      {/* Refer a Friend Card */}
      {referralCode ? (
        <View style={styles.referralCard}>
          <View style={styles.referralCardTop}>
            <View style={styles.referralIcon}>
              <Icon name="gift" size={18} color={theme.colors.primary[500]} solid />
            </View>
            <View style={styles.referralCardText}>
              <Text variant="label" weight="semibold" style={styles.referralCardTitle}>
                Refer a Friend
              </Text>
              <Text variant="caption" color="gray.500">
                You &amp; a friend each get 20 bonus points
              </Text>
              {referralCount > 0 && (
                <Text variant="caption" color="primary.600" weight="medium" style={styles.referralCount}>
                  {referralCount} friend{referralCount !== 1 ? 's' : ''} referred
                </Text>
              )}
            </View>
          </View>
          <View style={styles.referralCardBottom}>
            <View style={styles.referralCodeBadge}>
              <Text variant="caption" weight="bold" style={styles.referralCodeText}>
                {referralCode}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
              onPress={shareReferralLink}
              disabled={isSharing}
              activeOpacity={0.8}
            >
              {isSharing ? (
                <Icon name="spinner" size={13} color={theme.colors.white} />
              ) : (
                <Icon name="arrow-up-from-bracket" size={13} color={theme.colors.white} />
              )}
              <Text variant="caption" weight="semibold" style={styles.shareButtonText}>
                {isSharing ? 'Creating link…' : 'Share Link'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Visited Landmarks Section */}
      {visits.length > 0 && (
        <View style={styles.visitsSection}>
          <Text variant="h4" weight="semibold" style={styles.visitsSectionTitle}>
            Visited Landmarks ({visits.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.visitsScrollContent}
          >
            {visits.map((visit) => (
              <TouchableOpacity key={visit.id} style={styles.visitCard}>
                {visit.landmark?.images[0] && (
                  <Image
                    source={{ uri: visit.landmark.images[0] }}
                    style={styles.visitImage}
                  />
                )}
                <View style={styles.visitInfo}>
                  <Text variant="caption" weight="semibold" numberOfLines={2} style={styles.visitName}>
                    {visit.landmark?.name}
                  </Text>
                  <View style={styles.visitCheck}>
                    <Icon name="check-circle" size={12} color={theme.colors.success[500]} solid />
                    <Text variant="caption" color="success.600" style={styles.visitCheckText}>
                      Visited
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Saved Landmarks Section */}
      <TouchableOpacity
        style={styles.bookmarksRow}
        onPress={() => navigation.navigate('Bookmarks')}
        activeOpacity={0.75}
      >
        <View style={styles.bookmarksRowLeft}>
          <View style={styles.bookmarksIcon}>
            <Icon name="bookmark" size={15} color={theme.colors.primary[500]} solid />
          </View>
          <Text variant="label" weight="medium" style={styles.bookmarksLabel}>
            Saved Landmarks
          </Text>
          <View style={styles.bookmarksCount}>
            <Text variant="caption" weight="bold" style={styles.bookmarksCountText}>
              {user.bookmarkCount ?? 0}
            </Text>
          </View>
        </View>
        <Icon name="chevron-right" size={14} color={theme.colors.gray[400]} />
      </TouchableOpacity>

      {/* Posts Section Header */}
      <View style={styles.postsHeader}>
        <Text variant="h4" weight="semibold">
          Posts ({posts.length})
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
      />
    </SafeAreaView>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: theme.spacing.lg,
  },
  profileContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: theme.spacing.md,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2f80ed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: theme.colors.white,
  },
  bellBadgeText: {
    color: theme.colors.white,
    fontSize: 9,
    lineHeight: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
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
  avatarEditIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  userName: {
    marginRight: theme.spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  handleText: {
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.primary[200],
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  // Points card
  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    borderWidth: 1.5,
  },
  pointsCardInfo: {
    flex: 1,
  },
  pointsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: 2,
  },
  pointsLevelName: {},
  pointsCardTitle: {
    color: theme.colors.primary[800],
  },
  trialChip: {
    backgroundColor: theme.colors.success[100],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  trialChipText: {
    color: theme.colors.success[700],
    fontSize: theme.fontSize.xs,
  },
  pointsBalance: {
    color: theme.colors.primary[700],
    marginBottom: 2,
  },
  // Premium promo card (free users)
  premiumPromoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary[200],
    ...theme.shadows.sm,
  },
  premiumPromoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  premiumPromoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumPromoTitle: {
    color: theme.colors.gray[800],
    marginBottom: 2,
  },
  premiumPromoSub: {
    lineHeight: 16,
  },
  premiumPromoCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    gap: 4,
    marginLeft: theme.spacing.sm,
  },
  premiumPromoCtaText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
  },
  // Refer a Friend card
  referralCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary[100],
    ...theme.shadows.sm,
  },
  referralCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  referralIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralCardText: {
    flex: 1,
  },
  referralCardTitle: {
    color: theme.colors.gray[800],
    marginBottom: 2,
  },
  referralCount: {
    marginTop: 2,
  },
  referralCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  referralCodeBadge: {
    flex: 1,
    backgroundColor: theme.colors.gray[100],
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  referralCodeText: {
    color: theme.colors.gray[800],
    letterSpacing: 2,
    fontSize: 14,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    color: theme.colors.white,
  },
  visitsSection: {
    marginBottom: theme.spacing.xl,
  },
  visitsSectionTitle: {
    marginBottom: theme.spacing.md,
  },
  visitsScrollContent: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  visitCard: {
    width: 140,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    ...theme.shadows.sm,
  },
  visitImage: {
    width: '100%',
    height: 100,
  },
  visitInfo: {
    padding: theme.spacing.sm,
  },
  visitName: {
    marginBottom: theme.spacing.xs,
    lineHeight: 16,
  },
  visitCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  visitCheckText: {
    fontSize: theme.fontSize.xs,
  },
  bookmarksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  bookmarksRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  bookmarksIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarksLabel: {
    color: theme.colors.gray[800],
  },
  bookmarksCount: {
    backgroundColor: theme.colors.primary[100],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    minWidth: 26,
    alignItems: 'center',
  },
  bookmarksCountText: {
    color: theme.colors.primary[700],
    fontSize: theme.fontSize.xs,
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
});

export default ProfileTab;
