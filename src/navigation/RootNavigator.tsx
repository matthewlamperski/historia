import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList, TabParamList } from '../types';
import { theme } from '../constants/theme';
import { useAuth } from '../hooks';

import MapTab from '../screens/MapTab';
import FeedTab from '../screens/FeedTab';
import MessagesTab from '../screens/MessagesTab';
import ProfileTab from '../screens/ProfileTab';
import ProfileView from '../screens/ProfileView';
import SettingsScreen from '../screens/SettingsScreen';
import { PostDetailScreen } from '../screens/PostDetailScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { BlockedUsersScreen } from '../screens/BlockedUsersScreen';
import { BanScreen } from '../screens/BanScreen';
import { AuthNavigator } from './AuthNavigator';
import { useModeration } from '../hooks';

import { FontAwesome6 } from "@react-native-vector-icons/fontawesome6";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Deep linking configuration
const linking = {
  prefixes: ['historia://', 'https://historia.app'],
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: theme.colors.gray[500],
        tabBarStyle: {
          backgroundColor: theme.colors.white,
          borderTopColor: theme.colors.gray[200],
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: theme.fontSize.xs,
          fontWeight: theme.fontWeight.medium,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapTab}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 name="map" size={24} color={color} iconStyle={focused ? "solid" : "regular"} />
          ),
        }}
      />
      <Tab.Screen
        name="Feed"
        component={FeedTab}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 name="newspaper" size={24} color={color} iconStyle={focused ? "solid" : "regular"} />
          )
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesTab}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 name="comment" size={24} color={color} iconStyle={focused ? "solid" : "regular"} />
          )
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileTab}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 name="user" size={24} color={color} iconStyle={focused ? "solid" : "regular"} />
          )
        }}
      />
    </Tab.Navigator>
  );
}

const MainStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.white,
        },
        headerTintColor: theme.colors.gray[900],
        headerTitleStyle: {
          fontWeight: theme.fontWeight.semibold,
          fontSize: theme.fontSize.lg,
        },
      }}
    >
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProfileView"
        component={ProfileView}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={theme.colors.primary[500]} />
  </View>
);

export const RootNavigator = () => {
  const { isAuthenticated, isInitialized } = useAuth();
  const { isCurrentUserBanned } = useModeration();

  // Show loading screen while checking auth state
  if (!isInitialized) {
    return (
      <NavigationContainer linking={linking}>
        <LoadingScreen />
      </NavigationContainer>
    );
  }

  // Show ban screen if user is banned
  if (isAuthenticated && isCurrentUserBanned) {
    return (
      <NavigationContainer linking={linking}>
        <BanScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {isAuthenticated ? <MainStackNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
});
