import React, { useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome6 } from '@react-native-vector-icons/fontawesome6';
import { Text } from '../components/ui';
import { theme } from '../constants/theme';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../hooks';
import { usePointsConfig } from '../context/PointsConfigContext';
import { EarningRules } from '../types/points';

const FREE_BOOKMARK_LIMIT = 10;

interface FeatureRowProps {
  icon: string;
  title: string;
  description: string;
  highlight?: boolean;
}

const FeatureRow: React.FC<FeatureRowProps> = ({
  icon,
  title,
  description,
  highlight = false,
}) => (
  <View style={[styles.featureRow, highlight && styles.featureRowHighlight]}>
    <View style={styles.featureIconContainer}>
      <FontAwesome6
        name={icon as any}
        size={18}
        color={highlight ? theme.colors.primary[500] : theme.colors.success[500]}
        iconStyle="solid"
      />
    </View>
    <View style={styles.featureText}>
      <Text
        variant="label"
        weight={highlight ? 'semibold' : 'medium'}
        style={[styles.featureTitle, highlight && styles.featureTitleHighlight]}
      >
        {title}
      </Text>
      <Text variant="caption" color="gray.500" style={styles.featureDesc}>
        {description}
      </Text>
    </View>
  </View>
);

function buildPremiumFeatures(earning: EarningRules | null): FeatureRowProps[] {
  const pointsDescription = earning
    ? `+${earning.siteVisitPoints} pts per verified check-in, +${earning.postBasePoints} pts per post, +${earning.postPerMediaPoints} pt per photo or video`
    : 'Earn points on every check-in and post — climb the ranks';

  return [
    {
      icon: 'star',
      title: 'Points on Every Visit',
      description: pointsDescription,
      highlight: true,
    },
    {
      icon: 'trophy',
      title: 'Achievement Badges & Levels',
      description: 'Unlock levels, exclusive badges, and level-based perks as you explore',
      highlight: false,
    },
    {
      icon: 'tag',
      title: 'Redeem for American-Made Gear',
      description: 'Trade points for exclusive Made in USA products via ShopHistoria.com',
      highlight: false,
    },
    {
      icon: 'comments',
      title: 'Unlimited Ask Bede',
      description: 'Chat without limits with Bede, your AI guide to every landmark — free accounts get 10 messages per day',
      highlight: false,
    },
    {
      icon: 'bookmark',
      title: 'Unlimited Bookmarks',
      description: `Free accounts are limited to ${FREE_BOOKMARK_LIMIT} saved sites — go unlimited with Pro`,
      highlight: false,
    },
    {
      icon: 'map',
      title: 'Offline Maps',
      description: 'Download maps for trips without cell service — perfect for remote sites',
      highlight: false,
    },
    {
      icon: 'heart',
      title: 'Gratitude Reflections',
      description: 'Personal journal entries tied to your landmark visits',
      highlight: false,
    },
    {
      icon: 'users',
      title: 'Exclusive Reddit Community',
      description: 'Join a private subreddit to swap stories, tips, and trip ideas with other Pro members',
      highlight: false,
    },
    {
      icon: 'headset',
      title: 'Priority Support',
      description: 'Skip the queue — get help faster when you need it',
      highlight: false,
    },
  ];
}

export const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const {
    subscribe,
    restorePurchases,
    isPurchasing,
    isRestoring,
    error,
    clearError,
    availableProducts,
  } = useSubscriptionStore();
  const { showToast } = useToast();
  const { config: pointsConfig, status: pointsConfigStatus } = usePointsConfig();
  const premiumFeatures = React.useMemo(
    () =>
      buildPremiumFeatures(
        pointsConfigStatus === 'ready' && pointsConfig ? pointsConfig.earning : null
      ),
    [pointsConfig, pointsConfigStatus]
  );

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            marginLeft: 4,
            width: 32,
            height: 32,
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <FontAwesome6 name="xmark" size={16} color={theme.colors.gray[500]} iconStyle="solid" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (error) {
      Alert.alert('Purchase Error', error, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [error, clearError]);

  const handleSubscribe = async () => {
    if (!user?.id) {
      showToast('Please sign in to subscribe', 'error');
      return;
    }
    await subscribe(user.id);
  };

  const handleRestore = async () => {
    if (!user?.id) {
      showToast('Please sign in to restore purchases', 'error');
      return;
    }
    await restorePurchases(user.id);
    if (!error) {
      showToast('Purchases restored successfully!', 'success');
      navigation.goBack();
    }
  };

  // Get price from store product, or fall back to display price
  // localizedPrice is available on iOS; Android uses subscriptionOfferDetails
  const priceString =
    (availableProducts[0] as any)?.localizedPrice ?? '$1.99';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.heroSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Hero decorative background */}
          <View style={styles.heroBg} />

          {/* Crown icon */}
          <View style={styles.crownContainer}>
            <View style={styles.crownRing}>
              <FontAwesome6
                name="crown"
                size={32}
                color={theme.colors.primary[500]}
                iconStyle="solid"
              />
            </View>
          </View>

          {/* Headlines */}
          <Text variant="h2" weight="bold" style={styles.heroTitle}>
            Historia Pro
          </Text>
          <Text variant="body" color="gray.600" style={styles.heroSubtitle}>
            Turn every adventure into real rewards.{'\n'}
            Support American history. Start for free.
          </Text>

          {/* Trial badge */}
          <View style={styles.trialBadge}>
            <FontAwesome6
              name="gift"
              size={14}
              color={theme.colors.success[600]}
              iconStyle="solid"
            />
            <Text variant="label" weight="semibold" style={styles.trialBadgeText}>
              14-Day Free Trial Included
            </Text>
          </View>

          {/* Price card */}
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text variant="h2" weight="bold" style={styles.priceAmount}>
                {priceString}
              </Text>
              <Text variant="body" color="gray.500" style={styles.pricePeriod}>
                / month
              </Text>
            </View>
            <Text variant="caption" color="gray.500" style={styles.priceNote}>
              after your free 14-day trial
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.featuresSection,
            { opacity: fadeAnim },
          ]}
        >
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            Everything you unlock
          </Text>

          <View style={styles.featuresList}>
            {premiumFeatures.map((feature, index) => (
              <FeatureRow key={index} {...feature} />
            ))}
          </View>
        </Animated.View>

        {/* Money-back guarantee card */}
        {/* <Animated.View
          style={[styles.guaranteeCard, { opacity: fadeAnim }]}
        >
          <View style={styles.guaranteeIconContainer}>
            <FontAwesome6
              name="shield-halved"
              size={28}
              color={theme.colors.warning[600]}
              iconStyle="solid"
            />
          </View>
          <View style={styles.guaranteeText}>
            <Text variant="label" weight="semibold" style={styles.guaranteeTitle}>
              180-Day Money-Back Guarantee
            </Text>
            <Text variant="caption" color="gray.600" style={styles.guaranteeDesc}>
              If you don't feel more grateful in 6 months, we'll refund you. No questions asked.
            </Text>
          </View>
        </Animated.View> */}

        {/* Mission statement */}
        <View style={styles.missionCard}>
          <FontAwesome6
            name="landmark"
            size={16}
            color={theme.colors.primary[400]}
            iconStyle="solid"
          />
          <Text variant="caption" color="gray.500" style={styles.missionText}>
            Your subscription directly funds new historic site partnerships,
            new gear, and features. Thank you for supporting the mission.
          </Text>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          {/* Primary CTA */}
          <TouchableOpacity
            style={[styles.ctaButton, isPurchasing && styles.ctaButtonDisabled]}
            onPress={handleSubscribe}
            disabled={isPurchasing}
            activeOpacity={0.85}
          >
            {isPurchasing ? (
              <ActivityIndicator color={theme.colors.white} size="small" />
            ) : (
              <>
                <FontAwesome6
                  name="crown"
                  size={16}
                  color={theme.colors.white}
                  iconStyle="solid"
                  style={styles.ctaIcon}
                />
                <Text variant="label" weight="bold" style={styles.ctaButtonText}>
                  Start Free 14-Day Trial
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Restore */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <ActivityIndicator
                color={theme.colors.primary[500]}
                size="small"
              />
            ) : (
              <Text variant="label" color="primary.500" style={styles.restoreText}>
                Restore Purchases
              </Text>
            )}
          </TouchableOpacity>

          {/* Legal fine print */}
          <Text variant="caption" color="gray.400" style={styles.legalText}>
            {priceString}/month after 14-day free trial. Cancel anytime in{' '}
            {'\n'}Settings {'>'} Subscriptions. Subscription renews automatically.
          </Text>

          <TouchableOpacity
            onPress={() =>
              Linking.openURL('https://historia.app/privacy')
            }
            style={styles.privacyLink}
          >
            <Text variant="caption" color="gray.400" style={styles.legalText}>
              Privacy Policy · Terms of Service
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  scrollContent: {
    paddingBottom: theme.spacing['2xl'],
  },

  // ── Hero ───────────────────────────────────────────────────────────────
  heroSection: {
    alignItems: 'center',
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: theme.colors.primary[50],
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  crownContainer: {
    marginBottom: theme.spacing.md,
    zIndex: 1,
  },
  crownRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: theme.colors.primary[200],
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  heroTitle: {
    color: theme.colors.gray[900],
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    zIndex: 1,
  },
  heroSubtitle: {
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.lg,
    zIndex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success[50],
    borderWidth: 1,
    borderColor: theme.colors.success[200],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    zIndex: 1,
  },
  trialBadgeText: {
    color: theme.colors.success[700],
  },
  priceCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius['2xl'],
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderWidth: 1.5,
    borderColor: theme.colors.primary[200],
    zIndex: 1,
    ...theme.shadows.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  priceAmount: {
    color: theme.colors.primary[700],
    lineHeight: 38,
  },
  pricePeriod: {
    marginBottom: 4,
  },
  priceNote: {
    marginTop: 2,
  },

  // ── Features ───────────────────────────────────────────────────────────
  featuresSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  sectionTitle: {
    color: theme.colors.gray[800],
    marginBottom: theme.spacing.md,
  },
  featuresList: {
    gap: theme.spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.md,
  },
  featureRowHighlight: {
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: theme.colors.gray[800],
    marginBottom: 2,
  },
  featureTitleHighlight: {
    color: theme.colors.primary[700],
  },
  featureDesc: {
    lineHeight: 18,
  },

  // ── Guarantee card ─────────────────────────────────────────────────────
  guaranteeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.warning[50],
    borderWidth: 1,
    borderColor: theme.colors.warning[200],
    borderRadius: theme.borderRadius.xl,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  guaranteeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.warning[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  guaranteeText: {
    flex: 1,
  },
  guaranteeTitle: {
    color: theme.colors.warning[800],
    marginBottom: 4,
  },
  guaranteeDesc: {
    lineHeight: 18,
    color: theme.colors.warning[700],
  },

  // ── Mission ────────────────────────────────────────────────────────────
  missionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.lg,
  },
  missionText: {
    flex: 1,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // ── CTA ────────────────────────────────────────────────────────────────
  ctaSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    alignItems: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius['2xl'],
    paddingVertical: theme.spacing.md + 2,
    width: '100%',
    gap: theme.spacing.sm,
    ...theme.shadows.lg,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaIcon: {
    marginRight: 2,
  },
  ctaButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.base,
    letterSpacing: 0.3,
  },
  restoreButton: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreText: {
    textDecorationLine: 'underline',
  },
  legalText: {
    textAlign: 'center',
    lineHeight: 18,
    marginTop: theme.spacing.sm,
  },
  privacyLink: {
    marginTop: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
});
