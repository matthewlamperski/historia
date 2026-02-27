import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '../components/ui';
import { theme } from '../constants/theme';
import { useAuth, useModeration } from '../hooks';
import Icon from 'react-native-vector-icons/FontAwesome6';

export const BanScreen: React.FC = () => {
  const { signOut } = useAuth();
  const { userBan } = useModeration();

  const formatDate = (date: Date | undefined): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="ban" size={64} color={theme.colors.error[500]} />
        </View>

        <Text variant="h2" style={styles.title}>
          Account Suspended
        </Text>

        <Text variant="body" color="gray.600" style={styles.description}>
          Your account has been suspended for violating our community guidelines.
        </Text>

        {userBan && (
          <View style={styles.banDetails}>
            <View style={styles.detailRow}>
              <Text variant="label" color="gray.600">
                Reason:
              </Text>
              <Text variant="body" style={styles.detailValue}>
                {userBan.banReason || 'Violation of community guidelines'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text variant="label" color="gray.600">
                Type:
              </Text>
              <Text variant="body" style={styles.detailValue}>
                {userBan.banType === 'permanent'
                  ? 'Permanent'
                  : 'Temporary'}
              </Text>
            </View>

            {userBan.banType === 'temporary' && userBan.banExpiresAt && (
              <View style={styles.detailRow}>
                <Text variant="label" color="gray.600">
                  Expires:
                </Text>
                <Text variant="body" style={styles.detailValue}>
                  {formatDate(userBan.banExpiresAt)}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text variant="label" color="gray.600">
                Suspended on:
              </Text>
              <Text variant="body" style={styles.detailValue}>
                {formatDate(userBan.bannedAt)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.helpSection}>
          <Text variant="body" color="gray.600" style={styles.helpText}>
            If you believe this is a mistake or would like to appeal, please
            contact our support team.
          </Text>
          <Text variant="body" color="primary.500" weight="medium">
            support@historia.app
          </Text>
        </View>

        <Button
          variant="outline"
          fullWidth
          onPress={handleSignOut}
          style={styles.signOutButton}
        >
          Sign Out
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.error[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  description: {
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  banDetails: {
    width: '100%',
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  detailRow: {
    marginBottom: theme.spacing.md,
  },
  detailValue: {
    marginTop: theme.spacing.xs,
  },
  helpSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  helpText: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  signOutButton: {
    marginTop: 'auto',
  },
});

export default BanScreen;
