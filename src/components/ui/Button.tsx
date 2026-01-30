import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import { BaseComponentProps, ButtonVariant, ButtonSize } from '../../types';
import { Text } from './Text';

interface ButtonProps extends TouchableOpacityProps, BaseComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: theme.colors.primary[500],
  },
  secondary: {
    backgroundColor: theme.colors.secondary[100],
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  destructive: {
    backgroundColor: theme.colors.error[500],
  },
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minHeight: 36,
  },
  md: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    minHeight: 44,
  },
  lg: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    minHeight: 52,
  },
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const scale = useSharedValue(1);

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
      case 'destructive':
        return 'white';
      case 'secondary':
        return theme.colors.secondary[800];
      case 'outline':
        return theme.colors.primary[500];
      case 'ghost':
        return theme.colors.primary[500];
      default:
        return 'white';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'sm';
      case 'md':
        return 'base';
      case 'lg':
        return 'lg';
      default:
        return 'base';
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (event: any) => {
    scale.value = withSpring(0.95);
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    scale.value = withSpring(1);
    onPressOut?.(event);
  };

  const buttonStyle: ViewStyle = {
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...(fullWidth && { width: '100%' }),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled || loading ? 0.6 : 1,
    ...theme.shadows.sm,
  };

  return (
    <AnimatedTouchableOpacity
      style={[buttonStyle, animatedStyle, style]}
      disabled={disabled || loading}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={getTextColor()}
          style={{ marginRight: theme.spacing.sm }}
        />
      )}
      {leftIcon && !loading && (
        <Animated.View style={{ marginRight: theme.spacing.sm }}>
          {leftIcon}
        </Animated.View>
      )}
      <Text
        variant="label"
        size={getTextSize() as keyof typeof theme.fontSize}
        color={getTextColor()}
        weight="medium"
      >
        {children}
      </Text>
      {rightIcon && (
        <Animated.View style={{ marginLeft: theme.spacing.sm }}>
          {rightIcon}
        </Animated.View>
      )}
    </AnimatedTouchableOpacity>
  );
};

export default Button;
