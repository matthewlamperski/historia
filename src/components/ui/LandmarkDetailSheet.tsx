import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { Landmark } from '../../types';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useJournal } from '../../hooks/useJournal';
import { JournalModal } from './JournalModal';

const { width: screenWidth } = Dimensions.get('window');
const IMAGE_HEIGHT = 220;

export const getCategoryColor = (category: Landmark['category']): string => {
  switch (category) {
    case 'monument':   return theme.colors.primary[500];
    case 'building':   return theme.colors.warning[500];
    case 'site':       return theme.colors.success[500];
    case 'battlefield':return theme.colors.error[500];
    default:           return theme.colors.secondary[500];
  }
};

export interface LandmarkDetailSheetProps {
  landmark: Landmark;
  isBookmarked: boolean;
  hasVisited: boolean;
  onBookmark: () => void;
  onVisit: () => void;
  onDirections: () => void;
  onSaveOffline: () => void;
  isOfflineSaved: boolean;
  offlineDownloadProgress?: number;
  isEnriching?: boolean;
  standalone?: boolean;
}

// ── Image carousel ────────────────────────────────────────────────────────────

const ImageCarousel = ({
  images,
  isEnriching,
}: {
  images: string[];
  isEnriching?: boolean;
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  if (isEnriching && images.length === 0) {
    return (
      <View style={[styles.imageSlot, styles.imageSkeleton]}>
        <ActivityIndicator size="large" color={theme.colors.primary[400]} />
        <Text style={styles.imageSkeletonText}>Fetching photos…</Text>
      </View>
    );
  }

  if (images.length === 0) {
    return (
      <View style={[styles.imageSlot, styles.imagePlaceholder]}>
        <Icon name="image" size={48} color={theme.colors.gray[300]} />
      </View>
    );
  }

  return (
    <View style={styles.imageSlot}>
      <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
          setActiveIndex(idx);
        }}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.carouselImage} resizeMode="cover" />
        )}
      />
      {images.length > 1 && (
        <View style={styles.dotRow}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
      {isEnriching && (
        <View style={styles.imageLoadingBadge}>
          <ActivityIndicator size="small" color={theme.colors.white} />
        </View>
      )}
    </View>
  );
};

// ── Star rating ───────────────────────────────────────────────────────────────

const StarRating = ({
  rating,
  count,
  onPress,
}: {
  rating: number;
  count?: number;
  onPress?: () => void;
}) => {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.4;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <TouchableOpacity
      style={styles.ratingRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.65 : 1}
    >
      {Array.from({ length: full  }).map((_, i) => (
        <Icon key={`f${i}`} name="star" size={13} color={theme.colors.warning[500]} solid />
      ))}
      {half && <Icon name="star-half-stroke" size={13} color={theme.colors.warning[500]} solid />}
      {Array.from({ length: empty }).map((_, i) => (
        <Icon key={`e${i}`} name="star" size={13} color={theme.colors.gray[300]} />
      ))}
      <Text style={[styles.ratingText, onPress && styles.ratingTextLink]}>
        {rating.toFixed(1)}
        {count != null ? `  ·  ${count.toLocaleString()} reviews` : ''}
      </Text>
      {onPress && (
        <Icon name="arrow-up-right-from-square" size={10} color={theme.colors.primary[400]} style={{ marginLeft: 3 }} />
      )}
    </TouchableOpacity>
  );
};

// ── Info row ──────────────────────────────────────────────────────────────────

const InfoRow = ({
  icon,
  text,
  onPress,
}: {
  icon: string;
  text: string;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    style={styles.infoRow}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.65 : 1}
  >
    <View style={styles.infoIcon}>
      <Icon name={icon} size={13} color={theme.colors.primary[600]} solid />
    </View>
    <Text
      style={[styles.infoText, onPress && styles.infoTextLink]}
      numberOfLines={2}
    >
      {text}
    </Text>
    {onPress && (
      <Icon name="arrow-up-right-from-square" size={11} color={theme.colors.primary[400]} />
    )}
  </TouchableOpacity>
);

// ── Main component ────────────────────────────────────────────────────────────

const LandmarkDetailSheet = ({
  landmark,
  isBookmarked,
  hasVisited,
  onBookmark,
  onVisit,
  onDirections,
  onSaveOffline,
  isOfflineSaved,
  offlineDownloadProgress,
  isEnriching = false,
  standalone = false,
}: LandmarkDetailSheetProps) => {
  const ScrollContainer = standalone ? ScrollView : BottomSheetScrollView;
  const { user } = useAuthStore();
  const { entry, loading: journalLoading, saving: journalSaving, loadEntry, saveEntry } =
    useJournal(user?.id ?? '');

  const [journalVisible, setJournalVisible] = useState(false);
  const [hoursExpanded, setHoursExpanded] = useState(false);

  useEffect(() => {
    if (user?.id && landmark.id) loadEntry(landmark.id);
  }, [landmark.id, user?.id, loadEntry]);

  const handleJournalSave = useCallback(
    async (text: string) => saveEntry(landmark.id, landmark.name, text),
    [landmark.id, landmark.name, saveEntry]
  );

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(console.error);
  };

  const callPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(console.error);
  };

  const aboutText = landmark.editorialSummary?.trim() || landmark.description?.trim();
  const hasAbout = Boolean(aboutText);
  const hasHours = (landmark.openingHours?.length ?? 0) > 0
    || Boolean(landmark.visitingHours?.trim());

  return (
    <ScrollContainer showsVerticalScrollIndicator={false}>
      {/* ── Image carousel ──────────────────────────────────────── */}
      <ImageCarousel images={landmark.images ?? []} isEnriching={isEnriching} />

      {/* ── Action buttons ──────────────────────────────────────── */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, isBookmarked && styles.actionBtnActive]}
          onPress={onBookmark}
        >
          <Icon
            name="bookmark"
            size={15}
            color={isBookmarked ? theme.colors.white : theme.colors.primary[600]}
            solid={isBookmarked}
          />
          <Text style={[styles.actionBtnText, isBookmarked && styles.actionBtnTextActive]}>
            {isBookmarked ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onDirections}>
          <Icon name="diamond-turn-right" size={15} color={theme.colors.primary[600]} />
          <Text style={styles.actionBtnText}>Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, isOfflineSaved && styles.actionBtnOffline]}
          onPress={onSaveOffline}
          disabled={offlineDownloadProgress !== undefined && offlineDownloadProgress < 100}
        >
          {offlineDownloadProgress !== undefined && offlineDownloadProgress < 100 ? (
            <>
              <ActivityIndicator size="small" color={theme.colors.primary[600]} />
              <Text style={styles.actionBtnText}>{offlineDownloadProgress}%</Text>
            </>
          ) : (
            <>
              <Icon
                name={isOfflineSaved ? 'circle-check' : 'download'}
                size={15}
                color={isOfflineSaved ? theme.colors.white : theme.colors.primary[600]}
                solid={isOfflineSaved}
              />
              <Text style={[styles.actionBtnText, isOfflineSaved && styles.actionBtnTextActive]}>
                {isOfflineSaved ? 'Saved' : 'Offline'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* ── Title + category ────────────────────────────────────── */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{landmark.name}</Text>
          <View style={[styles.badge, { backgroundColor: getCategoryColor(landmark.category) }]}>
            <Text style={styles.badgeText}>
              {landmark.category?.toUpperCase() ?? 'LANDMARK'}
            </Text>
          </View>
        </View>

        {/* ── Rating ──────────────────────────────────────────────── */}
        {landmark.rating != null && (
          <StarRating
            rating={landmark.rating}
            count={landmark.ratingCount}
            onPress={landmark.googleMapsUri ? () => openUrl(landmark.googleMapsUri!) : undefined}
          />
        )}
        {isEnriching && landmark.rating == null && (
          <View style={styles.enrichingPill}>
            <ActivityIndicator size="small" color={theme.colors.primary[500]} style={{ marginRight: 6 }} />
            <Text style={styles.enrichingText}>Fetching details…</Text>
          </View>
        )}

        {/* ── Info rows ───────────────────────────────────────────── */}
        <View style={styles.infoBlock}>
          {(landmark.yearBuilt != null) && (
            <InfoRow icon="calendar" text={`Est. ${landmark.yearBuilt}`} />
          )}
          {landmark.address ? (
            <InfoRow icon="location-dot" text={landmark.address} />
          ) : null}
          {landmark.phone && (
            <InfoRow
              icon="phone"
              text={landmark.phone}
              onPress={() => callPhone(landmark.phone!)}
            />
          )}
          {landmark.website && (
            <InfoRow
              icon="globe"
              text={landmark.website.replace(/^https?:\/\//, '')}
              onPress={() => openUrl(landmark.website!)}
            />
          )}
          {landmark.wheelchair && (
            <InfoRow icon="wheelchair" text="Wheelchair accessible entrance" />
          )}
        </View>

        {/* ── About ───────────────────────────────────────────────── */}
        {hasAbout && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.sectionText}>{aboutText}</Text>
          </View>
        )}

        {/* ── Hours ───────────────────────────────────────────────── */}
        {hasHours && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionTitleRow}
              onPress={() => setHoursExpanded(e => !e)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Hours</Text>
              <Icon
                name={hoursExpanded ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={theme.colors.gray[500]}
              />
            </TouchableOpacity>
            {hoursExpanded && (
              landmark.openingHours?.length
                ? landmark.openingHours.map((line, i) => (
                    <Text key={i} style={styles.hoursLine}>{line}</Text>
                  ))
                : <Text style={styles.sectionText}>{landmark.visitingHours}</Text>
            )}
          </View>
        )}

        {/* ── Check In ────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.checkInBtn, hasVisited && styles.checkInBtnVisited]}
          onPress={onVisit}
          disabled={hasVisited}
          activeOpacity={hasVisited ? 1 : 0.8}
        >
          <Icon
            name={hasVisited ? 'circle-check' : 'location-dot'}
            size={17}
            color={theme.colors.white}
            solid
          />
          <Text style={styles.checkInBtnText}>
            {hasVisited ? 'Visited' : 'Check In'}
          </Text>
        </TouchableOpacity>

        {/* ── Gratitude Journal ────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.journalCard}
          onPress={() => setJournalVisible(true)}
          activeOpacity={0.75}
        >
          <View style={styles.journalCardHeader}>
            <View style={styles.journalCardHeaderLeft}>
              <View style={styles.journalIconWrap}>
                <Icon name="book-open" size={13} color={theme.colors.primary[600]} />
              </View>
              <Text style={styles.journalCardTitle}>Gratitude Journal</Text>
            </View>
            <View style={styles.journalEditPill}>
              <Text style={styles.journalEditPillText}>{entry ? 'Edit' : 'Write'}</Text>
              <Icon name="chevron-right" size={10} color={theme.colors.primary[500]} />
            </View>
          </View>
          <View style={styles.journalCardBody}>
            {journalLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary[400]} style={styles.journalLoading} />
            ) : entry ? (
              <Text style={styles.journalPreview} numberOfLines={3}>{entry}</Text>
            ) : (
              <Text style={styles.journalEmpty}>
                Write your thoughts, memories, and what you're grateful for about this place…
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <JournalModal
        visible={journalVisible}
        landmarkName={landmark.name}
        initialEntry={entry}
        loading={journalLoading}
        saving={journalSaving}
        onSave={handleJournalSave}
        onClose={() => setJournalVisible(false)}
      />
    </ScrollContainer>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Image
  imageSlot: {
    width: screenWidth,
    height: IMAGE_HEIGHT,
  },
  imageSkeleton: {
    backgroundColor: theme.colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  imageSkeletonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[400],
  },
  imagePlaceholder: {
    backgroundColor: theme.colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselImage: {
    width: screenWidth,
    height: IMAGE_HEIGHT,
  },
  dotRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: theme.colors.white,
    width: 16,
  },
  imageLoadingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
    backgroundColor: theme.colors.white,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.primary[300],
    borderRadius: theme.borderRadius.md,
    gap: 5,
  },
  actionBtnActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  actionBtnOffline: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  actionBtnText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary[600],
  },
  actionBtnTextActive: {
    color: theme.colors.white,
  },

  // Content
  content: {
    padding: theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    marginRight: theme.spacing.sm,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  badgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.white,
  },

  // Rating
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: theme.spacing.sm,
  },
  ratingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    marginLeft: 4,
  },
  ratingTextLink: {
    color: theme.colors.primary[700],
    textDecorationLine: 'underline',
  },

  // Enriching pill
  enrichingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  enrichingText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary[600],
  },

  // Info block
  infoBlock: {
    marginBottom: theme.spacing.md,
    gap: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.gray[100],
  },
  infoIcon: {
    width: 24,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[700],
    lineHeight: 18,
  },
  infoTextLink: {
    color: theme.colors.primary[700],
    textDecorationLine: 'underline',
  },

  // Sections
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
    marginBottom: theme.spacing.sm,
  },
  sectionText: {
    fontSize: theme.fontSize.base,
    lineHeight: 22,
    color: theme.colors.gray[700],
  },
  hoursLine: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[700],
    lineHeight: 22,
  },

  // Check In
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 14,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  checkInBtnVisited: {
    backgroundColor: theme.colors.primary[300],
  },
  checkInBtnText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.white,
  },

  // Journal
  journalCard: {
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  journalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary[200],
  },
  journalCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  journalIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalCardTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary[800],
  },
  journalEditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.primary[100],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  journalEditPillText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary[600],
  },
  journalCardBody: {
    padding: theme.spacing.md,
    minHeight: 64,
  },
  journalLoading: {
    alignSelf: 'center',
    marginVertical: theme.spacing.sm,
  },
  journalPreview: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[700],
    lineHeight: 20,
    fontStyle: 'italic',
  },
  journalEmpty: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary[400],
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default LandmarkDetailSheet;
