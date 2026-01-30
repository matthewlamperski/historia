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
import { theme } from '../constants/theme';
import { usePosts } from '../hooks';
import { Post as PostType, CreatePostData } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FeedTab = () => {
  const navigation = useNavigation<NavigationProp>();
  const [showCreatePost, setShowCreatePost] = useState(false);

  const {
    posts,
    loading,
    refreshing,
    error,
    hasMore,
    loadMorePosts,
    refreshPosts,
    createPost,
    toggleLike,
  } = usePosts();

  const handleLike = useCallback((postId: string) => {
    toggleLike(postId);
  }, [toggleLike]);

  const handleComment = useCallback((postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      navigation.navigate('PostDetail', { post });
    }
  }, [navigation, posts]);

  const handleShare = useCallback((postId: string) => {
    // In a real app, this would open a share sheet
    console.log('Share post:', postId);
  }, []);

  const handleUserPress = useCallback((userId: string) => {
    navigation.navigate('ProfileView', { userId });
  }, [navigation]);

  const handleCreatePost = useCallback(async (postData: CreatePostData) => {
    await createPost(postData);
  }, [createPost]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadMorePosts();
    }
  }, [hasMore, loading, loadMorePosts]);

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
    <View style={styles.header}>
      <Text variant="h2" weight="bold">
        Feed
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreatePost(true)}
      >
        <Icon name="plus" size={18} color={theme.colors.primary[500]} />
      </TouchableOpacity>
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
        onPress={() => setShowCreatePost(true)}
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
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.list,
          posts.length === 0 && styles.emptyList,
        ]}
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
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: theme.spacing.lg,
  },
  emptyList: {
    flex: 1,
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