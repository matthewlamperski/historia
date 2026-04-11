# Manual Setup Checklist

Tasks that require your credentials, native tooling, or Firebase console access — not automatable by code.

---

## After Every Native Package Install
```bash
cd ios && bundle exec pod install && cd ..
```
Run this any time a new package with native modules is added (e.g. after `npm install`).

---

## Referral Bonus System (Branch.io)

### 17. Create a Branch.io Account
- Go to https://branch.io → sign up (free tier, up to 10,000 MAU)
- Create a new app in the Branch dashboard

### 18. Configure iOS in Branch Dashboard
- App settings → iOS → enter Bundle ID: `com.historia.app` (check your Xcode target)
- URI Scheme: `historia`
- Enable **Universal Links**
- Paste your Apple App Site Association (AASA) domain: `historia.app`

### 19. Configure Android in Branch Dashboard
- App settings → Android → enter Package Name from `android/app/build.gradle`
- SHA256 fingerprint for Android App Links

### 20. Get Your Branch Live Key
- Branch Dashboard → Account Settings → App → Branch Key (Live)
- It looks like `key_live_...`

### 21. Add Branch Keys to iOS — `ios/historia/Info.plist`
```xml
<key>branch_key</key>
<dict>
  <key>live</key>
  <string>key_live_REPLACE_WITH_YOUR_KEY</string>
</dict>
<key>branch_universal_link_domains</key>
<array>
  <string>YOURAPP.app.link</string>
  <string>YOURAPP-alternate.app.link</string>
</array>
```
Also add your URI scheme (if not already present):
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>historia</string>
    </array>
  </dict>
</array>
```

### 22. Add Branch Keys to Android — `android/app/src/main/AndroidManifest.xml`
Inside `<application>`:
```xml
<meta-data android:name="io.branch.sdk.BranchKey" android:value="key_live_REPLACE_WITH_YOUR_KEY" />
<meta-data android:name="io.branch.sdk.BranchKey.test" android:value="key_test_REPLACE_WITH_YOUR_TEST_KEY" />
```
Inside the main `<activity>`:
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="YOURAPP.app.link" />
  <data android:scheme="https" android:host="YOURAPP-alternate.app.link" />
</intent-filter>
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="historia" />
</intent-filter>
```

### 23. Xcode — Add Associated Domains Capability
- Xcode → `historia` target → Signing & Capabilities → `+` → Associated Domains
- Add: `applinks:YOURAPP.app.link` and `applinks:YOURAPP-alternate.app.link`

### 24. Run pod install
```bash
cd ios && bundle exec pod install && cd ..
```

### 25. Add Branch to AppDelegate (iOS)

In `ios/historia/AppDelegate.mm`, add:
```objc
#import <RNBranch/RNBranch.h>

// In application:didFinishLaunchingWithOptions: (before [super application:...]):
[RNBranch initSessionWithLaunchOptions:launchOptions isReferrable:YES];

// Add this method:
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  if ([RNBranch application:application openURL:url options:options]) {
    return YES;
  }
  // Handle other URL schemes...
  return NO;
}

- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
  return [RNBranch continueUserActivity:userActivity];
}
```

### 26. Android — Initialize Branch in MainApplication
In `android/app/src/main/java/.../MainApplication.java` (or `.kt`):
```java
import io.branch.rnbranch.RNBranchModule;

@Override
public void onCreate() {
  super.onCreate();
  RNBranchModule.getAutoInstance(this);
  // ...
}
```

---

## React Website — Referral Landing Page

Add a page at `/referral/:code` to your React website. Here is the **complete component**:

```tsx
// src/pages/ReferralPage.tsx (or equivalent route in your framework)
import { useEffect } from 'react';
import { useParams } from 'react-router-dom'; // adjust for your router

const IOS_APP_STORE_URL = 'https://apps.apple.com/app/historia/idYOUR_APP_ID';
const ANDROID_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.historia.app';
const BRANCH_KEY = 'key_live_REPLACE_WITH_YOUR_KEY';

function getDeviceType(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export default function ReferralPage() {
  const { code } = useParams<{ code: string }>();
  const device = getDeviceType();

  useEffect(() => {
    // Load Branch Web SDK and create a journey link that passes the referral code
    // This ensures Branch can attribute the install even on web
    const script = document.createElement('script');
    script.src = 'https://cdn.branch.io/branch-latest.min.js';
    script.async = true;
    script.onload = () => {
      (window as any).branch.init(BRANCH_KEY, (err: any) => {
        if (err) console.error('Branch init error', err);
      });
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const handleDownload = () => {
    // Build a Branch web-to-app link that carries the referral code
    const branchLink =
      `https://YOURAPP.app.link/referral?referral_code=${code}` +
      `&$ios_url=${encodeURIComponent(IOS_APP_STORE_URL)}` +
      `&$android_url=${encodeURIComponent(ANDROID_PLAY_URL)}` +
      `&$desktop_url=${encodeURIComponent(window.location.href)}`;

    window.location.href = branchLink;
  };

  return (
    <div style={styles.container}>
      <img src="/images/og-image.png" alt="Historia" style={styles.hero} />
      <h1 style={styles.title}>You've been invited to Historia!</h1>
      <p style={styles.subtitle}>
        Explore America's historical landmarks — and get{' '}
        <strong>1 month of Historia Pro free</strong> when you sign up with this
        referral.
      </p>
      <p style={styles.codeLine}>
        Your referral code: <strong>{code}</strong>
      </p>
      <button onClick={handleDownload} style={styles.button}>
        {device === 'ios'
          ? 'Download on the App Store'
          : device === 'android'
          ? 'Get it on Google Play'
          : 'Get the App'}
      </button>
      {device === 'desktop' && (
        <div style={styles.storeLinks}>
          <a href={IOS_APP_STORE_URL}>
            <img src="/images/app-store-badge.svg" alt="App Store" height={44} />
          </a>
          <a href={ANDROID_PLAY_URL}>
            <img src="/images/google-play-badge.png" alt="Google Play" height={44} />
          </a>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 480, margin: '0 auto', padding: '40px 24px', textAlign: 'center', fontFamily: 'sans-serif' },
  hero: { width: '100%', maxWidth: 320, borderRadius: 16, marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 700, marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 16, lineHeight: 1.5 },
  codeLine: { fontSize: 18, marginBottom: 28, color: '#333' },
  button: { background: '#927f61', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 17, fontWeight: 600, cursor: 'pointer', marginBottom: 24 },
  storeLinks: { display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 },
};
```

**Also add the route** in your router config:
```tsx
// React Router v6 example
<Route path="/referral/:code" element={<ReferralPage />} />
```

**Replace these placeholders in the code above:**
- `YOUR_APP_ID` → your App Store app ID (from App Store Connect)
- `com.historia.app` → your actual Android package name
- `YOURAPP.app.link` → your Branch link domain (from Branch dashboard)
- `key_live_REPLACE_WITH_YOUR_KEY` → your Branch Live Key

---

### 27. Firestore Security Rules for Referrals
Add to your Firestore rules:
```
match /referrals/{referralId} {
  allow read: if request.auth.uid == resource.data.referrerId
              || request.auth.uid == resource.data.referredId;
  allow create: if request.auth != null;
  allow update: if false; // only Cloud Functions should update these
}
```

---

## Muting — Firestore Security Rules

Add to your Firestore rules:
```
match /mutes/{muteId} {
  // muteId format: "{muterId}_{mutedId}"
  allow read: if request.auth.uid == resource.data.muterId;
  allow create: if request.auth != null
                && request.auth.uid == request.resource.data.muterId;
  allow delete: if request.auth.uid == resource.data.muterId;
  allow update: if false;
}
```

---

## Companions & Push Notifications

### 1. iOS — Enable Push Notifications Capability
In Xcode:
- Open `ios/historia.xcworkspace`
- Select the `historia` target → Signing & Capabilities
- Click **+ Capability** → add **Push Notifications**
- Click **+ Capability** → add **Background Modes** → check **Remote notifications**

### 2. iOS — Info.plist Background Modes
Add to `ios/historia/Info.plist`:
```xml
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

### 3. Firebase Console — Upload APNs Key
- Firebase Console → Project Settings → Cloud Messaging → Apple app configuration
- Upload your APNs Auth Key (`.p8`) from the Apple Developer portal
- Or upload your APNs Certificate if you use that instead

### 4. Android — POST_NOTIFICATIONS Permission
Add to `android/app/src/main/AndroidManifest.xml` inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```
(Required for Android 13+.)

### 5. Deploy the Cloud Function
The full function code is in `docs/NOTIFICATIONS_CLOUD_FUNCTION.md`.
```bash
cd functions
npm install
npm run build
firebase deploy --only functions:sendCompanionNotification
```

### 6. Firestore Security Rules
Add the rules from `docs/NOTIFICATIONS_CLOUD_FUNCTION.md` to your Firestore rules in the Firebase Console (or `firestore.rules` file):
- `notifications/{notificationId}` — read/write rules
- `companionRequests/{requestId}` — read/write rules

---

## Subscriptions (react-native-iap)

### 7. App Store Connect — Create In-App Purchase
- Log in to App Store Connect → your app → In-App Purchases
- Create a new **Auto-Renewable Subscription** with product ID: `historia_premium_monthly`
- Set price, description, and submit for review
- Do the same in Google Play Console for Android

### 8. App Store Connect — Sandbox Testers
- App Store Connect → Users and Access → Sandbox Testers
- Create a sandbox Apple ID to test purchases without being charged

---

## Algolia Search

### 9. Algolia — Create Account & Get Keys
1. Go to algolia.com → sign up → create a new application
2. In the Algolia dashboard: **API Keys** → copy your **Application ID** and **Search-Only API Key**
3. Open `src/constants/algolia.ts` and fill in:
   ```ts
   export const ALGOLIA_APP_ID = 'YOUR_APP_ID';
   export const ALGOLIA_SEARCH_ONLY_KEY = 'YOUR_SEARCH_ONLY_KEY';
   export const ALGOLIA_USERS_INDEX = 'users';
   ```
   > The Search-Only key is safe to ship in the client bundle. Never use the Admin key in app code.

4. In the Algolia dashboard → **Search** → **Index** → create an index named **`users`**
   - This index is used by `NewConversationScreen` to search users by handle

5. **Deploy the Algolia sync Cloud Function** (syncs Firestore `users` docs to Algolia on write):
   ```bash
   cd functions
   npm install
   npm run build
   firebase deploy --only functions:syncUserToAlgolia
   ```
   The function source is in `functions/src/algolia.ts`.

6. **Backfill existing users** — after deploying the function, run a one-time script or manually push existing user documents through the function by making a trivial update to each user doc. Alternatively, iterate all users in Node and call `algoliaIndex.saveObjects(users)` with the Admin key.

---

## Google Sign-In

### 10. Update Google Sign-In Client ID
In `src/store/authStore.ts` line 14:
```ts
GoogleSignin.configure({
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
});
```
Get the correct iOS client ID from Firebase Console → Project Settings → Your iOS app.

---

## General Firebase

### 11. Firestore Indexes
As queries grow, Firestore will log "index required" errors in the console with a direct link to create the index. Click each link and create the index. Required indexes:

| Collection | Fields | Order |
|---|---|---|
| `posts` | `userId`, `createdAt` | ASC, DESC |
| `visits` | `userId`, `landmarkId` | ASC, ASC |
| `companionRequests` | `receiverId`, `status`, `createdAt` | ASC, ASC, DESC |
| `companionRequests` | `senderId`, `receiverId`, `status` | ASC, ASC, ASC |
| `notifications` | `recipientId`, `createdAt` | ASC, DESC |

The `posts` index is required for `getPostsByUser()` (ProfileTab) and the daily post-count query (rewards). The `visits` index is required for checking whether a user has already visited a landmark.

### 12. Firebase Storage Rules
Ensure Storage rules allow authenticated uploads:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

---

## Production Readiness (before App Store submission)

### 13. Tighten Firestore Security Rules
Replace any `allow read, write: if true;` with proper auth-based rules.

### 14. Remove All `console.log` / Debug Logging
Search for `console.log` across `src/` and remove or gate behind `__DEV__`.

### 15. Configure Firebase App Check
Adds attestation to prevent unauthorized API access.
- Firebase Console → App Check → Register your iOS and Android apps

### 16. Google Places API — Add Android SHA-1 Fingerprint
In Google Cloud Console → Credentials → your Places API key → Application restrictions:
- Add the Android app's SHA-1 fingerprint so the key accepts requests from the Android build
- Get the debug SHA-1 with: `cd android && ./gradlew signingReport`
- For release, use the SHA-1 from your upload keystore / Play Console

---

### 17. Set Up Crashlytics (optional but recommended)
```bash
npm install @react-native-firebase/crashlytics --legacy-peer-deps
cd ios && bundle exec pod install && cd ..
```
Then enable in Firebase Console → Crashlytics.

---

## Points & Levels System — Rewards Fulfillment

Points are earned automatically in-app. The **Digital Challenge Coin** is displayed in-app on the Levels screen. Everything below requires manual action by your team.

### Firestore Index Required
The daily post-count query needs a composite index:
- Collection: `posts`
- Fields: `userId ASC`, `createdAt ASC`

Firestore will log a direct link to create this index on first run. Click it and create.

---

### Reward Tier Fulfillment — What You Must Set Up

#### Historia Initiate (0–99 pts)
- [ ] Create a `INITIATE15` (or personalized) coupon code for 15% off at shophistoria.com
- Trigger: when user reaches 0 pts (all users — send welcome email with code)

#### History Keeper (100–249 pts)
- [ ] Create a coupon code for 20% off at shophistoria.com
- Trigger: notify user via push/email when they cross 100 pts

#### Patriotic Chronicler (250–499 pts)
- [ ] Create a coupon code for 25% off at shophistoria.com
- Trigger: push/email at 250 pts

#### Heritage Ambassador (500–999 pts)
- [ ] Set up Tervis tumbler fulfillment (Historia branded Made in USA 16oz)
- [ ] Enable "exclusive access" flag on shophistoria.com for users at this level+
  - **Recommended**: shophistoria.com reads the user's `pointsBalance` from Firestore (or your API) to gate access to limited-edition/pre-sale pages
- Trigger: push/email at 500 pts — collect shipping address from user

#### Gratitude Guardian (1,000–2,499 pts)
- [ ] Issue $50 shophistoria.com gift card to user (email)
- Trigger: push/email at 1,000 pts

#### Liberty Sentinel (2,500–3,499 pts)
- [ ] Issue $100 shophistoria.com gift card
- [ ] Set up "complimentary members gift of the year" fulfillment pipeline
- Trigger: push/email at 2,500 pts

#### Legacy Defender (3,500–4,999 pts)
- [ ] Coordinate complimentary tour redemption — collect user's preferred museum/historic site
- [ ] Add to member-only events invite list
- [ ] Annual gift fulfillment
- Trigger: push/email at 3,500 pts

#### Legendary Historian (5,000–9,999 pts)
- [ ] Send Premium Historia branded Made in USA T-shirt or Sweatshirt (collect size + address)
- [ ] Add to member-only events invite list
- [ ] Annual gift fulfillment
- Trigger: push/email at 5,000 pts

#### Eternal Steward (10,000+ pts)
- [ ] Issue Eternal Steward Certificate (PDF or physical)
- [ ] Ship Physical Historia Challenge Coin
- [ ] Apply lifetime 15% discount on shophistoria.com (permanent account flag)
- [ ] Engrave user's name on the Historia Eternal Steward Cup
- [ ] Add to "Eternal Steward Circle" events list + advisory communications
- [ ] Annual gift fulfillment
- Trigger: push/email at 10,000 pts

---

### Recommended: Level-Up Push Notifications (Cloud Function)

Create a Firestore trigger on `users/{userId}` that fires when `pointsBalance` increases and crosses a level threshold. Send a push notification congratulating the user:

```javascript
// functions/src/levelUp.ts
exports.onPointsUpdate = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data().pointsBalance ?? 0;
    const after = change.after.data().pointsBalance ?? 0;
    if (after <= before) return null;

    // Check if a level threshold was crossed
    const levelThresholds = [100, 250, 500, 1000, 2500, 3500, 5000, 10000];
    const crossed = levelThresholds.filter(t => before < t && after >= t);
    if (crossed.length === 0) return null;

    const levelNames: Record<number, string> = {
      100: 'History Keeper', 250: 'Patriotic Chronicler',
      500: 'Heritage Ambassador', 1000: 'Gratitude Guardian',
      2500: 'Liberty Sentinel', 3500: 'Legacy Defender',
      5000: 'Legendary Historian', 10000: 'Eternal Steward',
    };

    const fcmToken = change.after.data().fcmToken;
    if (!fcmToken) return null;

    const newLevelName = levelNames[crossed[crossed.length - 1]];
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: `You reached ${newLevelName}! 🎉`,
        body: 'Open Historia to see your new rewards.',
      },
    });
    return null;
  });
```

Deploy with: `firebase deploy --only functions:onPointsUpdate`

---

### Optional: Server-Side Point Enforcement (Cloud Function)

For production tamper-proofing, move point awards from the client to Cloud Function triggers:

- Trigger on `visits/{visitId}` creation → award +10 pts to `visit.userId`
- Trigger on `posts/{postId}` creation → check daily count, award +2/+4 pts
- Trigger on `referrals/{id}` where `status == 'completed'` → award +25 pts to both parties

This prevents savvy users from calling Firestore directly from a custom client to award themselves points.

---

### "Exclusive Access" Website Integration

For the "exclusive access to limited-edition items / pre-sale drops" reward (Heritage Ambassador and above), your shophistoria.com website needs to:

1. Authenticate the user (shared Firebase Auth project, or your own login)
2. Read `users/{uid}.pointsBalance` from Firestore to determine their level
3. Show or hide exclusive product pages / early-access collections based on `pointsBalance >= 500`

The simplest integration: use the Firebase Web SDK on your React website to read the user's `pointsBalance` after they log in with the same Firebase project.
