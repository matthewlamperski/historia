import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { theme } from '../../constants/theme';
import { usePointsConfig } from '../../context/PointsConfigContext';

interface LevelTagProps {
  /** The user's current points balance. */
  points: number | undefined | null;
  /** Whether the user shown is a Pro subscriber. Free users render no tag. */
  isPremium: boolean | undefined | null;
  /** Optional sizing — `inline` is the default for next-to-name use. */
  size?: 'inline' | 'compact';
  style?: ViewStyle;
}

/**
 * A small pill that shows a Pro user's current level next to their name.
 *
 * Returns `null` for non-Pro users — the levels system is a Pro perk, so
 * free users have no level to display. This keeps the UI clean and signals
 * upgrade value without shouting.
 *
 * Visual: tinted background in the level color (low opacity), the level's
 * coin image at 16/14 px on the left, and the level name in semibold
 * matching the level color. One hairline border in the level color so it
 * reads as a coherent badge against any surface.
 */
export const LevelTag: React.FC<LevelTagProps> = ({
  points,
  isPremium,
  size = 'inline',
  style,
}) => {
  const { getLevelForPoints, status } = usePointsConfig();

  if (!isPremium) return null;
  if (status !== 'ready') return null;

  const level = getLevelForPoints(points ?? 0);
  if (!level) return null;

  const isCompact = size === 'compact';
  const coinSize = isCompact ? 14 : 16;
  const tinted = hexWithAlpha(level.color, 0.10);

  return (
    <View
      style={[
        styles.container,
        isCompact && styles.containerCompact,
        {
          backgroundColor: tinted,
          borderColor: hexWithAlpha(level.color, 0.35),
        },
        style,
      ]}
    >
      <Image
        source={{ uri: level.imageUrl }}
        style={{
          width: coinSize,
          height: coinSize,
          borderRadius: coinSize / 2,
        }}
        resizeMode="contain"
      />
      <Text
        weight="semibold"
        style={[
          styles.name,
          isCompact && styles.nameCompact,
          { color: level.color },
        ]}
        numberOfLines={1}
      >
        {level.name}
      </Text>
    </View>
  );
};

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}${a}`;
  }
  return `${hex}${a}`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    maxWidth: '100%',
  },
  containerCompact: {
    paddingLeft: 3,
    paddingRight: 6,
    paddingVertical: 2,
    gap: 4,
  },
  name: {
    fontSize: 11,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  nameCompact: {
    fontSize: 10,
  },
});

export default LevelTag;
