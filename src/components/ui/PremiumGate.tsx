import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@react-native-vector-icons/fontawesome6';
import { useSubscription } from '../../hooks/useSubscription';
import { PremiumFeature } from '../../types';
import { theme } from '../../constants/theme';
import { Text } from './Text';

interface PremiumGateProps {
  feature: PremiumFeature;
  children: React.ReactNode;
  // Optional custom locked UI; defaults to a standard locked overlay
  fallback?: React.ReactNode;
  // When true, renders children + a "Premium" badge overlay instead of hiding children
  showPreview?: boolean;
}

const DefaultLockedState: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity style={styles.lockedContainer} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.lockedIcon}>
      <FontAwesome6 name="lock" size={18} color={theme.colors.primary[500]} iconStyle="solid" />
    </View>
    <Text variant="label" weight="semibold" style={styles.lockedTitle}>
      Pro Feature
    </Text>
    <Text variant="caption" color="gray.500" style={styles.lockedSubtitle}>
      Upgrade to unlock this feature
    </Text>
    <View style={styles.lockedBadge}>
      <FontAwesome6 name="crown" size={10} color={theme.colors.white} iconStyle="solid" />
      <Text variant="caption" weight="semibold" style={styles.lockedBadgeText}>
        Go Pro
      </Text>
    </View>
  </TouchableOpacity>
);

export const PremiumGate: React.FC<PremiumGateProps> = ({
  feature,
  children,
  fallback,
  showPreview = false,
}) => {
  const { isPremium, showSubscriptionScreen } = useSubscription();

  if (isPremium) {
    return <>{children}</>;
  }

  if (showPreview) {
    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewContent} pointerEvents="none">
          {children}
        </View>
        <TouchableOpacity
          style={styles.previewOverlay}
          onPress={showSubscriptionScreen}
          activeOpacity={0.9}
        >
          <View style={styles.previewBadge}>
            <FontAwesome6
              name="crown"
              size={12}
              color={theme.colors.white}
              iconStyle="solid"
            />
            <Text variant="caption" weight="bold" style={styles.previewBadgeText}>
              Pro
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <DefaultLockedState onPress={showSubscriptionScreen} />;
};

const styles = StyleSheet.create({
  lockedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
    borderStyle: 'dashed',
    gap: theme.spacing.xs,
  },
  lockedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  lockedTitle: {
    color: theme.colors.gray[800],
  },
  lockedSubtitle: {
    textAlign: 'center',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  lockedBadgeText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
  },

  // Preview overlay styles
  previewContainer: {
    position: 'relative',
  },
  previewContent: {
    opacity: 0.35,
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
    ...theme.shadows.md,
  },
  previewBadgeText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
  },
});
