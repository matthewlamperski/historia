import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Input } from '../../components/ui';
import { theme } from '../../constants/theme';
import { useAuth } from '../../hooks';
import { AuthStackScreenProps } from '../../types';
import Icon from 'react-native-vector-icons/FontAwesome6';

const logoLong = require('../../assets/logolong.png');

export const LoginScreen: React.FC<AuthStackScreenProps<'Login'>> = ({
  navigation,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    isLoading,
    error,
    clearError,
  } = useAuth();

  // Dismisses the modal that owns this screen (the Auth route on the main
  // stack). Called after a successful sign-in so anonymous browsers return
  // to wherever they were.
  const dismissAuthModal = () => navigation.getParent()?.goBack();

  const handleEmailSignIn = async () => {
    setLocalError(null);
    clearError();

    if (!email.trim()) {
      setLocalError('Please enter your email');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    try {
      await signInWithEmail(email.trim(), password);
      dismissAuthModal();
    } catch (e) {
      // Error is handled in the store
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    clearError();
    try {
      await signInWithGoogle();
      dismissAuthModal();
    } catch (e) {
      // Error is handled in the store
    }
  };

  const handleAppleSignIn = async () => {
    setLocalError(null);
    clearError();
    try {
      await signInWithApple();
      dismissAuthModal();
    } catch (e) {
      // Error is handled in the store
    }
  };

  const displayError = localError || error;

  // When this screen is mounted inside the Auth modal (presented from the
  // main stack), the parent navigator is the modal owner. Dismiss it to
  // return to anonymous browsing.
  const handleClose = dismissAuthModal;
  const canClose = !!navigation.getParent();

  return (
    <SafeAreaView style={styles.container}>
      {canClose && (
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Close"
        >
          <Icon name="xmark" size={20} color={theme.colors.gray[600]} />
        </TouchableOpacity>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo and Title */}
          <View style={styles.header}>
            <Image source={logoLong} style={styles.logo} resizeMode="contain" />
            <Text variant="body" color="gray.600" style={styles.subtitle}>
              Welcome back! Sign in to continue
            </Text>
          </View>

          {/* Error Message */}
          {displayError && (
            <View style={styles.errorContainer}>
              <Icon name="circle-exclamation" size={16} color={theme.colors.error[500]} />
              <Text variant="body" color="error.500" style={styles.errorText}>
                {displayError}
              </Text>
            </View>
          )}

          {/* Email Input */}
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            containerStyle={styles.inputContainer}
            leftIcon={
              <Icon name="envelope" size={18} color={theme.colors.gray[400]} />
            }
          />

          {/* Password Input */}
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            showPasswordToggle
            autoCapitalize="none"
            autoComplete="password"
            containerStyle={styles.inputContainer}
            leftIcon={
              <Icon name="lock" size={18} color={theme.colors.gray[400]} />
            }
          />

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPassword}
          >
            <Text variant="body" color="primary.500">
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <Button
            variant="primary"
            fullWidth
            onPress={handleEmailSignIn}
            disabled={isLoading}
            style={styles.signInButton}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              'Sign In'
            )}
          </Button>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text variant="caption" color="gray.500" style={styles.dividerText}>
              or continue with
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Sign In */}
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Icon name="google" size={20} color={theme.colors.gray[700]} />
              <Text variant="body" weight="medium" style={styles.socialButtonText}>
                Google
              </Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleAppleSignIn}
                disabled={isLoading}
              >
                <Icon name="apple" size={20} color={theme.colors.gray[700]} />
                <Text variant="body" weight="medium" style={styles.socialButtonText}>
                  Apple
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text variant="body" color="gray.600">
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text variant="body" color="primary.500" weight="semibold">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  logo: {
    width: 200,
    height: 100,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error[50],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.error[200],
  },
  errorText: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.lg,
  },
  signInButton: {
    marginBottom: theme.spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.gray[200],
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    backgroundColor: theme.colors.white,
    minWidth: 140,
  },
  socialButtonText: {
    marginLeft: theme.spacing.sm,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
  },
});

export default LoginScreen;
