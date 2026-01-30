# 📚 Historia Development Guide

## 🚀 Added Packages & Technologies

### Core Framework Enhancements

- **React Native 0.82.1** - Latest stable version with New Architecture enabled
- **React 19.1.1** - Latest React with concurrent features
- **TypeScript** - Full type safety throughout the app

### Navigation & Routing

- **React Navigation 6** - Complete navigation solution
  - `@react-navigation/native` - Core navigation library
  - `@react-navigation/bottom-tabs` - Tab-based navigation
  - `@react-navigation/native-stack` - Stack navigation with native performance
  - `@react-navigation/drawer` - Drawer navigation (ready for use)
- **Deep Linking** - Configured for `historia://` and `https://historia.app` schemes

### Animation & Gestures

- **React Native Reanimated 3.8.1** - High-performance animations using UI thread
- **React Native Gesture Handler** - Declarative API for gesture handling
- **Custom animated components** - Button with press animations, Toast transitions

### UI & Design System

- **NativeWind** - Tailwind CSS for React Native (utility-first styling)
- **Tailwind CSS** - Utility-first CSS framework configured for React Native
- **Custom Component Library** - Consistent, reusable UI components:
  - `Button` - Multiple variants (primary, secondary, outline, ghost, destructive)
  - `Text` - Typography system with variants (h1-h4, body, caption, label)
  - `Input` - Form inputs with validation states and icons
  - `Toast` - Animated toast notifications
- **Theme System** - Comprehensive design tokens for colors, spacing, typography
- **React Native Vector Icons** - Icon library
- **React Native SVG** - SVG support for icons and graphics

### State Management

- **Zustand** - Simple, lightweight state management
- **AsyncStorage** - Persistent local storage

### Forms & Validation

- **React Hook Form** - Performant forms with easy validation
- **Zod** - TypeScript-first schema validation
- **@hookform/resolvers** - Validation resolvers for React Hook Form

### Development Tools

- **ESLint** - Code linting with React Native configuration
- **Prettier** - Code formatting
- **TypeScript** - Static type checking
- **Metro** - React Native bundler with optimized configuration

## 🏗️ Project Structure

```
src/
├── components/           # Reusable components
│   ├── ui/              # Base UI components (Button, Text, Input, Toast)
│   │   ├── Button.tsx   # Animated button component with variants
│   │   ├── Text.tsx     # Typography component with theme integration
│   │   ├── Input.tsx    # Form input with validation states
│   │   ├── Toast.tsx    # Animated toast notifications
│   │   └── index.ts     # Component exports
│   └── forms/           # Form-specific components (ready for expansion)
├── screens/             # Screen components
│   ├── HomeScreen.tsx   # Main landing screen
│   ├── SearchScreen.tsx # Search functionality with examples
│   ├── FavoritesScreen.tsx # Favorites management
│   ├── ProfileScreen.tsx   # User profile screen
│   └── SettingsScreen.tsx  # App settings
├── navigation/          # Navigation configuration
│   └── RootNavigator.tsx   # Main navigation setup with tabs & stack
├── hooks/              # Custom React hooks
│   ├── useToast.ts     # Toast notification management
│   ├── useDebounce.ts  # Debounce hook for performance
│   └── index.ts        # Hook exports
├── store/              # Global state management (Zustand)
│   ├── authStore.ts    # Authentication state
│   └── index.ts        # Store exports
├── services/           # API and external services
│   ├── apiService.ts   # HTTP client with error handling
│   └── index.ts        # Service exports
├── utils/              # Utility functions
│   ├── formatters.ts   # Date, number, currency formatters
│   ├── validators.ts   # Validation utilities (email, password, etc.)
│   └── index.ts        # Utility exports
├── types/              # TypeScript type definitions
│   └── index.ts        # Global types and interfaces
├── constants/          # App constants and configuration
│   └── theme.ts        # Design system tokens
```

## 🎨 Design System

### Color Palette

- **Primary**: Blue scale (50-900) for main actions and branding
- **Secondary**: Gray scale (50-900) for neutral elements
- **Success**: Green scale for positive states and success messages
- **Warning**: Yellow scale for warning states and cautions
- **Error**: Red scale for error states and destructive actions

### Typography System

- **Variants**: h1, h2, h3, h4, body, caption, label
- **Weights**: light (300), normal (400), medium (500), semibold (600), bold (700), extrabold (800)
- **Responsive sizing**: xs (12px) to 5xl (48px)

### Spacing Scale

- **xs**: 4px - Small gaps, margins
- **sm**: 8px - Compact spacing
- **md**: 16px - Default spacing
- **lg**: 24px - Comfortable spacing
- **xl**: 32px - Large spacing
- **2xl**: 48px - Extra large spacing
- **3xl**: 64px - Maximum spacing

### Component Design

All components follow a consistent API:

- Type-safe props with TypeScript interfaces
- Consistent styling with theme integration
- Accessible by default (accessibility props included)
- Customizable through style props and variants
- Consistent naming conventions

## 🧩 Custom Components Usage

### Button Component

```tsx
import { Button } from '../components/ui';

// Basic usage
<Button onPress={handlePress}>Click Me</Button>

// With variants and sizes
<Button variant="primary" size="lg" loading={isLoading}>
  Submit Form
</Button>

// With icons and full width
<Button
  variant="outline"
  fullWidth
  leftIcon={<Icon name="heart" />}
  rightIcon={<Icon name="arrow-right" />}
>
  Save to Favorites
</Button>

// Disabled state
<Button variant="destructive" disabled>
  Delete Account
</Button>
```

### Text Component

```tsx
import { Text } from '../components/ui';

// Typography hierarchy
<Text variant="h1">Main Page Title</Text>
<Text variant="h2">Section Heading</Text>
<Text variant="body">Regular paragraph text content</Text>
<Text variant="caption" color="gray.600">Small helper text</Text>

// Custom styling
<Text variant="body" color="primary.500" weight="bold" size="lg">
  Emphasized content
</Text>
```

### Input Component

```tsx
import { Input } from '../components/ui';

// Basic input
<Input
  placeholder="Enter your name"
  value={name}
  onChangeText={setName}
  label="Full Name"
/>

// Password input with toggle
<Input
  label="Password"
  placeholder="Enter secure password"
  secureTextEntry
  showPasswordToggle
  errorText={formErrors.password}
  helperText="Must be at least 8 characters"
/>

// Input with icons and validation
<Input
  label="Email Address"
  placeholder="your@email.com"
  value={email}
  onChangeText={setEmail}
  leftIcon={<Icon name="mail" />}
  errorText={errors.email}
  variant="outline"
/>
```

### Toast Notifications

```tsx
import { useToast } from '../hooks';

const MyComponent = () => {
  const { showToast, hideToast } = useToast();

  const handleSuccess = () => {
    showToast('Operation completed successfully!', 'success');
  };

  const handleError = () => {
    showToast('Something went wrong. Please try again.', 'error');
  };

  const handleWarning = () => {
    showToast('Please check your internet connection.', 'warning');
  };

  const handleInfo = () => {
    showToast('New features are now available!', 'info');
  };

  // Manual hide (toasts auto-hide after 3 seconds by default)
  const handleManualHide = () => {
    hideToast();
  };
};
```

## 🔧 State Management with Zustand

### Authentication Store Example

```tsx
import { useAuthStore } from '../store';

const LoginScreen = () => {
  const { user, login, logout, isAuthenticated, isLoading } = useAuthStore();

  const handleLogin = async credentials => {
    // Login method handles the API call and state update
    await login(userData);

    // Navigate to authenticated area
    if (isAuthenticated) {
      navigation.navigate('Main');
    }
  };

  const handleLogout = () => {
    logout();
    navigation.navigate('Login');
  };

  // Check loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Access user data
  return (
    <View>
      {isAuthenticated ? (
        <Text>Welcome back, {user?.name}!</Text>
      ) : (
        <LoginForm onSubmit={handleLogin} />
      )}
    </View>
  );
};
```

### Creating New Stores

```tsx
import { create } from 'zustand';

interface AppSettingsState {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: string) => void;
  toggleNotifications: () => void;
}

export const useAppSettingsStore = create<AppSettingsState>(set => ({
  theme: 'light',
  language: 'en',
  notifications: true,

  setTheme: theme => set({ theme }),
  setLanguage: language => set({ language }),
  toggleNotifications: () =>
    set(state => ({ notifications: !state.notifications })),
}));
```

## 🌐 API Integration

### Using the API Service

```tsx
import { apiService } from '../services';
import { User, ApiResponse } from '../types';

const UserService = {
  // GET request with type safety
  getUsers: async (): Promise<User[]> => {
    const response = await apiService.get<User[]>('/users');
    return response.data;
  },

  // POST request with data
  createUser: async (userData: Partial<User>): Promise<User> => {
    const response = await apiService.post<User>('/users', userData);
    return response.data;
  },

  // PUT request for updates
  updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
    const response = await apiService.put<User>(`/users/${id}`, updates);
    return response.data;
  },

  // DELETE request
  deleteUser: async (id: string): Promise<void> => {
    await apiService.delete(`/users/${id}`);
  },
};

// Using in components with error handling
const UserProfile = ({ userId }: { userId: string }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const userData = await UserService.getUser(userId);
        setUser(userData);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!user) return <Text>User not found</Text>;

  return (
    <View>
      <Text variant="h2">{user.name}</Text>
      <Text variant="body">{user.email}</Text>
    </View>
  );
};
```

## 🎯 Navigation System

### Navigation Structure

The app uses a hybrid navigation approach:

- **Tab Navigation**: Main app sections (Home, Search, Favorites, Profile)
- **Stack Navigation**: Modal screens and detailed views (Settings)
- **Deep Linking**: Support for external app links and URL schemes
- **Type Safety**: Complete TypeScript support for navigation parameters

### Navigation Usage Examples

```tsx
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps, TabScreenProps } from '../types';

// Stack navigation
const HomeScreen = ({ navigation }: TabScreenProps<'Home'>) => {
  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  return <Button onPress={handleSettingsPress}>Open Settings</Button>;
};

// Using navigation hook
const ProfileActions = () => {
  const navigation = useNavigation();

  const navigateToEdit = () => {
    // Navigate with parameters (type-safe)
    navigation.navigate('Profile', { userId: '123' });
  };

  const goBack = () => {
    navigation.goBack();
  };

  return (
    <View>
      <Button onPress={navigateToEdit}>Edit Profile</Button>
      <Button variant="outline" onPress={goBack}>
        Go Back
      </Button>
    </View>
  );
};
```

### Deep Linking Configuration

```tsx
// Current configuration supports:
// - historia://home (opens home tab)
// - historia://search (opens search tab)
// - historia://favorites (opens favorites tab)
// - historia://profile (opens profile tab)
// - historia://settings (opens settings screen)
// - https://historia.app/home (web links)

// To test deep linking in development:
// iOS: xcrun simctl openurl booted "historia://home"
// Android: adb shell am start -W -a android.intent.action.VIEW -d "historia://home" com.historia
```

## 🎨 Styling Approaches

### NativeWind (Tailwind CSS)

```tsx
import { View, Text } from 'react-native';

const StyledComponent = () => (
  <View className="flex-1 bg-white p-4 justify-center items-center">
    <Text className="text-2xl font-bold text-gray-900 mb-4">
      Welcome to Historia
    </Text>
    <Text className="text-base text-gray-600 text-center leading-6">
      This text is styled using Tailwind CSS classes
    </Text>
  </View>
);
```

### Theme System Integration

```tsx
import { StyleSheet, View } from 'react-native';
import { theme } from '../constants/theme';

const ThemedComponent = () => (
  <View style={styles.container}>{/* Component content */}</View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
  },
  text: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.gray[900],
    fontWeight: theme.fontWeight.semibold,
  },
  button: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.md,
  },
});
```

## 📱 Platform-Specific Considerations

### iOS Setup Complete

- ✅ CocoaPods dependencies installed
- ✅ New Architecture (Fabric) enabled
- ✅ Safe area handling configured
- ✅ Reanimated worklets configured
- ✅ Gesture handler set up

### Android Setup Ready

- ✅ Gradle configuration optimized
- ✅ Proguard rules in place
- ✅ Vector drawable support
- ✅ Safe area handling configured

## 🚀 Development Workflow

### Running the App

```bash
# Install dependencies (run once or after adding new packages)
npm install

# iOS setup (run once or after updating native dependencies)
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator/device
npm run android

# Run tests
npm test

# Lint code
npm run lint
```

### Adding New Features

1. **Create Types** (if needed):

   ```tsx
   // src/types/index.ts
   export interface NewFeature {
     id: string;
     name: string;
     description: string;
   }
   ```

2. **Create API Service** (if needed):

   ```tsx
   // src/services/newFeatureService.ts
   import { apiService } from './apiService';
   import { NewFeature } from '../types';

   export const newFeatureService = {
     getAll: () => apiService.get<NewFeature[]>('/features'),
     create: (data: Partial<NewFeature>) =>
       apiService.post<NewFeature>('/features', data),
   };
   ```

3. **Create Store** (if needed):

   ```tsx
   // src/store/newFeatureStore.ts
   import { create } from 'zustand';
   import { NewFeature } from '../types';

   interface NewFeatureState {
     features: NewFeature[];
     addFeature: (feature: NewFeature) => void;
   }

   export const useNewFeatureStore = create<NewFeatureState>(set => ({
     features: [],
     addFeature: feature =>
       set(state => ({ features: [...state.features, feature] })),
   }));
   ```

4. **Create Screen Component**:

   ```tsx
   // src/screens/NewFeatureScreen.tsx
   import React from 'react';
   import { View } from 'react-native';
   import { Text, Button } from '../components/ui';
   import { useNewFeatureStore } from '../store';

   export default function NewFeatureScreen() {
     const { features, addFeature } = useNewFeatureStore();

     return (
       <View style={{ flex: 1, padding: 16 }}>
         <Text variant="h2">New Feature</Text>
         {/* Feature implementation */}
       </View>
     );
   }
   ```

5. **Add to Navigation**:
   ```tsx
   // Add to navigation types and navigator component
   ```

## 🔧 Customization Guide

### Extending the Theme

```tsx
// src/constants/theme.ts
export const theme = {
  // Add new color scales
  colors: {
    // ... existing colors
    brand: {
      50: '#f0f9ff',
      // ... your brand colors
      900: '#1e3a8a',
    },
  },
  // Add new spacing values
  spacing: {
    // ... existing spacing
    '4xl': 80,
    '5xl': 96,
  },
  // Add new border radius values
  borderRadius: {
    // ... existing values
    '4xl': 32,
  },
};
```

### Creating New UI Components

```tsx
// src/components/ui/Card.tsx
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { theme } from '../../constants/theme';
import { BaseComponentProps } from '../../types';

interface CardProps extends BaseComponentProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: keyof typeof theme.spacing;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  style,
  ...props
}) => {
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: theme.colors.white,
          ...theme.shadows.md,
        };
      case 'outlined':
        return {
          backgroundColor: theme.colors.white,
          borderWidth: 1,
          borderColor: theme.colors.gray[200],
        };
      default:
        return {
          backgroundColor: theme.colors.gray[50],
        };
    }
  };

  return (
    <View
      style={[
        {
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing[padding],
        },
        getVariantStyles(),
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};
```

## 🔮 Recommended Next Steps

### Immediate Enhancements

1. **Icon Migration**: Replace `react-native-vector-icons` with separate icon family packages
2. **Image Optimization**: Add `react-native-fast-image` for better image performance
3. **Form Components**: Build reusable form components with React Hook Form integration
4. **Loading States**: Create skeleton loaders and spinner components
5. **Error Boundaries**: Implement React error boundaries for better error handling

### Performance Optimizations

1. **List Optimization**: Implement `getItemLayout` and other FlatList optimizations
2. **Bundle Analysis**: Use Metro bundle analyzer to optimize bundle size
3. **Memory Management**: Add memory profiling and optimization
4. **Image Caching**: Implement intelligent image caching strategies

### Production Features

1. **Crash Reporting**: Integrate Crashlytics or Sentry
2. **Analytics**: Add Firebase Analytics or Amplitude
3. **Push Notifications**: Implement Firebase Cloud Messaging
4. **Biometric Authentication**: Add TouchID/FaceID support
5. **Offline Support**: Implement offline-first architecture with local database

### Developer Experience

1. **Storybook**: Add Storybook for component development
2. **Testing**: Implement comprehensive testing with React Native Testing Library
3. **E2E Testing**: Add Detox for end-to-end testing
4. **Code Generation**: Add templates for common component types
5. **Documentation**: Auto-generate component documentation

This comprehensive setup provides you with a solid, scalable foundation for building modern React Native applications. All the tools and patterns are in place for rapid development while maintaining code quality and consistency! 🎉
