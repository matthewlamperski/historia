import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../components/ui';
import { theme } from '../constants/theme';
import { RootStackScreenProps } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useAuthStore } from '../store/authStore';
import { userService } from '../services/userService';
import { useImagePicker } from '../hooks/useImagePicker';

const FIELD_MAX = { name: 60, bio: 160, location: 80, website: 120 };

export const EditProfileScreen = () => {
  const navigation = useNavigation<RootStackScreenProps<'EditProfile'>['navigation']>();
  const { user, updateUser } = useAuthStore();
  const { selectedImages, pickImages, clearImages } = useImagePicker();

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [website, setWebsite] = useState(user?.website ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [saving, setSaving] = useState(false);

  // When image picker resolves, grab the latest selection
  useEffect(() => {
    if (selectedImages.length > 0) {
      setAvatar(selectedImages[selectedImages.length - 1]);
      clearImages();
    }
  }, [selectedImages, clearImages]);

  const handlePickAvatar = useCallback(() => {
    pickImages();
  }, [pickImages]);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Required', 'Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const updates = {
        name: trimmedName,
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        ...(avatar !== user.avatar ? { avatar } : {}),
      };

      await userService.updateUserProfile(user.id, updates);

      // Sync Zustand so the rest of the app sees changes immediately
      updateUser(updates);

      navigation.goBack();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user, name, bio, location, website, avatar, updateUser, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="chevron-left" size={22} color={theme.colors.gray[900]} />
        </TouchableOpacity>
        <Text variant="h4" weight="semibold" style={styles.headerTitle}>
          Edit Profile
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.headerBtn, styles.saveBtn]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.white} />
          ) : (
            <Text variant="label" weight="semibold" style={styles.saveBtnText}>
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
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <TouchableOpacity style={styles.avatarSection} onPress={handlePickAvatar}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text variant="h2" color="white" weight="bold">
                  {(name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Icon name="camera" size={14} color={theme.colors.white} />
            </View>
            <Text variant="caption" color="primary.500" style={styles.changePhotoText}>
              Change Photo
            </Text>
          </TouchableOpacity>

          {/* Fields */}
          <View style={styles.fields}>
            <Field
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              maxLength={FIELD_MAX.name}
              autoCapitalize="words"
            />
            <Field
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself"
              maxLength={FIELD_MAX.bio}
              multiline
              numberOfLines={3}
            />
            <Field
              label="Location"
              value={location}
              onChangeText={setLocation}
              placeholder="City, State"
              maxLength={FIELD_MAX.location}
              autoCapitalize="words"
            />
            <Field
              label="Website"
              value={website}
              onChangeText={setWebsite}
              placeholder="https://yourwebsite.com"
              maxLength={FIELD_MAX.website}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Field component ─────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  keyboardType?: 'default' | 'email-address' | 'url';
  prefix?: string;
}

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  multiline,
  numberOfLines,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  keyboardType = 'default',
  prefix,
}: FieldProps) => (
  <View style={fieldStyles.wrap}>
    <Text variant="label" weight="semibold" style={fieldStyles.label}>
      {label}
    </Text>
    <View style={[fieldStyles.inputRow, multiline && fieldStyles.multilineRow]}>
      {prefix ? (
        <Text variant="body" style={fieldStyles.prefix}>{prefix}</Text>
      ) : null}
      <TextInput
        editable={true}
        style={[fieldStyles.input, multiline && fieldStyles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.gray[400]}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={numberOfLines}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
    {maxLength && value.length > maxLength * 0.8 ? (
      <Text
        variant="caption"
        style={[
          fieldStyles.counter,
          value.length >= maxLength && fieldStyles.counterOver,
        ]}
      >
        {value.length}/{maxLength}
      </Text>
    ) : null}
  </View>
);

const fieldStyles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.gray[50],
    paddingHorizontal: theme.spacing.md,
  },
  multilineRow: {
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.sm,
  },
  prefix: {
    color: theme.colors.gray[500],
    marginRight: 2,
  },
  input: {
    flex: 1,
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[900],
    paddingVertical: theme.spacing.sm,
  },
  multilineInput: {
    minHeight: 72,
  },
  counter: {
    color: theme.colors.gray[400],
    fontSize: theme.fontSize.xs,
    textAlign: 'right',
    marginTop: 4,
  },
  counterOver: {
    color: theme.colors.error[500],
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  headerBtn: {
    minWidth: 44,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.gray[900],
  },
  saveBtn: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  saveBtnText: {
    color: theme.colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['3xl'],
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: theme.spacing.xl + 26,
    right: '50%',
    marginRight: -52,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  changePhotoText: {
    marginTop: theme.spacing.sm,
  },
  fields: {
    // just a grouping view
  },
});

export default EditProfileScreen;
