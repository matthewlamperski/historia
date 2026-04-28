import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { FontAwesome6 } from '@react-native-vector-icons/fontawesome6';
import { Text } from './Text';
import { theme } from '../../constants/theme';

interface AskBedeCardProps {
  onPress: () => void;
}

/**
 * Prominent, visually-distinct CTA that sits on the LandmarkDetailSheet and
 * routes to the AskBedeScreen. Features:
 *   • Soft warm gradient background (SVG — no extra deps, leverages the
 *     already-installed react-native-svg).
 *   • Circular Bede monogram with gold ring.
 *   • Slowly pulsing sparkles glyph to convey "AI".
 */
export const AskBedeCard: React.FC<AskBedeCardProps> = ({ onPress }) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const sparkleOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
  const sparkleScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });

  return (
    <TouchableOpacity
      style={styles.wrapper}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Gradient background */}
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="bedeGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.colors.primary[100]} stopOpacity="1" />
            <Stop offset="1" stopColor={theme.colors.primary[50]} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bedeGrad)" rx="12" ry="12" />
      </Svg>

      <View style={styles.content}>
        {/* Monogram avatar */}
        <View style={styles.avatarOuter}>
          <View style={styles.avatarInner}>
            <FontAwesome6
              name="feather-pointed"
              size={13}
              color={theme.colors.primary[600]}
              iconStyle="solid"
            />
          </View>
        </View>

        {/* Title + AI pill inline */}
        <View style={styles.titleRow}>
          <Text variant="label" weight="bold" style={styles.title}>
            Ask Bede
          </Text>
          <View style={styles.aiPill}>
            <Animated.View
              style={{
                opacity: sparkleOpacity,
                transform: [{ scale: sparkleScale }],
                marginRight: 3,
              }}
            >
              <FontAwesome6
                name="wand-magic-sparkles"
                size={9}
                color={theme.colors.warning[600]}
                iconStyle="solid"
              />
            </Animated.View>
            <Text variant="caption" weight="bold" style={styles.aiPillText}>
              AI GUIDE
            </Text>
          </View>
        </View>

        <FontAwesome6
          name="chevron-right"
          size={12}
          color={theme.colors.primary[500]}
          iconStyle="solid"
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    ...theme.shadows.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm + 2,
    gap: theme.spacing.sm,
  },
  avatarOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    padding: 1.5,
    backgroundColor: theme.colors.warning[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    flex: 1,
    width: '100%',
    borderRadius: 14,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.gray[900],
    fontSize: theme.fontSize.base,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning[50],
    borderWidth: 1,
    borderColor: theme.colors.warning[200],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  aiPillText: {
    color: theme.colors.warning[700],
    letterSpacing: 0.5,
    fontSize: 9,
  },
  subtitle: {
    lineHeight: 18,
  },
});

export default AskBedeCard;
