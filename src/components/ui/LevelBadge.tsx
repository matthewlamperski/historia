import React from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { theme } from '../../constants/theme';
import { getLevelForPoints } from '../../constants/levels';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

interface LevelBadgeProps {
  points: number;
  userId: string;
  style?: ViewStyle;
  /** Set true to disable navigation (e.g. when already on LevelsScreen) */
  disablePress?: boolean;
}

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  points,
  userId,
  style,
  disablePress = false,
}) => {
  const navigation = useNavigation<NavProp>();
  const level = getLevelForPoints(points);

  const handlePress = () => {
    if (!disablePress) {
      navigation.navigate('Levels', { userId });
    }
  };

  return (
    <TouchableOpacity
      style={[styles.badge, style]}
      onPress={handlePress}
      activeOpacity={disablePress ? 1 : 0.7}
      disabled={disablePress}
    >
      <View style={[styles.dot, { backgroundColor: level.color }]} />
      <Text variant="caption" weight="semibold" style={[styles.name, { color: level.color }]}>
        {level.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  name: {
    fontSize: 11,
  },
});
