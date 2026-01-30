# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Historia is a location-based social media app built with React Native 0.82.1. The app combines a map interface showing historical landmarks with a social feed where users can share posts with images and comments. It uses Firebase for backend services (Firestore, Storage, Auth) and implements a modern design system with NativeWind (Tailwind CSS for React Native).

## Development Commands

### Running the App

```bash
# Start Metro bundler
npm start

# Run on iOS (requires macOS)
npm run ios

# Run on Android
npm run android

# Clean and rebuild iOS (if pods need updating)
cd ios && pod install && cd ..
npm run ios
```

### Testing & Quality

```bash
# Run tests
npm test

# Run linter
npm run lint
```

### iOS-Specific Commands

```bash
# Install Ruby dependencies (first time setup)
bundle install

# Install CocoaPods dependencies (required after adding native dependencies)
cd ios && bundle exec pod install && cd ..
```

## Architecture Overview

### Navigation Structure

The app uses a **hybrid navigation pattern**:

- **Root Stack Navigator** (`RootNavigator`) wraps the entire app
- **Tab Navigator** provides 4 main tabs: Map, Feed, Messages, Profile
- **Modal Screens** (Settings, PostDetail, ProfileView) sit above tabs in the stack

Navigation is fully typed with TypeScript via `RootStackParamList` and `TabParamList` types.

Deep linking is configured for `historia://` and `https://historia.app` schemes.

### State Management

**Zustand** is used for global state (see `src/store/`). Currently implements:
- `authStore.ts` - Mock authentication state (needs real Firebase Auth integration)

Use `AsyncStorage` for persistence when needed.

### Firebase Integration

Firebase services are initialized in `src/services/firebaseConfig.ts`. The app uses:

- **Firestore** - Post and comment storage (`postsService.ts`)
- **Storage** - Image uploads
- **Auth** - Not yet integrated (currently using mock user system)

**Important**: Firebase config object is empty in code. Configuration happens via:
- iOS: `ios/GoogleService-Info.plist`
- Android: `android/app/google-services.json`

See `FIREBASE_SETUP.md` for complete setup instructions.

### Component Architecture

**UI Components** (`src/components/ui/`):
- Custom design system with variants (Button, Text, Input, Toast)
- Social components (Post, Comment, CommentsModal, CreatePostModal)
- All components use theme tokens from `src/constants/theme.ts`

**Screens** (`src/screens/`):
- Tab screens: MapTab, FeedTab, MessagesTab, ProfileTab
- Modal screens: SettingsScreen, PostDetailScreen, ProfileView

**Custom Hooks** (`src/hooks/`):
- `usePosts` - Post CRUD, infinite scroll, pull-to-refresh, likes
- `useComments` - Comment CRUD and likes
- `useImagePicker` - Multi-image selection and Firebase upload
- `useToast` - Toast notification management
- `useDebounce` - Performance optimization for text inputs

### Styling System

The project uses **two styling approaches**:

1. **NativeWind (Tailwind CSS)** - Utility classes for quick styling
   - Configured in `tailwind.config.js`
   - Import via `global.css` in App.tsx
   - Use className prop: `<View className="flex-1 p-4 bg-white">`

2. **Theme System** - Design tokens in `src/constants/theme.ts`
   - Use for custom components and StyleSheet
   - Access via: `theme.colors.primary[500]`, `theme.spacing.lg`

**Design tokens include**:
- Color scales: primary, secondary, success, warning, error (50-900)
- Typography: fontSize, fontWeight, variants (h1-h4, body, caption, label)
- Spacing: xs(4) to 3xl(64)
- Border radius, shadows

### TypeScript Patterns

All types are centralized in `src/types/index.ts`:
- Navigation types: `RootStackParamList`, `TabParamList`, screen props
- Data models: `User`, `Post`, `Comment`, `Landmark`
- Component props: `ButtonVariant`, `TextVariant`, `InputVariant`, `ToastType`
- API types: `ApiResponse`, `ApiError`

The codebase is fully typed with strict TypeScript.

## Key Implementation Details

### Image Uploads

Images go through this flow:
1. `useImagePicker` hook handles selection from camera/library
2. Images are uploaded to Firebase Storage (`uploads/${userId}/${timestamp}`)
3. Download URLs are stored in Firestore post documents
4. Posts support multiple images with carousel UI

### Post Feed

The `usePosts` hook implements:
- **Infinite scroll** with `lastVisible` cursor for pagination
- **Pull-to-refresh** with React Native RefreshControl
- **Optimistic updates** for likes (instant UI feedback)
- **Location filtering** (infrastructure ready, needs geolocation implementation)

Posts are ordered by `createdAt` timestamp descending.

### Comments System

Comments are stored in a `comments` subcollection under each post document. The `useComments` hook:
- Loads all comments for a post
- Supports comment likes with optimistic updates
- Handles real-time comment creation

### Mock User System

Currently uses a hardcoded demo user (`MOCK_USER_ID = 'demo-user-123'`) defined in `src/services/userService.ts`. This needs to be replaced with Firebase Authentication.

### Data CSV

The project includes `src/National-Historic-Landmarks_20250624.csv` with landmark data. There's a script `upload-landmarks.js` for populating Firestore with this data.

## Important Notes

### React Native 0.82 & New Architecture

- The app uses React Native 0.82.1 with **New Architecture enabled**
- Fabric renderer and TurboModules are active
- Reanimated 4.x requires worklets support (configured in babel.config.js)

### iOS Configuration

- Uses `use_frameworks! :linkage => :static` for Firebase compatibility
- Requires CocoaPods for dependency management
- Splash screen controlled by `react-native-splash-screen`

### Required Native Setup

1. **Vector Icons**: FontAwesome6 requires font linking
2. **Firebase**: Requires GoogleService-Info.plist (iOS) and google-services.json (Android)
3. **Permissions**: Image picker needs camera/library permissions in Info.plist and AndroidManifest.xml

### Development Patterns

- **Services layer** (`src/services/`) abstracts Firebase operations
- **Hooks** encapsulate complex state logic and side effects
- **Type-safe navigation** via React Navigation type system
- **Error handling** through try/catch with toast notifications

## Common Tasks

### Adding a New Screen

1. Create screen component in `src/screens/`
2. Add route to `RootStackParamList` or `TabParamList` in `src/types/index.ts`
3. Add screen to navigator in `src/navigation/RootNavigator.tsx`
4. Use typed navigation: `navigation.navigate('ScreenName', { params })`

### Adding a New UI Component

1. Create component in `src/components/ui/`
2. Use theme tokens: `import { theme } from '../../constants/theme'`
3. Define TypeScript interface extending `BaseComponentProps`
4. Export from `src/components/ui/index.ts`

### Creating a New Store

1. Create store file in `src/store/` using Zustand
2. Define interface for state shape
3. Use `create<StateInterface>()` with typed actions
4. Export from `src/store/index.ts`
5. Use in components: `const { state, actions } = useStoreName()`

### Working with Firebase

- **Reading posts**: Use `postsService.getPosts(lastVisible, limit)`
- **Creating posts**: Use `postsService.createPost(postData, currentUserId)`
- **Uploading images**: Use `useImagePicker` hook's `uploadImages` function
- **Security rules**: Currently open for development (see FIREBASE_SETUP.md)

## Next Steps for Production

The codebase documentation identifies these critical gaps:

1. **Authentication**: Replace mock user system with Firebase Auth
2. **Location Services**: Implement geolocation for location-based features
3. **Image Optimization**: Add compression/resizing before upload
4. **Security Rules**: Implement proper Firestore/Storage security rules
5. **Offline Support**: Add local persistence and sync strategies
6. **Push Notifications**: Integrate Firebase Cloud Messaging
7. **Error Tracking**: Add Crashlytics or Sentry

## Additional Documentation

- `README.md` - Basic React Native setup and running instructions
- `DEVELOPMENT_GUIDE.md` - Comprehensive guide to packages, components, and patterns
- `FIREBASE_SETUP.md` - Step-by-step Firebase configuration
- `SOCIAL_MEDIA_IMPLEMENTATION.md` - Details on social features implementation
