import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Input } from '../../components/ui';
import { theme } from '../../constants/theme';
import { useAuth } from '../../hooks';
import { AuthStackScreenProps } from '../../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logoLong = require('../../assets/logolong.png');

export const SignUpScreen: React.FC<AuthStackScreenProps<'SignUp'>> = ({
  navigation,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [showReferralInput, setShowReferralInput] = useState(false);

  const {
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    isLoading,
    error,
    clearError,
  } = useAuth();

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  // Dismisses the modal that owns this screen (the Auth route on the main
  // stack). Called after a successful sign-up so anonymous browsers return
  // to wherever they were.
  const dismissAuthModal = () => navigation.getParent()?.goBack();

  const handleSignUp = async () => {
    setLocalError(null);
    clearError();

    if (!displayName.trim()) {
      setLocalError('Please enter your name');
      return;
    }
    if (!email.trim()) {
      setLocalError('Please enter your email');
      return;
    }
    if (!password) {
      setLocalError('Please enter a password');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setLocalError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      // If user entered a referral code manually, store it so useAuth can apply it after sign-up
      const trimmedCode = referralCode.trim().toUpperCase();
      if (trimmedCode) {
        await AsyncStorage.setItem('pendingReferralCode', trimmedCode);
      }

      await signUpWithEmail(email.trim(), password, displayName.trim());
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon name="arrow-left" size={20} color={theme.colors.gray[700]} />
            </TouchableOpacity>
            <Image source={logoLong} style={styles.logo} resizeMode="contain" />
            <Text variant="body" color="gray.600" style={styles.subtitle}>
              Join Historia and start exploring
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

          {/* Name Input */}
          <Input
            label="Full Name"
            placeholder="Enter your name"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            autoComplete="name"
            containerStyle={styles.inputContainer}
            leftIcon={
              <Icon name="user" size={18} color={theme.colors.gray[400]} />
            }
          />

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
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            showPasswordToggle
            autoCapitalize="none"
            autoComplete="new-password"
            containerStyle={styles.inputContainer}
            helperText="At least 8 characters with uppercase, lowercase, and number"
            leftIcon={
              <Icon name="lock" size={18} color={theme.colors.gray[400]} />
            }
          />

          {/* Confirm Password Input */}
          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            showPasswordToggle
            autoCapitalize="none"
            autoComplete="new-password"
            containerStyle={styles.inputContainer}
            leftIcon={
              <Icon name="lock" size={18} color={theme.colors.gray[400]} />
            }
          />

          {/* Referral Code (collapsible) */}
          <TouchableOpacity
            style={styles.referralToggle}
            onPress={() => setShowReferralInput(prev => !prev)}
            activeOpacity={0.7}
          >
            <Icon
              name="gift"
              size={15}
              color={theme.colors.primary[500]}
            />
            <Text variant="caption" color="primary.500" weight="medium" style={styles.referralToggleText}>
              Got a referral code?
            </Text>
            <Icon
              name={showReferralInput ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={theme.colors.primary[500]}
            />
          </TouchableOpacity>
          {showReferralInput && (
            <Input
              placeholder="Enter referral code (e.g. A3X7KP2Q)"
              value={referralCode}
              onChangeText={text => setReferralCode(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              containerStyle={styles.inputContainer}
              leftIcon={
                <Icon name="ticket" size={16} color={theme.colors.gray[400]} />
              }
            />
          )}

          {/* Sign Up Button */}
          <Button
            variant="primary"
            fullWidth
            onPress={handleSignUp}
            disabled={isLoading}
            style={styles.signUpButton}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              'Create Account'
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

          {/* Social Sign Up */}
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

          {/* Sign In Link */}
          <View style={styles.signInContainer}>
            <Text variant="body" color="gray.600">
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text variant="body" color="primary.500" weight="semibold">
                Sign In
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing['2xl'],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  logo: {
    width: 200,
    height: 100,
    marginBottom: theme.spacing.sm,
    alignSelf: 'center',
  },
  subtitle: {
    marginTop: theme.spacing.xs,
    textAlign: 'center',
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
  signUpButton: {
    marginTop: theme.spacing.sm,
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
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  atSymbol: {
    color: theme.colors.gray[500],
    fontWeight: theme.fontWeight.semibold,
  },
  referralToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  referralToggleText: {
    marginRight: 2,
  },
});

export default SignUpScreen;
