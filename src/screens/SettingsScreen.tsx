import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '../components/ui';
import { theme } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';

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

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  const handleSave = () => {
    console.log('Settings saved:', { notifications, darkMode, analytics });
    navigation.goBack();
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

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text variant="h4" style={styles.sectionTitle}>
            Privacy
          </Text>
          <SettingItem
            title="Analytics"
            description="Help improve the app by sharing usage data"
            value={analytics}
            onValueChange={setAnalytics}
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
          >
            Cancel
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
