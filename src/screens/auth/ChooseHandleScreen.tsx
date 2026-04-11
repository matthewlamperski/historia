import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Input, Button } from '../../components/ui';
import { theme } from '../../constants/theme';
import { handleService, HANDLE_REGEX } from '../../services/handleService';
import { userService } from '../../services/userService';
import { useAuthStore } from '../../store/authStore';
import { useDebounce } from '../../hooks';
import Icon from 'react-native-vector-icons/FontAwesome6';

const ChooseHandleScreen: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [handle, setHandle] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedHandle = useDebounce(handle, 500);

  useEffect(() => {
    if (!debouncedHandle) {
      setIsAvailable(null);
      return;
    }

    if (!HANDLE_REGEX.test(debouncedHandle)) {
      setIsAvailable(null);
      return;
    }

    let cancelled = false;
    setIsChecking(true);
    handleService.checkHandleAvailable(debouncedHandle).then(available => {
      if (!cancelled) {
        setIsAvailable(available);
        setIsChecking(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setIsChecking(false);
      }
    });

    return () => { cancelled = true; };
  }, [debouncedHandle]);

  const getFormatError = (): string | null => {
    if (!handle) return null;
    if (handle.length < 3) return 'At least 3 characters required';
    if (handle.length > 20) return 'Maximum 20 characters';
    if (!HANDLE_REGEX.test(handle)) {
      return 'Only lowercase letters, numbers, and underscores; must start with a letter';
    }
    return null;
  };

  const formatError = getFormatError();

  const handleConfirm = async () => {
    if (!user?.id) return;
    setError(null);

    if (formatError) {
      setError(formatError);
      return;
    }

    if (!HANDLE_REGEX.test(handle)) {
      setError('Please enter a valid handle');
      return;
    }

    if (!isAvailable) {
      setError('This handle is already taken');
      return;
    }

    setIsSaving(true);
    try {
      await handleService.reserveHandle(handle, user.id);
      await userService.updateUserProfile(user.id, { username: handle });
      updateUser({ username: handle });
    } catch (err) {
      setError('Failed to set handle. Please try again.');
      setIsSaving(false);
    }
  };

  const renderIndicator = () => {
    if (!handle || formatError) return null;

    if (isChecking) {
      return <ActivityIndicator size="small" color={theme.colors.gray[400]} />;
    }
    if (isAvailable === true) {
      return <Icon name="circle-check" size={18} color={theme.colors.success[500]} />;
    }
    if (isAvailable === false) {
      return <Icon name="circle-xmark" size={18} color={theme.colors.error[500]} />;
    }
    return null;
  };

  const canSubmit = HANDLE_REGEX.test(handle) && isAvailable === true && !isChecking && !isSaving;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            <View style={styles.iconWrap}>
              <Icon name="at" size={32} color={theme.colors.primary[500]} />
            </View>
            <Text variant="h2" weight="bold" style={styles.title}>
              Choose Your Handle
            </Text>
            <Text variant="body" color="gray.500" style={styles.subtitle}>
              Your handle is your unique identity on Historia. Once set, it cannot be changed.
            </Text>
          </View>

          <View style={styles.inputSection}>
            <Input
              label="Handle"
              placeholder="your_handle"
              value={handle}
              onChangeText={text => setHandle(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              containerStyle={styles.inputContainer}
              leftIcon={
                <Text variant="body" style={styles.atSymbol}>@</Text>
              }
              rightIcon={renderIndicator()}
            />

            {formatError && handle.length > 0 ? (
              <Text variant="caption" color="error.500" style={styles.helperText}>
                {formatError}
              </Text>
            ) : isAvailable === false ? (
              <Text variant="caption" color="error.500" style={styles.helperText}>
                This handle is already taken
              </Text>
            ) : isAvailable === true ? (
              <Text variant="caption" style={[styles.helperText, styles.availableText]}>
                @{handle} is available
              </Text>
            ) : (
              <Text variant="caption" color="gray.400" style={styles.helperText}>
                3–20 characters. Letters, numbers, and underscores only.
              </Text>
            )}

            {error ? (
              <View style={styles.errorContainer}>
                <Icon name="circle-exclamation" size={14} color={theme.colors.error[500]} />
                <Text variant="caption" color="error.500" style={styles.errorText}>
                  {error}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.warningRow}>
            <Icon name="lock" size={14} color={theme.colors.gray[500]} />
            <Text variant="caption" color="gray.500" style={styles.warningText}>
              Handles cannot be changed after setting
            </Text>
          </View>

          <Button
            variant="primary"
            fullWidth
            onPress={handleConfirm}
            disabled={!canSubmit}
            style={styles.confirmButton}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              'Confirm Handle'
            )}
          </Button>
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing['2xl'],
  },
  topSection: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    textAlign: 'center',
    color: theme.colors.gray[900],
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: theme.spacing.md,
  },
  inputContainer: {
    marginBottom: theme.spacing.xs,
  },
  atSymbol: {
    color: theme.colors.gray[500],
    fontWeight: theme.fontWeight.semibold,
  },
  helperText: {
    marginBottom: theme.spacing.xs,
  },
  availableText: {
    color: theme.colors.success[600],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  errorText: {
    flex: 1,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.sm,
  },
  warningText: {
    flex: 1,
  },
  confirmButton: {
    marginTop: 'auto',
  },
});

export default ChooseHandleScreen;
