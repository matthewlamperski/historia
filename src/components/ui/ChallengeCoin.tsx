import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { LevelDef } from '../../constants/levels';
import { theme } from '../../constants/theme';

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
          opacity: locked ? 0.35 : 1,
        },
      ]}
    >
      <Image
        source={level.image}
        style={{ width: diameter, height: diameter, borderRadius: diameter / 2 }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  coin: {
    overflow: 'hidden',
  },
});
