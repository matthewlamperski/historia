import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { Landmark } from '../../types';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useJournal } from '../../hooks/useJournal';
import { JournalModal } from './JournalModal';

const { width: screenWidth } = Dimensions.get('window');

export const getCategoryColor = (category: Landmark['category']): string => {
  switch (category) {
    case 'monument':
      return theme.colors.primary[500];
    case 'building':
      return theme.colors.warning[500];
    case 'site':
      return theme.colors.success[500];
    case 'battlefield':
      return theme.colors.error[500];
    default:
      return theme.colors.secondary[500];
  }
};

export interface LandmarkDetailSheetProps {
  landmark: Landmark;
  isBookmarked: boolean;
  hasVisited: boolean;
  onBookmark: () => void;
  onVisit: () => void;
  onDirections: () => void;
}

const LandmarkDetailSheet = ({
  landmark,
  isBookmarked,
  hasVisited,
  onBookmark,
  onVisit,
  onDirections,
}: LandmarkDetailSheetProps) => {
  const { user } = useAuthStore();
  const { entry, loading: journalLoading, saving: journalSaving, loadEntry, saveEntry } =
    useJournal(user?.id ?? '');

  const [journalVisible, setJournalVisible] = useState(false);

  // Load journal entry whenever the displayed landmark changes
  useEffect(() => {
    if (user?.id && landmark.id) {
      loadEntry(landmark.id);
    }
  }, [landmark.id, user?.id, loadEntry]);

  const handleJournalSave = useCallback(
    async (text: string) => {
      await saveEntry(landmark.id, landmark.name, text);
    },
    [landmark.id, landmark.name, saveEntry]
  );

  return (
    <BottomSheetScrollView showsVerticalScrollIndicator={false}>
      {/* Header Image */}
      {landmark.images?.[0] ? (
        <Image
          source={{ uri: landmark.images[0] }}
          style={styles.landmarkImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.landmarkImage, styles.landmarkImagePlaceholder]}>
          <Icon name="image" size={48} color={theme.colors.gray[300]} />
        </View>
      )}

      {/* Content */}
      <View style={styles.landmarkContent}>
        {/* Title and Category */}
        <View style={styles.landmarkHeader}>
          <Text style={styles.landmarkTitle}>{landmark.name}</Text>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: getCategoryColor(landmark.category) },
            ]}
          >
            <Text style={styles.categoryText}>
              {landmark.category?.toUpperCase() ?? 'LANDMARK'}
            </Text>
          </View>
        </View>

        {/* Year and Address */}
        <View style={styles.landmarkMeta}>
          {landmark.yearBuilt && (
            <Text style={styles.yearText}>Built in {landmark.yearBuilt}</Text>
          )}
          <Text style={styles.addressText}>{landmark.address}</Text>
        </View>

        {/* Description */}
        <Text style={styles.descriptionText}>{landmark.description}</Text>

        {/* Historical Significance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historical Significance</Text>
          <Text style={styles.sectionText}>
            {landmark.historicalSignificance}
          </Text>
        </View>

        {/* Visiting Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visit Information</Text>
          {landmark.visitingHours && (
            <Text style={styles.sectionText}>
              Hours: {landmark.visitingHours}
            </Text>
          )}
          {landmark.website && (
            <TouchableOpacity
              style={styles.websiteButton}
              onPress={() => Linking.openURL(landmark.website || '')}
            >
              <Text style={styles.websiteText}>Visit Website</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, isBookmarked && styles.actionBtnActive]}
            onPress={onBookmark}
          >
            <Icon
              name="bookmark"
              size={18}
              color={isBookmarked ? theme.colors.white : theme.colors.primary[600]}
              solid={isBookmarked}
            />
            <Text
              style={[
                styles.actionBtnText,
                isBookmarked && styles.actionBtnTextActive,
              ]}
            >
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, hasVisited && styles.actionBtnVisited]}
            onPress={onVisit}
            disabled={hasVisited}
          >
            <Icon
              name="check-circle"
              size={18}
              color={hasVisited ? theme.colors.white : theme.colors.success[600]}
              solid={hasVisited}
            />
            <Text
              style={[
                styles.actionBtnText,
                hasVisited && styles.actionBtnTextActive,
              ]}
            >
              {hasVisited ? 'Visited' : 'Check In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onDirections}>
            <Icon
              name="diamond-turn-right"
              size={18}
              color={theme.colors.primary[600]}
            />
            <Text style={styles.actionBtnText}>Directions</Text>
          </TouchableOpacity>
        </View>

        {/* ── Gratitude Journal ──────────────────────── */}
        <TouchableOpacity
          style={styles.journalCard}
          onPress={() => setJournalVisible(true)}
          activeOpacity={0.75}
        >
          {/* Card header */}
          <View style={styles.journalCardHeader}>
            <View style={styles.journalCardHeaderLeft}>
              <View style={styles.journalIconWrap}>
                <Icon name="book-open" size={13} color={theme.colors.primary[600]} />
              </View>
              <Text style={styles.journalCardTitle}>Gratitude Journal</Text>
            </View>
            <View style={styles.journalEditPill}>
              <Text style={styles.journalEditPillText}>
                {entry ? 'Edit' : 'Write'}
              </Text>
              <Icon name="chevron-right" size={10} color={theme.colors.primary[500]} />
            </View>
          </View>

          {/* Card body */}
          <View style={styles.journalCardBody}>
            {journalLoading ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary[400]}
                style={styles.journalLoading}
              />
            ) : entry ? (
              <Text style={styles.journalPreview} numberOfLines={3}>
                {entry}
              </Text>
            ) : (
              <Text style={styles.journalEmpty}>
                Write your thoughts, memories, and what you're grateful for about this place…
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Journal modal */}
      <JournalModal
        visible={journalVisible}
        landmarkName={landmark.name}
        initialEntry={entry}
        loading={journalLoading}
        saving={journalSaving}
        onSave={handleJournalSave}
        onClose={() => setJournalVisible(false)}
      />
    </BottomSheetScrollView>
  );
};

const styles = StyleSheet.create({
  landmarkImage: {
    width: screenWidth,
    height: 200,
  },
  landmarkImagePlaceholder: {
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  landmarkContent: {
    padding: theme.spacing.md,
  },
  landmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  landmarkTitle: {
    flex: 1,
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    marginRight: theme.spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  categoryText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.white,
  },
  landmarkMeta: {
    marginBottom: theme.spacing.md,
  },
  yearText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary[600],
    marginBottom: theme.spacing.xs,
  },
  addressText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
  },
  descriptionText: {
    fontSize: theme.fontSize.base,
    lineHeight: 24,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
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
  websiteButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
  },
  websiteText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.white,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary[300],
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  actionBtnActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  actionBtnVisited: {
    backgroundColor: theme.colors.success[500],
    borderColor: theme.colors.success[500],
  },
  actionBtnText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary[600],
  },
  actionBtnTextActive: {
    color: theme.colors.white,
  },

  // ── Gratitude Journal card
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
