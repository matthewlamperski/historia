import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Input } from '../components/ui';
import { theme } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { RootStackScreenProps } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useAuthStore } from '../store/authStore';
import { useDebounce } from '../hooks';
import { messagingService } from '../services';
import { ALGOLIA_APP_ID, ALGOLIA_SEARCH_ONLY_KEY, ALGOLIA_USERS_INDEX } from '../constants/algolia';
import { algoliasearch } from 'algoliasearch';

interface UserHit {
  objectID: string;
  username: string;
  name: string;
  avatar?: string;
}

const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_ONLY_KEY);

const NewConversationScreen: React.FC = () => {
  const navigation = useNavigation<RootStackScreenProps<'NewConversation'>['navigation']>();
  const { user } = useAuthStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setSearchError(null);

    algoliaClient
      .searchSingleIndex<UserHit>({
        indexName: ALGOLIA_USERS_INDEX,
        searchParams: { query: debouncedQuery, hitsPerPage: 20 },
      })
      .then(({ hits }) => {
        if (!cancelled) {
          const seen = new Set<string>();
          const deduped = hits.filter(h => {
            if (h.objectID === user?.id || seen.has(h.objectID)) return false;
            seen.add(h.objectID);
            return true;
          });
          setResults(deduped);
          setIsSearching(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSearchError('Search failed. Please try again.');
          setIsSearching(false);
        }
      });

    return () => { cancelled = true; };
  }, [debouncedQuery, user?.id]);

  const handleSelectUser = useCallback(
    async (hit: UserHit) => {
      if (!user?.id) return;
      try {
        const conversation = await messagingService.getOrCreateConversation(
          user.id,
          hit.objectID
        );
        navigation.replace('ChatScreen', {
          conversationId: conversation.id,
          otherUserId: hit.objectID,
          otherUserName: hit.name,
          otherUserAvatar: hit.avatar,
          otherUserUsername: hit.username,
        });
      } catch {
        setSearchError('Could not open conversation. Please try again.');
      }
    },
    [user?.id, navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: UserHit }) => (
      <TouchableOpacity
        style={styles.resultRow}
        onPress={() => handleSelectUser(item)}
        activeOpacity={0.7}
      >
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text variant="label" weight="bold" style={styles.avatarInitial}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.resultInfo}>
          <Text variant="label" weight="semibold" style={styles.resultName}>
            {item.name}
          </Text>
          <Text variant="caption" color="gray.500">
            @{item.username}
          </Text>
        </View>
        <Icon name="chevron-right" size={14} color={theme.colors.gray[400]} />
      </TouchableOpacity>
    ),
    [handleSelectUser]
  );

  const renderEmpty = () => {
    if (isSearching) return null;
    if (!query.trim()) {
      return (
        <View style={styles.emptyState}>
          <Icon name="at" size={40} color={theme.colors.gray[300]} />
          <Text variant="body" color="gray.400" style={styles.emptyText}>
            Search by handle to start a conversation
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Text variant="body" color="gray.400" style={styles.emptyText}>
          No users found for "@{query}"
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search */}
      <View style={styles.searchSection}>
        <Input
          placeholder="Search by @handle or name"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          containerStyle={styles.searchInput}
          leftIcon={<Icon name="magnifying-glass" size={16} color={theme.colors.gray[400]} />}
          rightIcon={
            isSearching ? (
              <ActivityIndicator size="small" color={theme.colors.gray[400]} />
            ) : query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Icon name="circle-xmark" size={16} color={theme.colors.gray[400]} />
              </TouchableOpacity>
            ) : undefined
          }
        />
      </View>

      {searchError ? (
        <View style={styles.errorBanner}>
          <Text variant="caption" color="error.500">
            {searchError}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={item => item.objectID}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={results.length === 0 ? styles.emptyContainer : undefined}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  searchSection: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  searchInput: {
    marginBottom: 0,
  },
  errorBanner: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.error[50],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.error[200],
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: theme.colors.primary[700],
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: theme.colors.gray[900],
    marginBottom: 2,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.gray[100],
    marginLeft: theme.spacing.md + 44 + theme.spacing.md,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['2xl'],
    gap: theme.spacing.md,
    paddingTop: theme.spacing['3xl'],
  },
  emptyText: {
    textAlign: 'center',
  },
});

export default NewConversationScreen;
