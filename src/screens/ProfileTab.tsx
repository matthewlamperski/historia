import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Post } from '../components/ui';
import { theme } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { RootStackScreenProps, User, Post as PostType } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useImagePicker } from '../hooks/useImagePicker';
import { useVisits, useSubscription } from '../hooks';

// Mock current user data
const CURRENT_USER: User = {
  id: 'current-user-123',
  name: 'John Doe',
  username: 'johndoe',
  email: 'john.doe@example.com',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  bio: 'History enthusiast exploring Cincinnati\'s rich past 🏛️ | Sharing stories one landmark at a time ✨',
  location: 'Cincinnati, OH',
  website: 'https://johndoe.com',
  followerCount: 1247,
  followingCount: 432,
  postCount: 89,
  isVerified: false,
  companions: ['mock-user-1', 'mock-user-2'],
  visitedLandmarks: ['1', '2', '3'],
  bookmarkedLandmarks: ['4', '5'],
  isPremium: false,
  pointsBalance: 0,
  subscriptionStatus: 'free',
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2025-01-12T14:22:00Z'
};

// Mock user posts
const USER_POSTS: PostType[] = [
  {
    id: 'post-1',
    userId: 'current-user-123',
    user: CURRENT_USER,
    content: 'Just visited the Cincinnati Museum Center! The Art Deco architecture is absolutely breathtaking. Fun fact: it served as a prototype for many other train stations built in the 1930s. 🚂✨',
    images: ['https://images.unsplash.com/photo-1580407196238-dac33f57c410?w=500'],
    landmarkId: '1',
    commentCount: 12,
    location: {
      latitude: 39.1097,
      longitude: -84.5386,
      address: '1301 Western Ave, Cincinnati, OH'
    },
    createdAt: new Date('2025-01-11T15:30:00Z'),
    updatedAt: new Date('2025-01-11T15:30:00Z')
  },
  {
    id: 'post-2',
    userId: 'current-user-123',
    user: CURRENT_USER,
    content: 'Walking across the Roebling Suspension Bridge today reminded me that this beauty was actually the prototype for the Brooklyn Bridge! John Augustus Roebling\'s engineering genius spans both Cincinnati and New York. 🌉',
    images: ['https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=500'],
    landmarkId: '2',
    commentCount: 8,
    location: {
      latitude: 39.0936,
      longitude: -84.5092,
      address: 'Roebling Bridge, Cincinnati, OH'
    },
    createdAt: new Date('2025-01-10T09:15:00Z'),
    updatedAt: new Date('2025-01-10T09:15:00Z')
  },
  {
    id: 'post-3',
    userId: 'current-user-123',
    user: CURRENT_USER,
    content: 'Found this hidden gem at Fountain Square today! The Tyler Davidson Fountain has been the heart of Cincinnati since 1871. It\'s amazing how this space has witnessed over 150 years of city life. 💫',
    images: ['https://images.unsplash.com/photo-1573160813959-df05c1b8b5c4?w=500'],
    landmarkId: '3',
    commentCount: 5,
    createdAt: new Date('2025-01-09T12:45:00Z'),
    updatedAt: new Date('2025-01-09T12:45:00Z')
  }
];

const ProfileTab = () => {
  const navigation = useNavigation<RootStackScreenProps<'Main'>['navigation']>();
  const { selectedImages, pickImages, clearImages } = useImagePicker();
  const [user, setUser] = useState<User>(CURRENT_USER);
  const [posts, _setPosts] = useState<PostType[]>(USER_POSTS);
  const [_loading, _setLoading] = useState(false);
  const [_refreshing, _setRefreshing] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, _setBioText] = useState(user.bio || '');

  const currentUserId = 'current-user-123';
  const { visits } = useVisits(currentUserId, true);
  const { isPremium, isOnTrial, showSubscriptionScreen } = useSubscription();

  const handleEditProfile = () => {
    console.log('Edit profile pressed');
    // In a real app, this would open an edit profile modal
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleChangeAvatar = useCallback(async () => {
    try {
      await pickImages();
      if (selectedImages.length > 0) {
        // In a real app, you would upload this to your server
        setUser(prev => ({ ...prev, avatar: selectedImages[0] }));
        clearImages();
      }
    } catch {
      Alert.alert('Error', 'Failed to change profile picture');
    }
  }, [pickImages, selectedImages, clearImages]);

  const handleSaveBio = useCallback(() => {
    setUser(prev => ({ ...prev, bio: bioText }));
    setIsEditingBio(false);
    // In a real app, save to server
  }, [bioText]);


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

  const renderHeader = () => (
    <View style={styles.profileContent}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={handleChangeAvatar} style={styles.avatarContainer}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text variant="h2" color="white" weight="bold">
                {user.name.split(' ').map(n => n[0]).join('')}
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
              {user.name}
            </Text>
            {user.isVerified && (
              <Icon name="badge-check" size={20} color={theme.colors.primary[500]} />
            )}
          </View>
          <Text variant="body" color="gray.600">
            @{user.username}
          </Text>
          {user.location && (
            <View style={styles.locationRow}>
              <Icon name="location-dot" size={14} color={theme.colors.gray[500]} />
              <Text variant="caption" color="gray.500" style={styles.locationText}>
                {user.location}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Bio Section */}
      <View style={styles.bioSection}>
        {isEditingBio ? (
          <View style={styles.bioEditContainer}>
            <Text variant="body" style={styles.bioText}>
              {bioText}
            </Text>
            <View style={styles.bioActions}>
              <TouchableOpacity onPress={() => setIsEditingBio(false)}>
                <Text variant="body" color="gray.500">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveBio}>
                <Text variant="body" color="primary.500" weight="medium">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setIsEditingBio(true)}>
            <Text variant="body" style={styles.bioText}>
              {user.bio || 'Add a bio to tell people more about yourself...'}
            </Text>
          </TouchableOpacity>
        )}
        
        {user.website && (
          <TouchableOpacity style={styles.websiteLink}>
            <Icon name="link" size={14} color={theme.colors.primary[500]} />
            <Text variant="body" color="primary.500" style={styles.websiteText}>
              {user.website}
            </Text>
          </TouchableOpacity>
        )}
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
            <Icon name="chevron-right" size={10} color={theme.colors.primary[600]} solid />
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
  bioEditContainer: {
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  bioActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
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