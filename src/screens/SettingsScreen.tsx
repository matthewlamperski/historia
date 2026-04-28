import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/ui';
import { theme } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { RootStackScreenProps } from '../types';
import { useAuth } from '../hooks';
import { useAuthStore } from '../store/authStore';
import Icon from 'react-native-vector-icons/FontAwesome6';
import messaging from '@react-native-firebase/messaging';

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <Text style={styles.sectionLabel}>{label}</Text>
);

const RowNavItem: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
  first?: boolean;
  last?: boolean;
}> = ({ icon, label, onPress, first, last }) => (
  <TouchableOpacity
    style={[styles.row, first && styles.rowFirst, last && styles.rowLast]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.rowIconWrap}>
      <Icon name={icon} size={16} color={theme.colors.primary[600]} />
    </View>
    <Text style={styles.rowLabel}>{label}</Text>
    <Icon name="chevron-right" size={13} color={theme.colors.gray[400]} />
  </TouchableOpacity>
);

const RowToggle: React.FC<{
  icon: string;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  first?: boolean;
  last?: boolean;
}> = ({ icon, label, value, onValueChange, first, last }) => (
  <View style={[styles.row, first && styles.rowFirst, last && styles.rowLast]}>
    <View style={styles.rowIconWrap}>
      <Icon name={icon} size={16} color={theme.colors.primary[600]} />
    </View>
    <Text style={styles.rowLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary[500] }}
      thumbColor={theme.colors.white}
    />
  </View>
);

const RowInfoItem: React.FC<{
  label: string;
  value: string;
  first?: boolean;
  last?: boolean;
}> = ({ label, value, first, last }) => (
  <View style={[styles.row, first && styles.rowFirst, last && styles.rowLast]}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const RowDivider = () => <View style={styles.rowDivider} />;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const navigation = useNavigation<RootStackScreenProps<'Settings'>['navigation']>();
  const { signOut } = useAuth();
  const { user } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase()
    : '?';

  const handleNotificationsToggle = async (enabled: boolean) => {
    if (enabled) {
      const authStatus = await messaging().requestPermission();
      const granted =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      setNotificationsEnabled(granted);
    } else {
      // iOS doesn't allow revoking permission programmatically — open Settings
      setNotificationsEnabled(false);
      Alert.alert(
        'Disable Notifications',
        'To turn off notifications, go to Settings > Notifications > Historia.',
        [
          { text: 'Later', style: 'cancel', onPress: () => setNotificationsEnabled(true) },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            // Reset to the Map tab so the user lands somewhere sensible
            // instead of staying on Settings (which is now backed by a
            // signed-out Profile tab).
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main', state: { routes: [{ name: 'Map' }] } }],
            });
          } catch (error) {
            console.error('Error signing out:', error);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name ?? 'Unknown'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>

        {/* Account */}
        <SectionLabel label="ACCOUNT" />
        <View style={styles.card}>
          <RowNavItem
            icon="user-pen"
            label="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
            first
            last
          />
        </View>

        {/* Privacy */}
        <SectionLabel label="PRIVACY" />
        <View style={styles.card}>
          <RowNavItem
            icon="user-slash"
            label="Blocked Users"
            onPress={() => navigation.navigate('BlockedUsers')}
            first
          />
          <RowDivider />
          <RowNavItem
            icon="volume-xmark"
            label="Muted Users"
            onPress={() => navigation.navigate('MutedUsers')}
            last
          />
        </View>

        {/* Notifications */}
        <SectionLabel label="NOTIFICATIONS" />
        <View style={styles.card}>
          <RowToggle
            icon="bell"
            label="Push Notifications"
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
            first
            last
          />
        </View>

        {/* About */}
        <SectionLabel label="ABOUT" />
        <View style={styles.card}>
          <RowNavItem
            icon="circle-question"
            label="FAQ"
            onPress={() => navigation.navigate('FAQ')}
            first
          />
          <RowDivider />
          <RowInfoItem label="Version" value="1.0.0" />
          <RowDivider />
          <RowInfoItem label="Build" value="001" last />
        </View>

        {/* Sign Out */}
        <View style={[styles.card, styles.signOutCard]}>
          <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut} activeOpacity={0.7}>
            <Icon name="arrow-right-from-bracket" size={16} color={theme.colors.error[500]} />
            <Text style={styles.signOutLabel}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[100],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['3xl'],
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarInitials: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
  },
  sectionLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[500],
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 52,
  },
  rowFirst: {},
  rowLast: {},
  rowIconWrap: {
    width: 28,
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  rowLabel: {
    flex: 1,
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[900],
  },
  rowValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.gray[100],
    marginLeft: theme.spacing.lg + 28 + theme.spacing.md,
  },
  signOutCard: {
    marginTop: theme.spacing.sm,
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
    minHeight: 52,
  },
  signOutLabel: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.error[500],
  },
});
