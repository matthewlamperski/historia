import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '../components/ui';
import { theme } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { RootStackScreenProps } from '../types';
import { useAuth } from '../hooks';
import Icon from 'react-native-vector-icons/FontAwesome6';

const SettingItem: React.FC<{
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}> = ({ title, description, value, onValueChange }) => (
  <View style={styles.settingItem}>
    <View style={styles.settingContent}>
      <Text variant="body" weight="medium">
        {title}
      </Text>
      {description && (
        <Text
          variant="caption"
          color="gray.600"
          style={styles.settingDescription}
        >
          {description}
        </Text>
      )}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{
        false: theme.colors.gray[300],
        true: theme.colors.primary[500],
      }}
      thumbColor={theme.colors.white}
    />
  </View>
);

const NavigationItem: React.FC<{
  title: string;
  description?: string;
  onPress: () => void;
  icon?: string;
}> = ({ title, description, onPress, icon }) => (
  <TouchableOpacity style={styles.navigationItem} onPress={onPress}>
    <View style={styles.navigationItemLeft}>
      {icon && (
        <Icon
          name={icon}
          size={20}
          color={theme.colors.gray[600]}
          style={styles.navigationIcon}
        />
      )}
      <View style={styles.settingContent}>
        <Text variant="body" weight="medium">
          {title}
        </Text>
        {description && (
          <Text
            variant="caption"
            color="gray.600"
            style={styles.settingDescription}
          >
            {description}
          </Text>
        )}
      </View>
    </View>
    <Icon name="chevron-right" size={16} color={theme.colors.gray[400]} />
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const navigation =
    useNavigation<RootStackScreenProps<'Settings'>['navigation']>();
  const { signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  const handleSave = () => {
    console.log('Settings saved:', { notifications, darkMode, analytics });
    navigation.goBack();
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
          } catch (error) {
            console.error('Error signing out:', error);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text variant="h4" style={styles.sectionTitle}>
            Notifications
          </Text>
          <SettingItem
            title="Push Notifications"
            description="Receive notifications about updates and activity"
            value={notifications}
            onValueChange={setNotifications}
          />
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text variant="h4" style={styles.sectionTitle}>
            Appearance
          </Text>
          <SettingItem
            title="Dark Mode"
            description="Use dark theme for the app interface"
            value={darkMode}
            onValueChange={setDarkMode}
          />
        </View>

        {/* Privacy & Safety Section */}
        <View style={styles.section}>
          <Text variant="h4" style={styles.sectionTitle}>
            Privacy & Safety
          </Text>
          <SettingItem
            title="Analytics"
            description="Help improve the app by sharing usage data"
            value={analytics}
            onValueChange={setAnalytics}
          />
          <NavigationItem
            title="Blocked Users"
            description="Manage users you've blocked"
            icon="user-slash"
            onPress={() => navigation.navigate('BlockedUsers')}
          />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text variant="h4" style={styles.sectionTitle}>
            About
          </Text>
          <View style={styles.aboutItem}>
            <Text variant="body">Version</Text>
            <Text variant="caption" color="gray.600">
              1.0.0
            </Text>
          </View>
          <View style={styles.aboutItem}>
            <Text variant="body">Build</Text>
            <Text variant="caption" color="gray.600">
              001
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            variant="primary"
            fullWidth
            onPress={handleSave}
            style={styles.actionButton}
          >
            Save Settings
          </Button>
          <Button
            variant="outline"
            fullWidth
            onPress={() => navigation.goBack()}
            style={styles.actionButton}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            fullWidth
            onPress={handleSignOut}
          >
            Sign Out
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing['2xl'],
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  settingContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingDescription: {
    marginTop: theme.spacing.xs,
  },
  navigationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  navigationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navigationIcon: {
    marginRight: theme.spacing.md,
    width: 24,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  actions: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing['2xl'],
  },
  actionButton: {
    marginBottom: theme.spacing.md,
  },
});
