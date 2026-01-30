import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
} from 'react-native';
import { theme } from '../../constants/theme';
import { BaseComponentProps, TextVariant } from '../../types';

interface TextProps extends RNTextProps, BaseComponentProps {
  variant?: TextVariant;
  color?: keyof typeof theme.colors | string;
  size?: keyof typeof theme.fontSize;
  weight?: keyof typeof theme.fontWeight;
  className?: string;
}

const variantStyles: Record<TextVariant, TextStyle> = {
  h1: {
    fontSize: theme.fontSize['4xl'],
    fontWeight: theme.fontWeight.bold,
    lineHeight: theme.fontSize['4xl'] * 1.2,
  },
  h2: {
    fontSize: theme.fontSize['3xl'],
    fontWeight: theme.fontWeight.bold,
    lineHeight: theme.fontSize['3xl'] * 1.2,
  },
  h3: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.semibold,
    lineHeight: theme.fontSize['2xl'] * 1.3,
  },
  h4: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    lineHeight: theme.fontSize.xl * 1.3,
  },
  body: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.normal,
    lineHeight: theme.fontSize.base * 1.5,
  },
  caption: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.normal,
    lineHeight: theme.fontSize.sm * 1.4,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    lineHeight: theme.fontSize.sm * 1.3,
  },
};

export const Text: React.FC<TextProps> = ({
  children,
  variant = 'body',
  color,
  size,
  weight,
  style,
  ...props
}) => {
  const getColor = () => {
    if (!color) return theme.colors.gray[900];

    // Check if it's a theme color path (e.g., 'primary.500')
    if (color.includes('.')) {
      const [colorName, shade] = color.split('.');
      const colorFamily = theme.colors[
        colorName as keyof typeof theme.colors
      ] as any;
      return colorFamily?.[shade] || color;
    }

    // Check if it's a direct theme color
    if (color in theme.colors) {
      return theme.colors[color as keyof typeof theme.colors];
    }

    // Return as-is (custom color)
    return color;
  };

  const textStyle: TextStyle = {
    ...variantStyles[variant],
    color: getColor(),
    ...(size && { fontSize: theme.fontSize[size] }),
    ...(weight && { fontWeight: theme.fontWeight[weight] }),
  };

  return (
    <RNText style={[textStyle, style]} {...props}>
      {children}
    </RNText>
  );
};

export default Text;
