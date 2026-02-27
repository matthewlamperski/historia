import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Input } from '../../components/ui';
import { theme } from '../../constants/theme';
import { useAuth } from '../../hooks';
import { AuthStackScreenProps } from '../../types';
import Icon from 'react-native-vector-icons/FontAwesome6';

export const ForgotPasswordScreen: React.FC<
  AuthStackScreenProps<'ForgotPassword'>
> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const { resetPassword, isLoading, error, clearError } = useAuth();

  const handleResetPassword = async () => {
    setLocalError(null);
    clearError();
    setIsSuccess(false);

    if (!email.trim()) {
      setLocalError('Please enter your email');
      return;
    }

    try {
      await resetPassword(email.trim());
      setIsSuccess(true);
    } catch (e) {
      // Error is handled in the store
    }
  };

  const displayError = localError || error;

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Icon name="envelope-circle-check" size={64} color={theme.colors.success[500]} />
          </View>
          <Text variant="h2" style={styles.successTitle}>
            Check your email
          </Text>
          <Text variant="body" color="gray.600" style={styles.successText}>
            We've sent password reset instructions to{'\n'}
            <Text variant="body" weight="semibold">
              {email}
            </Text>
          </Text>
          <Button
            variant="primary"
            fullWidth
            onPress={() => navigation.navigate('Login')}
            style={styles.backToLoginButton}
          >
            Back to Sign In
          </Button>
          <TouchableOpacity
            onPress={() => {
              setIsSuccess(false);
              setEmail('');
            }}
            style={styles.tryAgainButton}
          >
            <Text variant="body" color="primary.500">
              Didn't receive the email? Try again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
            <View style={styles.iconContainer}>
              <Icon name="key" size={48} color={theme.colors.primary[500]} />
            </View>
            <Text variant="h2" style={styles.title}>
              Forgot Password?
            </Text>
            <Text variant="body" color="gray.600" style={styles.subtitle}>
              No worries! Enter your email and we'll send you reset instructions.
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

          {/* Reset Button */}
          <Button
            variant="primary"
            fullWidth
            onPress={handleResetPassword}
            disabled={isLoading}
            style={styles.resetButton}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              'Reset Password'
            )}
          </Button>

          {/* Back to Sign In */}
          <View style={styles.signInContainer}>
            <Text variant="body" color="gray.600">
              Remember your password?{' '}
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
    marginBottom: theme.spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
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
    marginBottom: theme.spacing.lg,
  },
  resetButton: {
    marginBottom: theme.spacing.lg,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  // Success screen styles
  successContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: theme.spacing.lg,
  },
  successTitle: {
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  successText: {
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  backToLoginButton: {
    marginBottom: theme.spacing.md,
  },
  tryAgainButton: {
    paddingVertical: theme.spacing.md,
  },
});

export default ForgotPasswordScreen;
