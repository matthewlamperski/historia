import React, { forwardRef, useState } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../constants/theme';
import { BaseComponentProps, InputVariant } from '../../types';
import { Text } from './Text';

interface InputProps extends TextInputProps, BaseComponentProps {
  variant?: InputVariant;
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
  containerStyle?: ViewStyle;
}

const variantStyles: Record<InputVariant, ViewStyle> = {
  default: {
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    backgroundColor: theme.colors.white,
  },
  filled: {
    borderWidth: 0,
    backgroundColor: theme.colors.gray[100],
  },
  outline: {
    borderWidth: 2,
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.white,
  },
};

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      variant = 'default',
      label,
      helperText,
      errorText,
      leftIcon,
      rightIcon,
      showPasswordToggle = false,
      style,
      containerStyle,
      secureTextEntry,
      ...props
    },
    ref,
  ) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const isError = !!errorText;
    const isSecure = secureTextEntry && !isPasswordVisible;

    const inputContainerStyles: ViewStyle = {
      ...variantStyles[variant],
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      ...(isFocused && {
        borderColor: theme.colors.primary[500],
        borderWidth: variant === 'filled' ? 1 : 2,
      }),
      ...(isError && {
        borderColor: theme.colors.error[500],
        borderWidth: 2,
      }),
    };

    const inputStyles = {
      flex: 1,
      fontSize: theme.fontSize.base,
      color: theme.colors.gray[900],
      paddingVertical: 0, // Remove default padding
    };

    const handlePasswordToggle = () => {
      setIsPasswordVisible(!isPasswordVisible);
    };

    return (
      <View style={containerStyle}>
        {label && (
          <Text
            variant="label"
            color="gray.700"
            style={{ marginBottom: theme.spacing.xs }}
          >
            {label}
          </Text>
        )}

        <View style={inputContainerStyles}>
          {leftIcon && (
            <View style={{ marginRight: theme.spacing.sm }}>{leftIcon}</View>
          )}

          <TextInput
            ref={ref}
            style={[inputStyles, style]}
            secureTextEntry={isSecure}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholderTextColor={theme.colors.gray[400]}
            {...props}
          />

          {showPasswordToggle && secureTextEntry && (
            <TouchableOpacity
              onPress={handlePasswordToggle}
              style={{ marginLeft: theme.spacing.sm }}
            >
              <Text variant="caption" color="primary.500">
                {isPasswordVisible ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          )}

          {rightIcon && !showPasswordToggle && (
            <View style={{ marginLeft: theme.spacing.sm }}>{rightIcon}</View>
          )}
        </View>

        {(helperText || errorText) && (
          <Text
            variant="caption"
            color={isError ? 'error.500' : 'gray.600'}
            style={{ marginTop: theme.spacing.xs }}
          >
            {errorText || helperText}
          </Text>
        )}
      </View>
    );
  },
);

Input.displayName = 'Input';

export default Input;
