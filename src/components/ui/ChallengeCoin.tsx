import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { LevelDef } from '../../types/points';

interface ChallengeCoinProps {
  level: LevelDef;
  locked?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ChallengeCoin: React.FC<ChallengeCoinProps> = ({
  level,
  locked = false,
  size = 'sm',
}) => {
  const diameter =
    size === 'xl' ? 120 :
    size === 'lg' ? 88 :
    size === 'md' ? 52 :
    36;

  return (
    <View
      style={[
        styles.coin,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: hexWithAlpha(level.color, 0.15),
          opacity: locked ? 0.35 : 1,
        },
      ]}
    >
      <Image
        source={{ uri: level.imageUrl }}
        style={{ width: diameter, height: diameter, borderRadius: diameter / 2 }}
        resizeMode="contain"
      />
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
  coin: {
    overflow: 'hidden',
  },
});
