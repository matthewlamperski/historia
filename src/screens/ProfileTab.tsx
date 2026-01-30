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
    likes: ['user-1', 'user-2', 'user-3'],
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
    likes: ['user-4', 'user-5'],
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
    likes: ['user-1', 'user-6'],
    commentCount: 5,
    createdAt: new Date('2025-01-09T12:45:00Z'),
    updatedAt: new Date('2025-01-09T12:45:00Z')
  }
];

const ProfileTab = () => {
  const navigation = useNavigation<RootStackScreenProps<'Main'>['navigation']>();
  const { selectedImages, pickImages, clearImages } = useImagePicker();
  const [user, setUser] = useState<User>(CURRENT_USER);
  const [posts, setPosts] = useState<PostType[]>(USER_POSTS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(user.bio || '');

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
    } catch (error) {
      Alert.alert('Error', 'Failed to change profile picture');
    }
  }, [pickImages, selectedImages, clearImages]);

  const handleSaveBio = useCallback(() => {
    setUser(prev => ({ ...prev, bio: bioText }));
    setIsEditingBio(false);
    // In a real app, save to server
  }, [bioText]);

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

  const handleUserPress = useCallback((userId: string) => {
    navigation.navigate('ProfileView', { userId });
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate API call
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
        onUserPress={handleUserPress}
      />
    </TouchableOpacity>
  ), [handleLike, handleComment, handleShare, handleUserPress, navigation]);

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
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
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