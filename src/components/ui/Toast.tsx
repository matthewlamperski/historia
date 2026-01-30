import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import { ToastType } from '../../types';
import { Text } from './Text';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible?: boolean;
  duration?: number;
  onHide?: () => void;
  icon?: React.ReactNode;
}

const toastStyles: Record<ToastType, ViewStyle> = {
  success: {
    backgroundColor: theme.colors.success[500],
  },
  error: {
    backgroundColor: theme.colors.error[500],
  },
  warning: {
    backgroundColor: theme.colors.warning[500],
  },
  info: {
    backgroundColor: theme.colors.primary[500],
  },
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  visible = false,
  duration = 3000,
  onHide,
  icon,
}) => {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  useEffect(() => {
    const hideToast = () => {
      onHide?.();
    };

    if (visible) {
      translateY.value = withSpring(0);
      opacity.value = withTiming(1);

      if (duration > 0) {
        const timer = setTimeout(() => {
          translateY.value = withSpring(-100);
          opacity.value = withTiming(0, {}, finished => {
            if (finished) {
              runOnJS(hideToast)();
            }
          });
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      translateY.value = withSpring(-100);
      opacity.value = withTiming(0);
    }
  }, [visible, duration, translateY, opacity, onHide]);

  const containerStyle: ViewStyle = {
    position: 'absolute',
    top: 60, // Adjust based on status bar height
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 1000,
    ...toastStyles[type],
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.lg,
  };

  const textStyle = { flex: 1 };

  if (!visible && translateY.value === -100) {
    return null;
  }

  return (
    <Animated.View style={[containerStyle, animatedStyle]}>
      {icon && <View style={{ marginRight: theme.spacing.sm }}>{icon}</View>}
      <Text variant="body" color="white" weight="medium" style={textStyle}>
        {message}
      </Text>
    </Animated.View>
  );
};
