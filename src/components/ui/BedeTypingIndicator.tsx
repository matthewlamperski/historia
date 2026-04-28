import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { FontAwesome6 } from '@react-native-vector-icons/fontawesome6';
import { theme } from '../../constants/theme';

/**
 * Three pulsing dots inside a Bede-styled bubble, shown while waiting on a
 * reply. Staggers the three dots 200ms apart for the classic chat look.
 */
export const BedeTypingIndicator: React.FC = () => {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    const loops = dots.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(value, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [dots]);

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <FontAwesome6
          name="feather-pointed"
          size={13}
          color={theme.colors.primary[600]}
          iconStyle="solid"
        />
      </View>
      <View style={styles.bubble}>
        {dots.map((v, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { opacity: v, transform: [{ scale: v }] }]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: theme.spacing.md,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.xs,
    marginBottom: 2,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    backgroundColor: '#f6efe3',
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.primary[500],
  },
});

export default BedeTypingIndicator;
