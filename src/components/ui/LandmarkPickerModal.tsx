import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { Text } from './Text';
import { theme } from '../../constants/theme';
import { searchLandmarks, LandmarkHit } from '../../services/algoliaLandmarksService';

export interface PickedLandmark {
  id: string;
  name: string;
  address?: string;
}

interface LandmarkPickerModalProps {
  visible: boolean;
  onConfirm: (landmark: PickedLandmark) => void;
  onCancel: () => void;
}

export const LandmarkPickerModal: React.FC<LandmarkPickerModalProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<LandmarkHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const hits = await searchLandmarks(text.trim());
        setResults(hits);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }, []);

  const handleSelect = (hit: LandmarkHit) => {
    onConfirm({ id: hit.objectID, name: hit.name, address: hit.address });
    setSearchQuery('');
    setResults([]);
  };

  const handleCancel = () => {
    setSearchQuery('');
    setResults([]);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
            <Text variant="label" color="gray.600">Cancel</Text>
          </TouchableOpacity>
          <Text variant="h3">Tag a Landmark</Text>
          <View style={styles.headerBtn} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.searchRow}>
            <Icon name="magnifying-glass" size={15} color={theme.colors.gray[400]} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search historical landmarks…"
              placeholderTextColor={theme.colors.gray[400]}
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
            />
            {isSearching && (
              <ActivityIndicator size="small" color={theme.colors.primary[500]} />
            )}
            {searchQuery.length > 0 && !isSearching && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setResults([]); }}>
                <Icon name="xmark" size={14} color={theme.colors.gray[400]} />
              </TouchableOpacity>
            )}
          </View>

          {results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={item => item.objectID}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.divider} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.resultIcon}>
                    <Icon name="landmark" size={16} color={theme.colors.primary[500]} />
                  </View>
                  <View style={styles.resultText}>
                    <Text variant="body" weight="medium" numberOfLines={1}>{item.name}</Text>
                    {item.address && (
                      <Text variant="caption" color="gray.500" numberOfLines={1}>{item.address}</Text>
                    )}
                  </View>
                  <Icon name="chevron-right" size={12} color={theme.colors.gray[300]} />
                </TouchableOpacity>
              )}
            />
          ) : searchQuery.length > 1 && !isSearching ? (
            <View style={styles.emptyState}>
              <Icon name="landmark" size={40} color={theme.colors.gray[200]} />
              <Text variant="body" color="gray.400" style={styles.emptyText}>No landmarks found</Text>
              <Text variant="caption" color="gray.400">Try a different search term</Text>
            </View>
          ) : searchQuery.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="magnifying-glass" size={40} color={theme.colors.gray[200]} />
              <Text variant="body" color="gray.400" style={styles.emptyText}>Search for a landmark</Text>
              <Text variant="caption" color="gray.400">Type a name, location, or description</Text>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  headerBtn: { minWidth: 60 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.gray[50],
    paddingHorizontal: theme.spacing.md,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[900],
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.gray[100],
    marginLeft: theme.spacing.lg + 44,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: 8,
  },
  emptyText: { marginTop: theme.spacing.sm },
});
