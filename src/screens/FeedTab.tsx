import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Post, CreatePostModal } from '../components/ui';
import { LandmarkModal } from '../components/ui/LandmarkModal';
import { theme } from '../constants/theme';
import { usePosts, useCompanions, useModeration, useRequireAuth } from '../hooks';
import { Post as PostType, CreatePostData, Landmark } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { followService } from '../services/followService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FeedTab = () => {
  const navigation = useNavigation<NavigationProp>();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCompanionsOnly, setShowCompanionsOnly] = useState(false);
  const [showFollowingOnly, setShowFollowingOnly] = useState(false);
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [landmarkModalVisible, setLandmarkModalVisible] = useState(false);

  const { user } = useAuthStore();
  const userId = user?.id ?? '';
  const requireAuth = useRequireAuth();
  const { companions } = useCompanions(userId);
  const { mutedUserIds } = useModeration();

  const {
    posts,
    loading,
    refreshing,
    error,
    hasMore,
    loadMorePosts,
    refreshPosts,
    createPost,
    removePost,
    loadCompanionPosts,
  } = usePosts();

  const handleToggleCompanionFilter = useCallback(() => {
    const newValue = !showCompanionsOnly;
    setShowCompanionsOnly(newValue);
    setShowFollowingOnly(false);
    if (newValue) {
      const companionIds = [userId, ...companions.map(c => c.id)];
      loadCompanionPosts(companionIds);
    } else {
      refreshPosts();
    }
  }, [showCompanionsOnly, userId, companions, loadCompanionPosts, refreshPosts]);

  const handleToggleFollowingFilter = useCallback(async () => {
    const newValue = !showFollowingOnly;
    setShowFollowingOnly(newValue);
    setShowCompanionsOnly(false);
    if (newValue) {
      const followingIds = await followService.getFollowingIds(userId);
      const ids = [userId, ...followingIds];
      loadCompanionPosts(ids);
    } else {
      refreshPosts();
    }
  }, [showFollowingOnly, userId, loadCompanionPosts, refreshPosts]);

  const handleComment = useCallback((postId: string) => {
    if (!requireAuth()) return;
    const post = posts.find(p => p.id === postId);
    if (post) {
      navigation.navigate('PostDetail', { post });
    }
  }, [navigation, posts, requireAuth]);

  const handleShare = useCallback((_postId: string) => {
    // In a real app, this would open a share sheet
  }, []);

  const handleUserPress = useCallback((uid: string) => {
    if (!requireAuth()) return;
    navigation.navigate('ProfileView', { userId: uid });
  }, [navigation, requireAuth]);

  const handleCreatePost = useCallback(async (postData: CreatePostData) => {
    await createPost(postData);
  }, [createPost]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadMorePosts();
    }
  }, [hasMore, loading, loadMorePosts]);

  const handleLandmarkPress = useCallback((landmark: Landmark) => {
    setSelectedLandmark(landmark);
    setLandmarkModalVisible(true);
  }, []);

  const renderPost = useCallback(({ item }: { item: PostType }) => (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => {
        if (!requireAuth()) return;
        navigation.navigate('PostDetail', { post: item });
      }}
    >
      <Post
        post={item}
        currentUserId={userId}
        onComment={handleComment}
        onShare={handleShare}
        onUserPress={handleUserPress}
        onLandmarkPress={handleLandmarkPress}
        onDelete={removePost}
      />
    </TouchableOpacity>
  ), [handleComment, handleShare, handleUserPress, handleLandmarkPress, navigation, userId, requireAuth, removePost]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text variant="h2" weight="bold">
        Feed
      </Text>
      <View style={styles.headerActions}>
        {/* Personalized filters only make sense for signed-in users. */}
        {user && (
          <>
            <TouchableOpacity
              style={[styles.filterButton, showCompanionsOnly && styles.filterButtonActive]}
              onPress={handleToggleCompanionFilter}
            >
              <Icon
                name="user-group"
                size={14}
                color={showCompanionsOnly ? theme.colors.white : theme.colors.primary[500]}
              />
              <Text
                variant="caption"
                color={showCompanionsOnly ? 'white' : 'primary.500'}
                style={styles.filterText}
              >
                Companions
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, showFollowingOnly && styles.filterButtonActive]}
              onPress={handleToggleFollowingFilter}
            >
              <Icon
                name="rss"
                size={14}
                color={showFollowingOnly ? theme.colors.white : theme.colors.primary[500]}
              />
              <Text
                variant="caption"
                color={showFollowingOnly ? 'white' : 'primary.500'}
                style={styles.filterText}
              >
                Following
              </Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {
            if (!requireAuth()) return;
            setShowCreatePost(true);
          }}
        >
          <Icon name="plus" size={18} color={theme.colors.primary[500]} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="newspaper" size={64} color={theme.colors.gray[300]} />
      <Text variant="h3" color="gray.500" style={styles.emptyTitle}>
        No posts yet
      </Text>
      <Text variant="body" color="gray.400" style={styles.emptySubtitle}>
        Be the first to share something with the community
      </Text>
      <Button
        variant="primary"
        onPress={() => {
          if (!requireAuth()) return;
          setShowCreatePost(true);
        }}
        style={styles.emptyButton}
      >
        Create Your First Post
      </Button>
    </View>
  );

  const renderFooter = () => {
    if (!loading || posts.length === 0) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary[500]} />
        <Text variant="caption" color="gray.500" style={styles.footerText}>
          Loading more posts...
        </Text>
      </View>
    );
  };

  const renderError = () => (
    <View style={styles.errorState}>
      <Icon name="exclamation-triangle" size={48} color={theme.colors.error[500]} />
      <Text variant="h4" color="error.500" style={styles.errorTitle}>
        Something went wrong
      </Text>
      <Text variant="body" color="gray.500" style={styles.errorMessage}>
        {error}
      </Text>
      <Button
        variant="outline"
        onPress={refreshPosts}
        style={styles.retryButton}
      >
        Try Again
      </Button>
    </View>
  );

  if (error && posts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderError()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <FlatList
        data={posts.filter(p => {
          if (mutedUserIds.includes(p.userId)) return false;
          if (showCompanionsOnly) {
            const companionIds = new Set([userId, ...companions.map(c => c.id)]);
            return companionIds.has(p.userId);
          }
          return true;
        })}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        style={styles.flatList}
        contentContainerStyle={
          posts.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshPosts}
            tintColor={theme.colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onSubmit={handleCreatePost}
      />

      {/* Landmark Detail Modal */}
      <LandmarkModal
        landmark={selectedLandmark}
        visible={landmarkModalVisible}
        onClose={() => {
          setLandmarkModalVisible(false);
          setSelectedLandmark(null);
        }}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    gap: theme.spacing.xs,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  filterText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatList: {
    flex: 1,
  },
  list: {
    paddingBottom: theme.spacing.lg,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: theme.spacing.xl,
  },
  footerLoader: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  footerText: {
    marginTop: theme.spacing.sm,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  errorTitle: {
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: theme.spacing.xl,
  },
});

export default FeedTab;
