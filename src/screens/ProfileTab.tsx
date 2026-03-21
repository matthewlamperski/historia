import React, { useState, useCallback } from 'react';
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
import { Text, Button, Post } from '../components/ui';
import { theme } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { RootStackScreenProps, Post as PostType } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useVisits, useSubscription } from '../hooks';
import { useAuthStore } from '../store/authStore';

// TODO: Replace with usePosts(currentUserId) when posts feed is wired to Firebase
const USER_POSTS: PostType[] = [];

const ProfileTab = () => {
  const navigation = useNavigation<RootStackScreenProps<'Main'>['navigation']>();
  const [posts] = useState<PostType[]>(USER_POSTS);

  const { user } = useAuthStore();
  const currentUserId = user?.id ?? '';

  const { visits } = useVisits(currentUserId, !!currentUserId);
  const { isPremium, isOnTrial, showSubscriptionScreen } = useSubscription();

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
        onComment={handleComment}
        onShare={handleShare}
        onUserPress={handleUserPress}
      />
    </TouchableOpacity>
  ), [handleComment, handleShare, handleUserPress, navigation]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View style={styles.profileContent}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={handleEditProfile} style={styles.avatarContainer}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text variant="h2" color="white" weight="bold">
                {(user.name ?? '').split(' ').map(n => n[0]).filter(Boolean).join('') || '?'}
              </Text>
            </View>
          )}
          <View style={styles.avatarEditIcon}>
            <Icon name="camera" size={14} color={theme.colors.white} />
          </View>
        </TouchableOpacity>

        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text variant="h3" style={styles.userName}>
              {user.name ?? 'Anonymous'}
            </Text>
            {user.isVerified && (
              <Icon name="badge-check" size={20} color={theme.colors.primary[500]} />
            )}
          </View>
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

      {/* Points & Rewards Section */}
      {isPremium ? (
        <View style={styles.pointsCard}>
          <View style={styles.pointsCardHeader}>
            <Icon name="star" size={16} color={theme.colors.warning[500]} solid />
            <Text variant="label" weight="semibold" style={styles.pointsCardTitle}>
              Your Points
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
            {(user.pointsBalance ?? 0).toLocaleString()} pts
          </Text>
          <Text variant="caption" color="gray.500">
            Earn +10 pts per visit · +2 pts per post
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.premiumPromoCard}
          onPress={showSubscriptionScreen}
          activeOpacity={0.85}
        >
          <View style={styles.premiumPromoLeft}>
            <View style={styles.premiumPromoIcon}>
              <Icon name="crown" size={20} color={theme.colors.primary[500]} solid />
            </View>
            <View>
              <Text variant="label" weight="semibold" style={styles.premiumPromoTitle}>
                Unlock Points & Badges
              </Text>
              <Text variant="caption" color="gray.500" style={styles.premiumPromoSub}>
                Earn rewards on every visit · Redeem for gear
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
              {user.bookmarkedLandmarks?.length ?? 0}
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  // Points card (premium users)
  pointsCard: {
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
  },
  pointsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
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
