import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { theme } from '../constants/theme';
import { useOfflineMaps } from '../hooks';
import { useSubscription } from '../hooks';
import { OfflinePackMeta } from '../types';

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function totalSizeMB(packs: OfflinePackMeta[]): number {
  return parseFloat(packs.reduce((sum, p) => sum + p.estimatedSizeMB, 0).toFixed(1));
}

const OfflineMapsScreen = () => {
  const navigation = useNavigation();
  const { isPremium } = useSubscription();
  const { packs, deletePackForLandmark, loadPacks } = useOfflineMaps();

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: theme.fontSize.base, fontWeight: theme.fontWeight.semibold, color: theme.colors.gray[900] }}>
            Offline Maps
          </Text>
          {packs.length > 0 && (
            <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.gray[500] }}>
              {packs.length} area{packs.length !== 1 ? 's' : ''} · {totalSizeMB(packs)} MB
            </Text>
          )}
        </View>
      ),
    });
  }, [packs, navigation]);

  const handleDelete = useCallback(
    (pack: OfflinePackMeta) => {
      Alert.alert(
        'Remove Saved Map',
        `Remove the offline map for "${pack.landmarkName}"? You can re-download it later.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => deletePackForLandmark(pack.landmarkId),
          },
        ],
      );
    },
    [deletePackForLandmark],
  );

  const renderItem = useCallback(
    ({ item }: { item: OfflinePackMeta }) => (
      <View style={styles.packRow}>
        <View style={styles.packIcon}>
          <Icon name="map" size={18} color={theme.colors.primary[600]} />
        </View>
        <View style={styles.packInfo}>
          <Text style={styles.packName} numberOfLines={1}>
            {item.landmarkName}
          </Text>
          <Text style={styles.packMeta}>
            {formatDate(item.downloadedAt)} · {item.estimatedSizeMB} MB
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="trash" size={16} color={theme.colors.error[500]} />
        </TouchableOpacity>
      </View>
    ),
    [handleDelete],
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Icon name="map" size={36} color={theme.colors.primary[300]} />
      </View>
      <Text style={styles.emptyTitle}>No saved maps</Text>
      <Text style={styles.emptyBody}>
        Open a landmark and tap "Offline" to save its map area for offline use.
      </Text>
    </View>
  );

  const renderPremiumGate = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Icon name="crown" size={36} color={theme.colors.primary[400]} />
      </View>
      <Text style={styles.emptyTitle}>Pro Feature</Text>
      <Text style={styles.emptyBody}>
        Offline maps are available to Historia Pro subscribers. Upgrade to save map areas and explore without internet.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {!isPremium ? (
        renderPremiumGate()
      ) : (
        <FlatList
          data={packs}
          keyExtractor={item => item.landmarkId}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={packs.length === 0 ? styles.emptyContainer : styles.listContent}
          onRefresh={loadPacks}
          refreshing={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  listContent: {
    paddingVertical: theme.spacing.sm,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  packIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  packInfo: {
    flex: 1,
  },
  packName: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
    marginBottom: 2,
  },
  packMeta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
  },
  deleteBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.gray[100],
    marginLeft: theme.spacing.md + 44 + theme.spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['2xl'],
    paddingBottom: theme.spacing['3xl'],
    gap: theme.spacing.md,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[800],
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[500],
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default OfflineMapsScreen;
