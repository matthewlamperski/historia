import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/ui';
import { theme } from '../constants/theme';
import { RootStackScreenProps, User } from '../types';
import { useCompanions } from '../hooks';
import Icon from 'react-native-vector-icons/FontAwesome6';

type Props = RootStackScreenProps<'CompanionsList'>;

const CompanionRow: React.FC<{ person: User; onPress: () => void }> = ({
  person,
  onPress,
}) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.avatar}>
      {person.avatar ? (
        <Image source={{ uri: person.avatar }} style={styles.avatarImage} />
      ) : (
        <Icon name="user" size={18} color={theme.colors.gray[500]} />
      )}
    </View>
    <View style={styles.info}>
      <Text style={styles.name}>{person.name}</Text>
      {person.username ? (
        <Text style={styles.handle}>@{person.username}</Text>
      ) : null}
    </View>
    <Icon name="chevron-right" size={14} color={theme.colors.gray[400]} />
  </TouchableOpacity>
);

export default function CompanionsListScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const { companions, loading } = useCompanions(userId);

  useEffect(() => {
    navigation.setOptions({ title: 'Companions' });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {loading ? (
        <ActivityIndicator style={styles.spinner} color={theme.colors.primary[500]} />
      ) : (
        <FlatList
          data={companions}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CompanionRow
              person={item}
              onPress={() => navigation.navigate('ProfileView', { userId: item.id })}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No companions yet.</Text>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  spinner: {
    marginTop: theme.spacing['3xl'],
  },
  listContent: {
    paddingBottom: theme.spacing['3xl'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
  },
  handle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    marginTop: 1,
  },
  empty: {
    textAlign: 'center',
    marginTop: theme.spacing['3xl'],
    color: theme.colors.gray[500],
    fontSize: theme.fontSize.base,
  },
});
