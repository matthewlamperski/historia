import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/ui';
import { ChallengeCoin } from '../components/ui/ChallengeCoin';
import { theme } from '../constants/theme';
import {
  LEVELS,
  LevelDef,
  getLevelForPoints,
  getNextLevel,
  getLevelProgress,
} from '../constants/levels';
import { RootStackScreenProps } from '../types';
import { useAuthStore } from '../store/authStore';
import Icon from 'react-native-vector-icons/FontAwesome6';
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../services/firebaseConfig';

export const LevelsScreen: React.FC<RootStackScreenProps<'Levels'>> = ({
  route,
}) => {
  const { userId } = route.params;
  const { user: currentUser } = useAuthStore();
  const isOwnProfile = userId === currentUser?.id;

  const [points, setPoints] = useState<number>(
    isOwnProfile ? (currentUser?.pointsBalance ?? 0) : 0
  );
  const [loading, setLoading] = useState(!isOwnProfile);

  // Load another user's points if needed
  useEffect(() => {
    if (isOwnProfile) {
      setPoints(currentUser?.pointsBalance ?? 0);
      return;
    }
    setLoading(true);
    firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .get()
      .then(doc => {
        if (doc.exists()) {
          setPoints((doc.data()?.pointsBalance as number) ?? 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, isOwnProfile, currentUser?.pointsBalance]);

  // Also keep own-profile points live from auth store
  useEffect(() => {
    if (isOwnProfile) {
      setPoints(currentUser?.pointsBalance ?? 0);
    }
  }, [currentUser?.pointsBalance, isOwnProfile]);

  const currentLevel = getLevelForPoints(points);
  const nextLevel = getNextLevel(currentLevel);
  const progress = getLevelProgress(points, currentLevel);
  const progressPct = Math.round(progress * 100);

  // Always derive the logged-in user's own level for the "YOU" badge,
  // regardless of whose profile is being viewed.
  const myPoints = currentUser?.pointsBalance ?? 0;
  const myLevel = getLevelForPoints(myPoints);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Current Level Hero */}
        <View style={[styles.heroCard, { borderColor: currentLevel.color }]}>
          <ChallengeCoin level={currentLevel} locked={false} size="xl" />
          <View style={styles.heroInfo}>
            <Text variant="caption" color="gray.500" style={styles.heroLabel}>
              {isOwnProfile ? 'Your Level' : 'Their Level'}
            </Text>
            <Text variant="h3" weight="bold" style={[styles.heroLevelName, { color: currentLevel.color }]}>
              {currentLevel.name}
            </Text>
            <Text variant="h4" weight="semibold" style={styles.heroPoints}>
              {points.toLocaleString()} pts
            </Text>
          </View>
        </View>

        {/* Progress Bar (only shown if not at max level) */}
        {nextLevel && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text variant="caption" color="gray.500">
                Progress to {nextLevel.name}
              </Text>
              <Text variant="caption" weight="semibold" color="gray.700">
                {progressPct}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressPct}%` as any,
                    backgroundColor: currentLevel.color,
                  },
                ]}
              />
            </View>
            <Text variant="caption" color="gray.400" style={styles.progressSub}>
              {(nextLevel.minPoints - points).toLocaleString()} pts to unlock {nextLevel.name}
            </Text>
          </View>
        )}

        {nextLevel === null && (
          <View style={styles.maxLevelBanner}>
            <Icon name="crown" size={16} color={currentLevel.color} />
            <Text variant="caption" weight="semibold" style={{ color: currentLevel.color, marginLeft: 6 }}>
              Maximum level reached — Permanent top-tier status
            </Text>
          </View>
        )}

        {/* How to Earn (own profile only) */}
        {isOwnProfile && (
          <View style={styles.earnCard}>
            <Text variant="label" weight="semibold" style={styles.earnTitle}>
              How to Earn Points
            </Text>
            {[
              { icon: 'map-pin', text: 'Visit a landmark', pts: '+10 pts' },
              { icon: 'camera', text: 'Create a post', pts: '+2 pts' },
              { icon: 'image', text: 'Add photos to a post', pts: '+2 pts' },
              { icon: 'user-group', text: 'Refer a companion', pts: '+25 pts each' },
            ].map(item => (
              <View key={item.icon} style={styles.earnRow}>
                <Icon name={item.icon} size={14} color={theme.colors.gray[500]} style={styles.earnIcon} />
                <Text variant="body" style={styles.earnText}>{item.text}</Text>
                <Text variant="caption" weight="bold" style={styles.earnPts}>{item.pts}</Text>
              </View>
            ))}
            <Text variant="caption" color="gray.400" style={styles.earnNote}>
              Post points limited to 10 posts per day.
            </Text>
          </View>
        )}

        {/* All Levels List */}
        <Text variant="h4" weight="semibold" style={styles.levelsListTitle}>
          All Levels
        </Text>

        {LEVELS.map((level, index) => {
          const isCompleted = points >= (level.maxPoints ?? Infinity) && level.maxPoints !== null;
          const isCurrent = level.id === currentLevel.id;
          const isLocked = !isCompleted && !isCurrent;
          const isMyLevel = level.id === myLevel.id;

          return (
            <LevelRow
              key={level.id}
              level={level}
              index={index}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              isLocked={isLocked}
              userPoints={points}
              isMyLevel={isMyLevel}
              isOwnProfile={isOwnProfile}
            />
          );
        })}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Level Row ────────────────────────────────────────────────────────────────

interface LevelRowProps {
  level: LevelDef;
  index: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
  userPoints: number;
  isMyLevel: boolean;
  isOwnProfile: boolean;
}

const LevelRow: React.FC<LevelRowProps> = ({
  level,
  isCompleted,
  isCurrent,
  isLocked,
  isMyLevel,
  isOwnProfile,
}) => {
  const [expanded, setExpanded] = useState(isCurrent);

  const statusIcon = isCompleted ? 'circle-check' : isCurrent ? 'circle-play' : 'circle';
  const statusColor = isCompleted
    ? theme.colors.success[500]
    : isCurrent
    ? level.color
    : theme.colors.gray[300];

  const rangeText =
    level.maxPoints !== null
      ? `${level.minPoints.toLocaleString()} – ${level.maxPoints.toLocaleString()} pts`
      : `${level.minPoints.toLocaleString()}+ pts`;

  return (
    <View
      style={[
        styles.levelRow,
        isCurrent && { borderColor: level.color, borderWidth: 1.5 },
        isLocked && styles.levelRowLocked,
      ]}
    >
      {/* Left color bar */}
      <View style={[styles.colorBar, { backgroundColor: isLocked ? theme.colors.gray[200] : level.color }]} />

      <View style={styles.levelRowContent}>
        {/* Row header */}
        <TouchableOpacity
          style={styles.levelRowHeader}
          onPress={() => setExpanded(prev => !prev)}
          activeOpacity={0.7}
        >
          <View style={styles.levelRowLeft}>
            <ChallengeCoin level={level} locked={isLocked} size="md" />
            <View style={styles.levelTitleBlock}>
              <View style={styles.levelNameRow}>
                <Text
                  variant="label"
                  weight="semibold"
                  style={[
                    styles.levelName,
                    isLocked && styles.textLocked,
                    isCurrent && { color: level.color },
                  ]}
                >
                  {level.name}
                </Text>
                {isMyLevel && (
                  <View style={[styles.youBadge, { backgroundColor: level.color }]}>
                    <Text variant="caption" weight="bold" style={styles.youBadgeText}>
                      YOU
                    </Text>
                  </View>
                )}
                {isCurrent && !isOwnProfile && !isMyLevel && (
                  <View style={[styles.youBadge, { backgroundColor: theme.colors.gray[400] }]}>
                    <Text variant="caption" weight="bold" style={styles.youBadgeText}>
                      THEM
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.levelStatusRow}>
                <Icon name={statusIcon} size={13} color={statusColor} solid={isCompleted || isCurrent} />
                <Text variant="caption" color={isLocked ? 'gray.400' : 'gray.500'}>
                  {rangeText}
                </Text>
              </View>
            </View>
          </View>

          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={theme.colors.gray[400]}
          />
        </TouchableOpacity>

        {/* Expanded rewards */}
        {expanded && (
          <View style={styles.rewardsSection}>
            <Text variant="caption" weight="semibold" color="gray.600" style={styles.rewardsTitle}>
              Rewards
            </Text>
            {level.rewards.map((reward, i) => (
              <View key={i} style={styles.rewardRow}>
                <Icon
                  name="gift"
                  size={12}
                  color={isLocked ? theme.colors.gray[300] : level.color}
                  style={styles.rewardIcon}
                />
                <Text
                  variant="caption"
                  style={[styles.rewardText, isLocked && styles.textLocked]}
                >
                  {reward}
                </Text>
              </View>
            ))}
            {isCompleted && (
              <View style={styles.unlockedBanner}>
                <Icon name="circle-check" size={13} color={theme.colors.success[600]} solid />
                <Text variant="caption" weight="semibold" style={styles.unlockedText}>
                  Level completed! Check your profile for rewards.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.gray[50],
    borderWidth: 1.5,
    gap: theme.spacing.lg,
  },
  heroInfo: {
    flex: 1,
  },
  heroLabel: {
    marginBottom: 2,
  },
  heroLevelName: {
    marginBottom: 2,
  },
  heroPoints: {
    color: theme.colors.gray[700],
  },
  progressSection: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.gray[200],
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressSub: {
    marginTop: theme.spacing.xs,
  },
  maxLevelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.gray[50],
  },
  earnCard: {
    margin: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
  },
  earnTitle: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.primary[700],
  },
  earnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  earnIcon: {
    width: 20,
  },
  earnText: {
    flex: 1,
    color: theme.colors.gray[700],
    fontSize: 13,
  },
  earnPts: {
    color: theme.colors.primary[600],
    fontSize: 12,
  },
  earnNote: {
    marginTop: theme.spacing.xs,
  },
  levelsListTitle: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.gray[700],
  },
  levelRow: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    overflow: 'hidden',
    backgroundColor: theme.colors.white,
  },
  levelRowLocked: {
    opacity: 0.65,
  },
  colorBar: {
    width: 5,
  },
  levelRowContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  levelRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  levelTitleBlock: {
    flex: 1,
  },
  levelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  levelName: {
    color: theme.colors.gray[800],
  },
  youBadge: {
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  youBadgeText: {
    color: theme.colors.white,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  levelStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: 2,
  },
  rewardsSection: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[100],
  },
  rewardsTitle: {
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 10,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    gap: 6,
  },
  rewardIcon: {
    marginTop: 2,
  },
  rewardText: {
    flex: 1,
    color: theme.colors.gray[600],
    lineHeight: 18,
  },
  textLocked: {
    color: theme.colors.gray[400],
  },
  unlockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.success[50],
    gap: 6,
  },
  unlockedText: {
    flex: 1,
    color: theme.colors.success[700],
    fontSize: 11,
  },
  bottomPad: {
    height: theme.spacing.xl,
  },
});

export default LevelsScreen;
