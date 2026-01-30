# Firebase Setup Guide for Historia

## Prerequisites

1. **Firebase Project**: Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. **Enable Services**: Enable the following services in your Firebase project:
   - Authentication
   - Firestore Database
   - Storage

## Configuration Steps

### 1. Download Configuration Files

#### For Android:
1. Go to Project Settings > General > Your apps
2. Click on the Android app (or add one if it doesn't exist)
3. Download `google-services.json`
4. Place it in `android/app/google-services.json`

#### For iOS:
1. Go to Project Settings > General > Your apps  
2. Click on the iOS app (or add one if it doesn't exist)
3. Download `GoogleService-Info.plist`
4. Place it in `ios/GoogleService-Info.plist`
5. Add it to your Xcode project

### 2. Update Firebase Configuration

Open `src/services/firebaseConfig.ts` and replace the empty `firebaseConfig` object with your actual Firebase configuration:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

### 3. iOS Additional Setup

Add the following to your `ios/Podfile` (should already be added via npm install):

```ruby
pod 'Firebase/Analytics'
pod 'Firebase/Auth'
pod 'Firebase/Firestore'
pod 'Firebase/Storage'
```

Then run:
```bash
cd ios && pod install
```

### 4. Android Additional Setup

The `google-services` plugin should already be configured in your `android/build.gradle` and `android/app/build.gradle` files.

### 5. Firestore Security Rules

Update your Firestore security rules to allow authenticated users to read/write:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all users (development only)
    match /{document=**} {
      allow read, write: if true;
    }
    
    // For production, use more restrictive rules like:
    // match /posts/{postId} {
    //   allow read: if true;
    //   allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    // }
  }
}
```

### 6. Storage Security Rules

Update your Storage security rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /posts/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 7. Initialize Demo Data

The app includes a mock user system for development. When you first run the app and create posts, it will automatically create a demo user in Firestore.

## Testing

1. Build and run your app
2. Open the Feed tab
3. Tap the "+" button to create your first post
4. Add some content and/or images
5. Post it and see it appear in the feed

## Production Considerations

- Replace mock user system with proper authentication
- Implement proper security rules
- Add error handling and offline support
- Consider using Firebase Functions for server-side logic
- Implement proper image compression and resizing
- Add content moderation
- Implement push notifications for comments/likes

## Troubleshooting

1. **Build errors**: Make sure all Firebase packages are properly linked
2. **Configuration errors**: Double-check your Firebase configuration
3. **Permission errors**: Verify your Firestore and Storage security rules
4. **Image upload fails**: Check Storage security rules and network connectivity