import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Post } from '../components/ui';
import { theme } from '../constants/theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackScreenProps, User, Post as PostType, RootStackParamList } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';

// Mock user data for different profiles
const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Sarah Johnson',
    username: 'sarahj_history',
    email: 'sarah@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    bio: '🏛️ Architecture historian | 📸 Capturing Cincinnati\'s hidden gems | Teaching history through storytelling',
    location: 'Cincinnati, OH',
    website: 'https://sarahhistory.blog',
    followerCount: 2847,
    followingCount: 892,
    postCount: 156,
    isVerified: true,
    createdAt: '2023-03-10T08:15:00Z',
    updatedAt: '2025-01-12T10:30:00Z'
  },
  {
    id: 'user-2',
    name: 'Mike Chen',
    username: 'mike_explorer',
    email: 'mike@example.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    bio: 'Urban explorer 🏙️ | History buff | Weekend warrior discovering Cincinnati one landmark at a time',
    location: 'Covington, KY',
    followerCount: 1523,
    followingCount: 634,
    postCount: 78,
    isVerified: false,
    createdAt: '2023-09-22T14:45:00Z',
    updatedAt: '2025-01-11T16:20:00Z'
  }
];

const MOCK_USER_POSTS: Record<string, PostType[]> = {
  'user-1': [
    {
      id: 'sarah-post-1',
      userId: 'user-1',
      user: MOCK_USERS[0],
      content: 'The intricate details on the Cincinnati Music Hall never cease to amaze me! Built in 1878, this Gothic Revival masterpiece has survived fire, renovation, and countless performances. Each gargoyle tells a story. 🎭✨',
      images: ['https://images.unsplash.com/photo-1582739717734-0c6dd4c52c66?w=500'],
      likes: ['current-user-123', 'user-3', 'user-4', 'user-5'],
      commentCount: 23,
      location: {
        latitude: 39.1065,
        longitude: -84.5201,
        address: '1241 Elm St, Cincinnati, OH'
      },
      createdAt: new Date('2025-01-12T08:30:00Z'),
      updatedAt: new Date('2025-01-12T08:30:00Z')
    },
    {
      id: 'sarah-post-2',
      userId: 'user-1',
      user: MOCK_USERS[0],
      content: 'Hidden architectural gem alert! 🚨 Found these incredible terra cotta details on a 1920s building in Over-the-Rhine. The craftsmanship from this era is unmatched. Who else loves hunting for these historical treasures?',
      images: ['https://images.unsplash.com/photo-1486403303906-b71e0dcb1f8b?w=500'],
      likes: ['current-user-123', 'user-2'],
      commentCount: 15,
      createdAt: new Date('2025-01-11T14:15:00Z'),
      updatedAt: new Date('2025-01-11T14:15:00Z')
    }
  ],
  'user-2': [
    {
      id: 'mike-post-1',
      userId: 'user-2',
      user: MOCK_USERS[1],
      content: 'Epic sunrise shot from the Purple People Bridge this morning! 🌅 Fun fact: this pedestrian bridge connects Cincinnati and Newport and gives you the best views of both cities. Perfect spot for a morning jog!',
      images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500'],
      likes: ['current-user-123', 'user-1', 'user-6'],
      commentCount: 18,
      location: {
        latitude: 39.0937,
        longitude: -84.5089,
        address: 'Purple People Bridge, Newport, KY'
      },
      createdAt: new Date('2025-01-12T06:45:00Z'),
      updatedAt: new Date('2025-01-12T06:45:00Z')
    }
  ]
};

type ProfileViewRouteProp = RouteProp<RootStackParamList, 'ProfileView'>;

const ProfileView = () => {
  const navigation = useNavigation<RootStackScreenProps<'ProfileView'>['navigation']>();
  const route = useRoute<ProfileViewRouteProp>();
  const { userId } = route.params;

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);

  useEffect(() => {
    // Simulate API call to load user data
    const loadUserData = () => {
      const foundUser = MOCK_USERS.find(u => u.id === userId);
      const userPosts = MOCK_USER_POSTS[userId] || [];
      
      if (foundUser) {
        setUser(foundUser);
        setPosts(userPosts);
        // Simulate checking if current user follows this user
        setIsFollowing(Math.random() > 0.5);
      }
      setLoading(false);
    };

    setTimeout(loadUserData, 500);
  }, [userId]);

  const handleFollowToggle = useCallback(async () => {
    if (!user) return;
    
    setIsFollowingLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsFollowing(prev => {
        const newFollowing = !prev;
        setUser(prevUser => prevUser ? {
          ...prevUser,
          followerCount: prevUser.followerCount + (newFollowing ? 1 : -1)
        } : null);
        return newFollowing;
      });
      setIsFollowingLoading(false);
    }, 500);
  }, [user]);

  const handleMessage = useCallback(() => {
    // Navigate to messages or open chat
    console.log('Message user:', user?.username);
  }, [user]);

  const handleLike = useCallback((postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = post.likes.includes('current-user-123');
        return {
          ...post,
          likes: isLiked 
            ? post.likes.filter(id => id !== 'current-user-123')
            : [...post.likes, 'current-user-123']
        };
      }
      return post;
    }));
  }, []);

  const handleComment = useCallback((postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      navigation.navigate('PostDetail', { post });
    }
  }, [navigation, posts]);

  const handleShare = useCallback((postId: string) => {
    console.log('Share post:', postId);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const renderPost = useCallback(({ item }: { item: PostType }) => (
    <TouchableOpacity 
      activeOpacity={0.95}
      onPress={() => navigation.navigate('PostDetail', { post: item })}
    >
      <Post
        post={item}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
      />
    </TouchableOpacity>
  ), [handleLike, handleComment, handleShare, navigation]);

  const renderHeader = () => {
    if (!user) return null;

    return (
      <View style={styles.profileContent}>
        {/* Header with back button */}
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={20} color={theme.colors.gray[700]} />
          </TouchableOpacity>
          <Text variant="h3" weight="semibold" style={styles.headerTitle}>
            @{user.username}
          </Text>
          <TouchableOpacity style={styles.moreButton}>
            <Icon name="ellipsis" size={20} color={theme.colors.gray[700]} />
          </TouchableOpacity>
        </View>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text variant="h2" color="white" weight="bold">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
            )}
          </View>
          
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
        {user.bio && (
          <View style={styles.bioSection}>
            <Text variant="body" style={styles.bioText}>
              {user.bio}
            </Text>
            
            {user.website && (
              <TouchableOpacity style={styles.websiteLink}>
                <Icon name="link" size={14} color={theme.colors.primary[500]} />
                <Text variant="body" color="primary.500" style={styles.websiteText}>
                  {user.website}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Profile Stats */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statItem}>
            <Text variant="h3" color="primary.500">
              {user.postCount}
            </Text>
            <Text variant="caption" color="gray.600">
              Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem}>
            <Text variant="h3" color="primary.500">
              {user.followerCount.toLocaleString()}
            </Text>
            <Text variant="caption" color="gray.600">
              Followers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem}>
            <Text variant="h3" color="primary.500">
              {user.followingCount}
            </Text>
            <Text variant="caption" color="gray.600">
              Following
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            variant={isFollowing ? "outline" : "primary"}
            onPress={handleFollowToggle}
            disabled={isFollowingLoading}
            style={styles.followButton}
          >
            {isFollowingLoading ? (
              <ActivityIndicator size="small" color={isFollowing ? theme.colors.primary[500] : theme.colors.white} />
            ) : (
              isFollowing ? "Following" : "Follow"
            )}
          </Button>
          <Button
            variant="outline"
            onPress={handleMessage}
            style={styles.messageButton}
          >
            Message
          </Button>
        </View>

        {/* Posts Header */}
        <View style={styles.postsHeader}>
          <Text variant="h4" weight="semibold">Posts</Text>
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text variant="body" color="gray.500" style={styles.loadingText}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="user-slash" size={48} color={theme.colors.error[500]} />
          <Text variant="h4" color="error.500">User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
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
  followButton: {
    flex: 2,
  },
  messageButton: {
    flex: 1,
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