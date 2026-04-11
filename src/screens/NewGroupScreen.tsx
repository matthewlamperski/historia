import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Input, Button } from '../components/ui';
import { theme } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { RootStackScreenProps } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useAuthStore } from '../store/authStore';
import { useConversations, useDebounce } from '../hooks';
import { ALGOLIA_APP_ID, ALGOLIA_SEARCH_ONLY_KEY, ALGOLIA_USERS_INDEX } from '../constants/algolia';
import { algoliasearch } from 'algoliasearch';

interface AlgoliaUserHit {
  objectID: string;
  username: string;
  name: string;
  avatar?: string;
}

const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_ONLY_KEY);

type Step = 'select' | 'name';

const NewGroupScreen: React.FC = () => {
  const navigation = useNavigation<RootStackScreenProps<'NewGroup'>['navigation']>();
  const { user } = useAuthStore();
  const { createGroup } = useConversations(user?.id ?? '');

  const [step, setStep] = useState<Step>('select');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AlgoliaUserHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<AlgoliaUserHit[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    algoliaClient
      .searchSingleIndex<AlgoliaUserHit>({
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
        if (!cancelled) setIsSearching(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery, user?.id]);

  const toggleUser = useCallback((hit: AlgoliaUserHit) => {
    setSelectedUsers(prev => {
      const exists = prev.some(u => u.objectID === hit.objectID);
      if (exists) return prev.filter(u => u.objectID !== hit.objectID);
      return [...prev, hit];
    });
  }, []);

  const isSelected = (objectID: string) =>
    selectedUsers.some(u => u.objectID === objectID);

  const handleNext = useCallback(() => {
    if (selectedUsers.length < 2) return;
    setStep('name');
  }, [selectedUsers.length]);

  useEffect(() => {
    navigation.setOptions({
      title: step === 'select' ? 'Add People' : 'Name Group',
      headerLeft: step === 'name'
        ? () => (
            <TouchableOpacity
              onPress={() => setStep('select')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginLeft: 4 }}
            >
              <Icon name="chevron-left" size={22} color={theme.colors.gray[700]} />
            </TouchableOpacity>
          )
        : undefined,
      headerRight: step === 'select'
        ? () => (
            <TouchableOpacity
              onPress={handleNext}
              disabled={selectedUsers.length < 2}
              style={{ marginRight: 4, opacity: selectedUsers.length < 2 ? 0.4 : 1 }}
            >
              <Text variant="label" weight="semibold" style={{ color: theme.colors.primary[500] }}>
                Next
              </Text>
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [step, selectedUsers.length, handleNext, navigation]);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }
    if (selectedUsers.length < 2) {
      setError('Select at least 2 participants');
      return;
    }

    setError(null);
    setIsCreating(true);
    try {
      const participantIds = selectedUsers.map(u => u.objectID);
      const conv = await createGroup(groupName.trim(), participantIds);
      (navigation as any).replace('ChatScreen', { conversationId: conv.id });
    } catch {
      setError('Failed to create group. Please try again.');
      setIsCreating(false);
    }
  };

  const renderUserItem = useCallback(
    ({ item }: { item: AlgoliaUserHit }) => {
      const selected = isSelected(item.objectID);
      return (
        <TouchableOpacity
          style={styles.resultRow}
          onPress={() => toggleUser(item)}
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
          <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
            {selected && (
              <Icon name="check" size={12} color={theme.colors.white} />
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [selectedUsers, toggleUser]
  );

  const renderChip = (hit: AlgoliaUserHit) => (
    <TouchableOpacity
      key={hit.objectID}
      style={styles.chip}
      onPress={() => toggleUser(hit)}
    >
      <Text variant="caption" weight="semibold" style={styles.chipText}>
        {hit.name}
      </Text>
      <Icon name="xmark" size={10} color={theme.colors.primary[600]} />
    </TouchableOpacity>
  );

  const renderEmptySearch = () => {
    if (isSearching) return null;
    if (!query.trim()) {
      return (
        <View style={styles.emptyState}>
          <Icon name="magnifying-glass" size={36} color={theme.colors.gray[300]} />
          <Text variant="body" color="gray.400" style={styles.emptyText}>
            Search for people to add
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Text variant="body" color="gray.400" style={styles.emptyText}>
          No users found for "{query}"
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {step === 'select' ? (
        <>
          {/* Selected chips */}
          {selectedUsers.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContent}
            >
              {selectedUsers.map(renderChip)}
            </ScrollView>
          )}

          {/* Search input */}
          <View style={styles.searchSection}>
            <Input
              placeholder="Search by @handle or name"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              containerStyle={styles.searchInput}
              leftIcon={
                <Icon name="magnifying-glass" size={16} color={theme.colors.gray[400]} />
              }
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

          <FlatList
            data={results}
            keyExtractor={item => item.objectID}
            renderItem={renderUserItem}
            ListEmptyComponent={renderEmptySearch}
            contentContainerStyle={results.length === 0 ? styles.emptyContainer : undefined}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />

          {selectedUsers.length > 0 && (
            <View style={styles.selectionBar}>
              <Text variant="caption" color="gray.500">
                {selectedUsers.length} selected
                {selectedUsers.length < 2 ? ' (need at least 2)' : ''}
              </Text>
            </View>
          )}
        </>
      ) : (
        /* Name step */
        <View style={styles.nameStep}>
          <View style={styles.nameIconWrap}>
            <Icon name="users" size={32} color={theme.colors.primary[500]} />
          </View>

          <Text variant="body" color="gray.500" style={styles.nameSubtitle}>
            {selectedUsers.length} participants
          </Text>

          <Input
            label="Group Name"
            placeholder="Enter a name for this group"
            value={groupName}
            onChangeText={setGroupName}
            autoFocus
            containerStyle={styles.nameInput}
            maxLength={50}
          />

          {error ? (
            <View style={styles.errorRow}>
              <Icon name="circle-exclamation" size={14} color={theme.colors.error[500]} />
              <Text variant="caption" color="error.500" style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          <Button
            variant="primary"
            fullWidth
            onPress={handleCreate}
            disabled={!groupName.trim() || isCreating}
            style={styles.createBtn}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              'Create Group'
            )}
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  chipsScroll: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  chipsContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  chipText: {
    color: theme.colors.primary[700],
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
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
    paddingTop: theme.spacing['3xl'],
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  emptyText: {
    textAlign: 'center',
  },
  selectionBar: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[100],
  },
  // Name step
  nameStep: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
  },
  nameIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  nameSubtitle: {
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  nameInput: {
    marginBottom: theme.spacing.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    flex: 1,
  },
  createBtn: {
    marginTop: theme.spacing.md,
  },
});

export default NewGroupScreen;
