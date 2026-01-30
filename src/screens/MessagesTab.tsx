import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '../components/ui';
import { theme } from '../constants/theme';

interface FavoriteItem {
  id: string;
  title: string;
  description: string;
  isFavorite: boolean;
}

const MessagesTab = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([
    {
      id: '1',
      title: 'Favorite Item 1',
      description: 'This is your first favorite item',
      isFavorite: true,
    },
    {
      id: '2',
      title: 'Favorite Item 2',
      description: 'This is another favorite item',
      isFavorite: true,
    },
  ]);

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(item => item.id !== id));
  };

  const renderFavorite = ({ item }: { item: FavoriteItem }) => (
    <View style={styles.favoriteItem}>
      <View style={styles.favoriteContent}>
        <Text variant="h4" style={styles.favoriteTitle}>
          {item.title}
        </Text>
        <Text variant="body" color="gray.600">
          {item.description}
        </Text>
      </View>
      <Button
        variant="outline"
        size="sm"
        onPress={() => removeFavorite(item.id)}
      >
        Remove
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text variant="h2" style={styles.title}>
          Favorites
        </Text>

        {favorites.length > 0 ? (
          <FlatList
            data={favorites}
            renderItem={renderFavorite}
            keyExtractor={item => item.id}
            style={styles.favoritesList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text variant="h3" color="gray.400" style={styles.emptyTitle}>
              No Favorites Yet
            </Text>
            <Text variant="body" color="gray.500" style={styles.emptyText}>
              Items you mark as favorites will appear here
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  title: {
    marginBottom: theme.spacing.lg,
  },
  favoritesList: {
    flex: 1,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  favoriteContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  favoriteTitle: {
    marginBottom: theme.spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
  },
});

export default MessagesTab;