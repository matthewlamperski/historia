import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList, TabParamList } from '../types';
import { theme } from '../constants/theme';
import {
  useAuth,
  useSubscriptionPrompt,
  useHasUnreadMessages,
  useAnonymousHometown,
} from '../hooks';
import { navigationRef } from './navigationRef';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import MapTab from '../screens/MapTab';
import FeedTab from '../screens/FeedTab';
import MessagesTab from '../screens/MessagesTab';
import ProfileTab from '../screens/ProfileTab';
import ProfileView from '../screens/ProfileView';
import SettingsScreen from '../screens/SettingsScreen';
import { PostDetailScreen } from '../screens/PostDetailScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { BlockedUsersScreen } from '../screens/BlockedUsersScreen';
import { MutedUsersScreen } from '../screens/MutedUsersScreen';
import { BanScreen } from '../screens/BanScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { BookmarksScreen } from '../screens/BookmarksScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import OfflineMapsScreen from '../screens/OfflineMapsScreen';
import NewConversationScreen from '../screens/NewConversationScreen';
import NewGroupScreen from '../screens/NewGroupScreen';
import GroupInfoScreen from '../screens/GroupInfoScreen';
import ChooseHandleScreen from '../screens/auth/ChooseHandleScreen';
import SetHometownScreen from '../screens/SetHometownScreen';
import NearbyUsersScreen from '../screens/NearbyUsersScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import LandmarkDetailScreen from '../screens/LandmarkDetailScreen';
import AskBedeScreen from '../screens/AskBedeScreen';
import LevelsScreen from '../screens/LevelsScreen';
import FAQScreen from '../screens/FAQScreen';
import FollowListScreen from '../screens/FollowListScreen';
import CompanionsListScreen from '../screens/CompanionsListScreen';
import { AuthNavigator } from './AuthNavigator';
import { useModeration } from '../hooks';
import { useAuthStore } from '../store/authStore';

import { FontAwesome6 } from "@react-native-vector-icons/fontawesome6";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Wraps the AuthNavigator when it is presented as a modal so that a
// successful sign-in / sign-up dismisses the modal automatically.
const AuthModalScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [isAuthenticated, navigation]);

  return <AuthNavigator />;
};

// Rendered inside TabNavigator so it has NavigationContainer context
const SubscriptionPromptHandler = () => {
  const { shouldPrompt, checked, markShown } = useSubscriptionPrompt();
  const { isPremium } = useSubscriptionStore();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    // Don't pitch premium to anonymous users — they need to sign up first.
    if (!isAuthenticated) return;
    if (checked && shouldPrompt && !isPremium) {
      markShown();
      navigation.navigate('Subscription');
    }
  }, [checked, shouldPrompt, isPremium, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

// Deep linking configuration.
// Universal Links (iOS) + App Links (Android) → these HTTPS paths are claimed
// by the app via the native config (entitlements + AndroidManifest intent-filter)
// and the AASA / assetlinks.json files served on historia.app.
const linking = {
  prefixes: ['historia://', 'https://historia.app'],
  config: {
    screens: {
      LandmarkDetail: 'landmark/:landmarkId',
      AskBede: 'landmark/:landmarkId/ask',
    },
  },
};

const TabNavigator = () => {
  const currentUserId = useAuthStore(state => state.user?.id) ?? null;
  const hasUnreadMessages = useHasUnreadMessages(currentUserId);

  return (
    <>
    <SubscriptionPromptHandler />
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
            <View>
              <FontAwesome6 name="comment" size={24} color={color} iconStyle={focused ? "solid" : "regular"} />
              {hasUnreadMessages && <View style={styles.unreadDot} />}
            </View>
          )
        }}
      />
      <Tab.Screen
        name="Shop"
        component={MessagesTab /* never rendered */}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            Linking.openURL('https://shophistoria.com/');
          },
        }}
        options={{
          tabBarLabel: 'Shop',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="bag-shopping" size={24} color={color} iconStyle="solid" />
          ),
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
    </>
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
        headerBackTitle: '',
      }}
    >
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false, title: '' }}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ title: 'Post' }}
      />
      <Stack.Screen
        name="ProfileView"
        component={ProfileView}
        options={{ title: '' }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{ title: '' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{}}
      />
      <Stack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={{ title: 'Blocked Users' }}
      />
      <Stack.Screen
        name="MutedUsers"
        component={MutedUsersScreen}
        options={{ title: 'Muted Users' }}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ presentation: 'modal', title: 'Upgrade to Premium' }}
      />
      <Stack.Screen
        name="Bookmarks"
        component={BookmarksScreen}
        options={{ title: 'Saved Landmarks' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="OfflineMaps"
        component={OfflineMapsScreen}
        options={{ title: 'Offline Maps' }}
      />
      <Stack.Screen
        name="NewConversation"
        component={NewConversationScreen}
        options={{ title: 'New Message' }}
      />
      <Stack.Screen
        name="NewGroup"
        component={NewGroupScreen}
        options={{ title: 'Add People' }}
      />
      <Stack.Screen
        name="GroupInfo"
        component={GroupInfoScreen}
        options={{ title: 'Group Info' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="Levels"
        component={LevelsScreen}
        options={{ title: 'Levels & Rewards' }}
      />
      <Stack.Screen
        name="FAQ"
        component={FAQScreen}
        options={{ title: 'FAQ' }}
      />
      <Stack.Screen
        name="FollowList"
        component={FollowListScreen}
        options={{ title: '' }}
      />
      <Stack.Screen
        name="CompanionsList"
        component={CompanionsListScreen}
        options={{ title: 'Companions' }}
      />
      <Stack.Screen
        name="SetHometown"
        component={SetHometownScreen}
        options={{ title: 'Set Your Hometown' }}
      />
      <Stack.Screen
        name="NearbyUsers"
        component={NearbyUsersScreen}
        options={{ title: 'Nearby Users' }}
      />
      <Stack.Screen
        name="LandmarkDetail"
        component={LandmarkDetailScreen}
        options={{ presentation: 'modal', title: 'Landmark' }}
      />
      <Stack.Screen
        name="AskBede"
        component={AskBedeScreen}
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="Auth"
        component={AuthModalScreen}
        options={{ presentation: 'modal', headerShown: false }}
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
  const { user } = useAuthStore();
  const { hometown: anonHometown, loaded: anonHometownLoaded } = useAnonymousHometown();

  // Show loading screen while we resolve auth state and AsyncStorage
  if (!isInitialized || !anonHometownLoaded) {
    return (
      <NavigationContainer ref={navigationRef} linking={linking}>
        <LoadingScreen />
      </NavigationContainer>
    );
  }

  // Show ban screen if user is banned
  if (isAuthenticated && isCurrentUserBanned) {
    return (
      <NavigationContainer ref={navigationRef} linking={linking}>
        <BanScreen />
      </NavigationContainer>
    );
  }

  // Force handle selection for authenticated users who don't have one yet
  if (isAuthenticated && user && !user.username) {
    return <ChooseHandleScreen />;
  }

  // Hometown gate. Required for everyone — authenticated or anonymous.
  // For signed-in users we look at the Firestore profile; for anonymous
  // users we look at AsyncStorage. The migration in useAuth seeds Firestore
  // from the anon copy at signup, so most signed-in users won't hit this.
  const effectiveHometown = user?.hometown ?? anonHometown;
  if (!effectiveHometown) {
    return <SetHometownScreen />;
  }

  // Main app — anonymous users land here too. Auth-gated routes/actions
  // open the Auth modal via useRequireAuth.
  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <MainStackNavigator />
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
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2f80ed',
    borderWidth: 1.5,
    borderColor: theme.colors.white,
  },
});
