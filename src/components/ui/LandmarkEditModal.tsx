import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6, FontAwesome6SolidIconName } from '@react-native-vector-icons/fontawesome6';
import { Text } from './Text';
import { theme } from '../../constants/theme';
import { Landmark, LandmarkType } from '../../types';
import { landmarksService } from '../../services';
import { useAuthStore } from '../../store/authStore';
import { isNoEnrichmentUid } from '../../utils/admin';

interface LandmarkEditModalProps {
  visible: boolean;
  landmark: Landmark;
  onClose: () => void;
  onSaved: (updated: Landmark) => void;
}

type DraftLandmark = Omit<Landmark, 'id'>;

const CATEGORY_OPTIONS: Array<{ value: Landmark['category']; label: string }> = [
  { value: 'monument', label: 'Monument' },
  { value: 'building', label: 'Building' },
  { value: 'site', label: 'Site' },
  { value: 'battlefield', label: 'Battlefield' },
  { value: 'other', label: 'Other' },
];

const LANDMARK_TYPE_OPTIONS: Array<{ value: LandmarkType | ''; label: string }> = [
  { value: '', label: 'Unset' },
  { value: 'museum', label: 'Museum' },
  { value: 'historic_site', label: 'Historic site' },
  { value: 'manufacturer', label: 'Manufacturer' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable field components (scoped to this file)
// ─────────────────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}
const Field: React.FC<FieldProps> = ({ label, hint, children }) => (
  <View style={fieldStyles.wrap}>
    <Text variant="caption" weight="semibold" style={fieldStyles.label}>
      {label}
    </Text>
    {children}
    {hint && (
      <Text variant="caption" color="gray.400" style={fieldStyles.hint}>
        {hint}
      </Text>
    )}
  </View>
);

type KeyboardType =
  | 'default'
  | 'url'
  | 'phone-pad'
  | 'decimal-pad'
  | 'number-pad'
  | 'numbers-and-punctuation';

interface TextFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: KeyboardType;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  showClear?: boolean;
  monospace?: boolean;
  prefix?: string;
}
const TextField: React.FC<TextFieldProps> = ({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
  showClear,
  monospace,
  prefix,
}) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const showTrailingClear = Boolean(showClear && hasValue);

  return (
    <View
      style={[
        fieldStyles.inputWrap,
        multiline && fieldStyles.inputWrapMultiline,
        focused && fieldStyles.inputWrapFocused,
      ]}
    >
      {prefix && (
        <View style={fieldStyles.inputPrefix}>
          <Text variant="caption" weight="bold" style={fieldStyles.prefixText}>
            {prefix}
          </Text>
        </View>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.gray[400]}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          fieldStyles.input,
          multiline && fieldStyles.inputMultiline,
          monospace && fieldStyles.inputMono,
          showTrailingClear && fieldStyles.inputWithClear,
        ]}
      />
      {showTrailingClear && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          style={fieldStyles.clearBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Clear field"
        >
          <FontAwesome6
            name="circle-xmark"
            size={18}
            color={theme.colors.gray[400]}
            iconStyle="solid"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

interface SegmentedProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}
function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <View style={segmentedStyles.row}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value || '__empty'}
            style={[segmentedStyles.pill, active && segmentedStyles.pillActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.75}
          >
            <Text
              variant="caption"
              weight={active ? 'semibold' : 'medium'}
              style={[segmentedStyles.pillText, active && segmentedStyles.pillTextActive]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface SectionProps {
  title: string;
  icon: FontAwesome6SolidIconName;
  children: React.ReactNode;
}
const Section: React.FC<SectionProps> = ({ title, icon, children }) => (
  <View style={sectionStyles.wrap}>
    <View style={sectionStyles.titleRow}>
      <View style={sectionStyles.titleIcon}>
        <FontAwesome6 name={icon} size={11} color={theme.colors.primary[600]} iconStyle="solid" />
      </View>
      <Text variant="caption" weight="bold" style={sectionStyles.title}>
        {title.toUpperCase()}
      </Text>
    </View>
    <View style={sectionStyles.body}>{children}</View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────────

export const LandmarkEditModal: React.FC<LandmarkEditModalProps> = ({
  visible,
  landmark,
  onClose,
  onSaved,
}) => {
  const [draft, setDraft] = useState<DraftLandmark>(() => landmarkToDraft(landmark));
  const [saving, setSaving] = useState(false);
  const userId = useAuthStore(state => state.user?.id);

  // Reset the draft any time the modal opens for a different landmark.
  React.useEffect(() => {
    if (visible) setDraft(landmarkToDraft(landmark));
  }, [visible, landmark]);

  const patch = <K extends keyof DraftLandmark>(key: K, value: DraftLandmark[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  // Coordinate inputs live as free-form strings so the user can fully clear
  // the field (empty string) or paste a partial value mid-edit. Parsing only
  // happens at save time. Seed from every schema variant we've seen on
  // landmark docs so legacy docs like Jane Addams (which only store _geoloc)
  // don't render as "0".
  const [latText, setLatText] = useState(() => initialLatText(landmark));
  const [lngText, setLngText] = useState(() => initialLngText(landmark));

  // Array-of-string fields edited as newline-separated text
  const [imagesText, setImagesText] = useState(() => (landmark.images ?? []).join('\n'));
  const [openingHoursText, setOpeningHoursText] = useState(() =>
    (landmark.openingHours ?? []).join('\n'),
  );
  React.useEffect(() => {
    if (visible) {
      setImagesText((landmark.images ?? []).join('\n'));
      setOpeningHoursText((landmark.openingHours ?? []).join('\n'));
      setLatText(initialLatText(landmark));
      setLngText(initialLngText(landmark));
    }
  }, [visible, landmark]);

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(buildFinal(draft, imagesText, openingHoursText, latText, lngText)) !==
      JSON.stringify(landmarkToDraft(landmark))
    );
  }, [draft, imagesText, openingHoursText, latText, lngText, landmark]);

  const handleSave = async () => {
    if (!landmark.id) return;
    const final = buildFinal(draft, imagesText, openingHoursText, latText, lngText);

    if (!final.name.trim()) {
      Alert.alert('Name required', 'Landmark name cannot be empty.');
      return;
    }

    const lat = parseFloat(latText.trim());
    const lng = parseFloat(lngText.trim());
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      Alert.alert('Invalid coordinates', 'Latitude and longitude must be valid numbers.');
      return;
    }
    if (lat < -90 || lat > 90) {
      Alert.alert('Invalid latitude', 'Latitude must be between -90 and 90.');
      return;
    }
    if (lng < -180 || lng > 180) {
      Alert.alert('Invalid longitude', 'Longitude must be between -180 and 180.');
      return;
    }

    setSaving(true);
    try {
      // Write coordinates to every schema variant so the doc stays consistent
      // no matter which field the rest of the app happens to read from.
      // For the curating-admin UIDs, also clear `populated` so the doc isn't
      // treated as Places-enriched after their manual edit. The service maps
      // `undefined` → FieldValue.delete(), removing the key from the doc.
      const skipEnrichment = isNoEnrichmentUid(userId);
      await landmarksService.updateLandmark(landmark.id, {
        ...final,
        coordinates: { latitude: lat, longitude: lng },
        latitude: lat,
        longitude: lng,
        lat,
        lng,
        _geoloc: { lat, lng },
        ...(skipEnrichment ? { populated: undefined } : {}),
      });
      onSaved({
        id: landmark.id,
        ...final,
        coordinates: { latitude: lat, longitude: lng },
        ...(skipEnrichment ? { populated: undefined } : {}),
      });
      onClose();
    } catch (err) {
      console.error('Landmark update failed:', err);
      Alert.alert('Save failed', 'Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmClose = () => {
    if (!hasChanges) {
      onClose();
      return;
    }
    Alert.alert('Discard changes?', 'Your edits to this landmark will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onClose },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={confirmClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={confirmClose}
            style={styles.headerIconBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <FontAwesome6 name="xmark" size={20} color={theme.colors.gray[700]} iconStyle="solid" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.adminBadge}>
              <FontAwesome6
                name="shield-halved"
                size={9}
                color={theme.colors.warning[700]}
                iconStyle="solid"
              />
              <Text variant="caption" weight="bold" style={styles.adminBadgeText}>
                ADMIN ONLY
              </Text>
            </View>
            <Text variant="label" weight="bold" style={styles.headerTitle} numberOfLines={1}>
              Edit Landmark
            </Text>
            {!!landmark.name && (
              <Text
                variant="caption"
                color="gray.500"
                style={styles.headerSubtitle}
                numberOfLines={1}
              >
                {landmark.name}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !hasChanges}
            style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text variant="label" weight="bold" style={styles.saveBtnText}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Section title="Identity" icon="id-card">
              <Field label="Name">
                <TextField
                  value={draft.name}
                  onChangeText={v => patch('name', v)}
                  placeholder="Liberty Bell"
                  autoCapitalize="words"
                  showClear
                />
              </Field>
              <Field label="Short description" hint="One sentence used in search + lists">
                <TextField
                  value={draft.shortDescription ?? ''}
                  onChangeText={v => patch('shortDescription', v)}
                  placeholder="An iconic symbol of American independence."
                  multiline
                />
              </Field>
              <Field label="Description" hint="Long-form description of the site">
                <TextField
                  value={draft.description ?? ''}
                  onChangeText={v => patch('description', v)}
                  multiline
                />
              </Field>
              <Field label="Historical significance">
                <TextField
                  value={draft.historicalSignificance ?? ''}
                  onChangeText={v => patch('historicalSignificance', v)}
                  multiline
                />
              </Field>
              <Field label="Editorial summary" hint="Google Places short blurb (can override)">
                <TextField
                  value={draft.editorialSummary ?? ''}
                  onChangeText={v => patch('editorialSummary', v)}
                  multiline
                />
              </Field>
            </Section>

            <Section title="Classification" icon="tags">
              <Field label="Category">
                <Segmented
                  value={draft.category}
                  options={CATEGORY_OPTIONS}
                  onChange={v => patch('category', v)}
                />
              </Field>
              <Field label="Landmark type" hint="Drives map icon">
                <Segmented
                  value={(draft.landmarkType ?? '') as LandmarkType | ''}
                  options={LANDMARK_TYPE_OPTIONS}
                  onChange={v => patch('landmarkType', v === '' ? undefined : v)}
                />
              </Field>
              <Field label="Year built">
                <TextField
                  value={draft.yearBuilt != null ? String(draft.yearBuilt) : ''}
                  onChangeText={v => patch('yearBuilt', parseOptionalInt(v))}
                  placeholder="1776"
                  keyboardType="number-pad"
                  showClear
                />
              </Field>
            </Section>

            <Section title="Location" icon="location-dot">
              <Field label="Address">
                <TextField
                  value={draft.address ?? ''}
                  onChangeText={v => patch('address', v)}
                  multiline
                />
              </Field>
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Field label="City">
                    <TextField
                      value={draft.city ?? ''}
                      onChangeText={v => patch('city', v)}
                      autoCapitalize="words"
                      showClear
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="State">
                    <TextField
                      value={draft.state ?? ''}
                      onChangeText={v => patch('state', v)}
                      autoCapitalize="characters"
                      showClear
                    />
                  </Field>
                </View>
              </View>

              <View style={styles.coordGrid}>
                <View style={{ flex: 1 }}>
                  <Field label="Latitude">
                    <TextField
                      value={latText}
                      onChangeText={setLatText}
                      placeholder="39.9496"
                      keyboardType="numbers-and-punctuation"
                      autoCapitalize="none"
                      showClear
                      monospace
                      prefix="LAT"
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Longitude">
                    <TextField
                      value={lngText}
                      onChangeText={setLngText}
                      placeholder="-75.1503"
                      keyboardType="numbers-and-punctuation"
                      autoCapitalize="none"
                      showClear
                      monospace
                      prefix="LNG"
                    />
                  </Field>
                </View>
              </View>
            </Section>

            <Section title="Contact & Links" icon="link">
              <Field label="Phone">
                <TextField
                  value={draft.phone ?? ''}
                  onChangeText={v => patch('phone', v)}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  showClear
                />
              </Field>
              <Field label="Website">
                <TextField
                  value={draft.website ?? ''}
                  onChangeText={v => patch('website', v)}
                  keyboardType="url"
                  autoCapitalize="none"
                  showClear
                />
              </Field>
              <Field label="Google Maps URI">
                <TextField
                  value={draft.googleMapsUri ?? ''}
                  onChangeText={v => patch('googleMapsUri', v)}
                  keyboardType="url"
                  autoCapitalize="none"
                  showClear
                />
              </Field>
            </Section>

            <Section title="Hours" icon="clock">
              <Field label="Visiting hours (free text)">
                <TextField
                  value={draft.visitingHours ?? ''}
                  onChangeText={v => patch('visitingHours', v)}
                  multiline
                />
              </Field>
              <Field
                label="Opening hours (structured)"
                hint="One day per line, e.g. “Monday: 9:00 AM – 5:00 PM”"
              >
                <TextField
                  value={openingHoursText}
                  onChangeText={setOpeningHoursText}
                  multiline
                />
              </Field>
            </Section>

            <Section title="Accessibility & Ratings" icon="universal-access">
              <View style={styles.rowSwitch}>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" weight="semibold" style={fieldStyles.label}>
                    Wheelchair accessible
                  </Text>
                </View>
                <Switch
                  value={Boolean(draft.wheelchair)}
                  onValueChange={v => patch('wheelchair', v)}
                  trackColor={{
                    true: theme.colors.primary[400],
                    false: theme.colors.gray[300],
                  }}
                  thumbColor={theme.colors.white}
                />
              </View>
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Field label="Rating (0–5)">
                    <TextField
                      value={draft.rating != null ? String(draft.rating) : ''}
                      onChangeText={v => patch('rating', parseOptionalFloat(v))}
                      keyboardType="decimal-pad"
                      showClear
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Rating count">
                    <TextField
                      value={draft.ratingCount != null ? String(draft.ratingCount) : ''}
                      onChangeText={v => patch('ratingCount', parseOptionalInt(v))}
                      keyboardType="number-pad"
                      showClear
                    />
                  </Field>
                </View>
              </View>
            </Section>

            <Section title="Media" icon="image">
              <Field label="Image URLs" hint="One URL per line">
                <TextField
                  value={imagesText}
                  onChangeText={setImagesText}
                  multiline
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </Field>
            </Section>

            <View style={styles.docIdBlock}>
              <View style={styles.docIdChip}>
                <FontAwesome6
                  name="fingerprint"
                  size={10}
                  color={theme.colors.gray[500]}
                  iconStyle="solid"
                />
                <Text variant="caption" color="gray.500" style={styles.docIdText}>
                  {landmark.id}
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default LandmarkEditModal;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function pickCoord(
  l: Landmark,
  axis: 'lat' | 'lng',
): number | undefined {
  // Accept any of the schemas we've seen on landmark docs: nested
  // `coordinates`, flat `latitude`/`longitude`, flat `lat`/`lng`, or Algolia's
  // `_geoloc`. The modal receives `Landmark` objects from multiple call sites
  // (MapTab via Algolia, screens via landmarksService) and the shape isn't
  // uniform — this keeps the modal robust across all of them.
  const raw = l as unknown as Record<string, any>;
  const candidates =
    axis === 'lat'
      ? [raw.coordinates?.latitude, raw.latitude, raw._geoloc?.lat, raw.lat]
      : [raw.coordinates?.longitude, raw.longitude, raw._geoloc?.lng, raw.lng];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c) && c !== 0) return c;
  }
  // Fall back to a 0 if that's literally all we have.
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c;
  }
  return undefined;
}

function initialLatText(l: Landmark): string {
  const v = pickCoord(l, 'lat');
  return v === undefined ? '' : String(v);
}

function initialLngText(l: Landmark): string {
  const v = pickCoord(l, 'lng');
  return v === undefined ? '' : String(v);
}

function landmarkToDraft(l: Landmark): DraftLandmark {
  const { id: _id, ...rest } = l;
  const lat = pickCoord(l, 'lat') ?? 0;
  const lng = pickCoord(l, 'lng') ?? 0;
  return {
    ...rest,
    coordinates: { latitude: lat, longitude: lng },
    images: rest.images ?? [],
    openingHours: rest.openingHours ?? [],
  };
}

function buildFinal(
  draft: DraftLandmark,
  imagesText: string,
  openingHoursText: string,
  latText: string,
  lngText: string,
): DraftLandmark {
  const lat = parseFloat(latText.trim());
  const lng = parseFloat(lngText.trim());
  return {
    ...draft,
    coordinates: {
      latitude: Number.isFinite(lat) ? lat : draft.coordinates.latitude,
      longitude: Number.isFinite(lng) ? lng : draft.coordinates.longitude,
    },
    images: imagesText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean),
    openingHours: openingHoursText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean),
  };
}

function parseOptionalInt(v: string): number | undefined {
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseOptionalFloat(v: string): number | undefined {
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
    shadowColor: theme.colors.black,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.gray[100],
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: theme.spacing.sm,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning[50],
    borderColor: theme.colors.warning[200],
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    gap: 4,
    marginBottom: 2,
  },
  adminBadgeText: {
    color: theme.colors.warning[700],
    fontSize: 9,
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: theme.colors.gray[900],
    fontSize: theme.fontSize.lg,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary[600],
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  saveBtnDisabled: {
    opacity: 0.35,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    color: theme.colors.white,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing['3xl'],
  },
  row2: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  coordGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  rowSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  docIdBlock: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  docIdChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.gray[100],
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  docIdText: {
    fontSize: 11,
  },
});

const sectionStyles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.xs + 2,
    marginLeft: 4,
  },
  titleIcon: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.colors.primary[600],
    letterSpacing: 1.5,
  },
  body: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius['2xl'],
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.gray[100],
    gap: theme.spacing.md,
    shadowColor: theme.colors.black,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});

const fieldStyles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    color: theme.colors.gray[700],
    letterSpacing: 0.2,
  },
  hint: {
    marginTop: 2,
    lineHeight: 16,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.gray[200],
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
  },
  inputWrapMultiline: {
    alignItems: 'stretch',
  },
  inputWrapFocused: {
    borderColor: theme.colors.primary[400],
    backgroundColor: theme.colors.primary[50],
  },
  inputPrefix: {
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    borderRightWidth: 1,
    borderRightColor: theme.colors.gray[100],
    backgroundColor: theme.colors.gray[50],
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  prefixText: {
    fontSize: 10,
    color: theme.colors.gray[600],
    letterSpacing: 1.2,
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.sm + 4,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[900],
  },
  inputMultiline: {
    minHeight: 92,
    textAlignVertical: 'top',
    paddingTop: Platform.OS === 'ios' ? 11 : 9,
  },
  inputMono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: theme.fontSize.base,
    letterSpacing: 0.3,
  },
  inputWithClear: {
    paddingRight: 4,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});

const segmentedStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.gray[100],
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  pillActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[600],
  },
  pillText: {
    color: theme.colors.gray[700],
  },
  pillTextActive: {
    color: theme.colors.white,
  },
});
