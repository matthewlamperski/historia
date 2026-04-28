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
import ImageCropPicker from 'react-native-image-crop-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../components/ui';
import { theme } from '../constants/theme';
import { RootStackScreenProps } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useAuthStore } from '../store/authStore';
import { userService, isRemoteAvatarUrl } from '../services/userService';
import { logClientError } from '../services/errorLogService';

const FIELD_MAX = { name: 60, bio: 160, location: 80, website: 120 };

export const EditProfileScreen = () => {
  const navigation = useNavigation<RootStackScreenProps<'EditProfile'>['navigation']>();
  const { user, updateUser } = useAuthStore();

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [website, setWebsite] = useState(user?.website ?? '');
  // Tracks the currently displayed avatar URI — may be a remote URL or a new local URI
  const [avatarUri, setAvatarUri] = useState(user?.avatar ?? '');
  // pendingLocalUri + pendingBase64 are set when user picks a new image; cleared after upload on save
  const [pendingLocalUri, setPendingLocalUri] = useState<string | null>(null);
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePickAvatar = useCallback(async () => {
    try {
      const image = await ImageCropPicker.openPicker({
        mediaType: 'photo',
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: true,
        includeBase64: true,
        compressImageQuality: 0.85,
        cropperToolbarTitle: 'Crop Profile Photo',
      });

      // path may or may not have file:// prefix — normalise for <Image>
      const uri = image.path.startsWith('file://') ? image.path : `file://${image.path}`;
      setAvatarUri(uri);
      setPendingLocalUri(uri);
      setPendingBase64(image.data ?? null);
    } catch (err: any) {
      // User cancelled — not an error
      if (err?.code === 'E_PICKER_CANCELLED') return;
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Could not open photo library. Please try again.');
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Required', 'Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      let resolvedAvatarUrl = user.avatar ?? '';

      // Upload new avatar to Storage if user picked one
      if (pendingLocalUri) {
        resolvedAvatarUrl = await userService.uploadAvatar(user.id, pendingLocalUri, pendingBase64);

        // Hard guarantee: never let a non-https URL flow into Firestore.
        // uploadAvatar already validates this internally, but a defense layer
        // here means a future regression in the service can't silently leak.
        if (!isRemoteAvatarUrl(resolvedAvatarUrl)) {
          await logClientError({
            code: 'avatar.save.nonHttpsAfterUpload',
            message: 'uploadAvatar returned a non-https URL — aborting save.',
            userId: user.id,
            context: {
              returned: String(resolvedAvatarUrl).slice(0, 200),
              hadBase64: !!pendingBase64,
            },
          });
          throw new Error('Avatar upload finished but the result was invalid.');
        }
      }

      const updates = {
        name: trimmedName,
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        ...(resolvedAvatarUrl !== user.avatar ? { avatar: resolvedAvatarUrl } : {}),
      };

      await userService.updateUserProfile(user.id, updates);
      updateUser(updates);
      setPendingLocalUri(null);
      setPendingBase64(null);
      navigation.goBack();
    } catch (error) {
      console.error('Error saving profile:', error);
      logClientError({
        code: 'profile.save.failed',
        message: 'EditProfileScreen handleSave threw.',
        cause: error,
        userId: user.id,
        context: {
          hadPendingAvatar: !!pendingLocalUri,
          hadPendingBase64: !!pendingBase64,
          nameLength: trimmedName.length,
        },
      });

      // Surface the actual error so the user knows what happened. Falls back
      // to a generic message only if the thrown value has no readable text.
      const detail = (() => {
        if (error instanceof Error && error.message) return error.message;
        if (typeof error === 'string' && error) return error;
        if (error && typeof error === 'object') {
          const code = (error as { code?: string }).code;
          if (code) return `Error code: ${code}`;
        }
        return 'Failed to save profile. Please try again.';
      })();

      Alert.alert('Could not save profile', detail);
    } finally {
      setSaving(false);
    }
  }, [user, name, bio, location, website, pendingLocalUri, pendingBase64, updateUser, navigation]);

  useEffect(() => {
    navigation.setOptions({
      title: 'Edit Profile',
      headerRight: () =>
        saving ? (
          <ActivityIndicator size="small" color={theme.colors.primary[500]} style={{ marginRight: 4 }} />
        ) : (
          <TouchableOpacity onPress={handleSave} disabled={saving} style={{ marginRight: 4 }}>
            <Text variant="label" weight="semibold" style={{ color: theme.colors.primary[500] }}>
              Save
            </Text>
          </TouchableOpacity>
        ),
    });
  }, [saving, handleSave, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
          <TouchableOpacity style={styles.avatarSection} onPress={handlePickAvatar} disabled={saving}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatar}
                onError={() => setAvatarUri('')}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="user" size={40} color={theme.colors.white} />
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Icon name="camera" size={14} color={theme.colors.white} />
            </View>
            <Text variant="caption" color="primary.500" style={styles.changePhotoText}>
              Change Photo
            </Text>
          </TouchableOpacity>

          {/* Handle (locked) */}
          {user?.username ? (
            <View style={styles.fields}>
              <View style={handleStyles.wrap}>
                <Text variant="label" weight="semibold" style={handleStyles.label}>
                  Handle
                </Text>
                <View style={handleStyles.row}>
                  <Text variant="body" style={handleStyles.value}>
                    @{user.username}
                  </Text>
                  <Icon name="lock" size={14} color={theme.colors.gray[400]} />
                </View>
                <Text variant="caption" color="gray.400" style={handleStyles.note}>
                  Handles cannot be changed
                </Text>
              </View>
            </View>
          ) : null}

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

const handleStyles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.gray[100],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  value: {
    color: theme.colors.gray[600],
  },
  note: {
    marginTop: 4,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
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
