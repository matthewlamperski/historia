# Manual Setup Checklist

Tasks that require your credentials, native tooling, or Firebase console access — not automatable by code.

---

## 🚀 Pre-Ship Sanity Checklist

Do these before building the next TestFlight / Play Internal build. Everything else in this doc is context for how each item works.

### Native & build prerequisites
- [ ] **`cd ios && bundle exec pod install && cd ..`** — required after any native package change. Drops the Branch pod from Podfile.lock and regenerates it without RNBranch.
- [ ] **`npm install --legacy-peer-deps`** — already run; keep lockfiles committed so CI matches.
- [ ] **Xcode capabilities** — open `ios/historia.xcworkspace`, select `historia` target → **Signing & Capabilities**, confirm **Associated Domains** is listed (the `applinks:historia.app` entry lives in `historia.entitlements` and needs the capability to be enabled on the target).
- [ ] **Flip `aps-environment`** in `ios/historia/historia.entitlements` from `development` to `production` before archiving for TestFlight / App Store.

### Cloud Functions
- [ ] Deploy the latest functions:
      ```bash
      cd functions && firebase deploy --only functions:onMessageCreate,functions:sendSubscriptionWelcome,functions:askBede
      ```

### Ask Bede (Gemini AI)
- [ ] **Smoke test on device:** open any landmark → tap the "Ask Bede" card → send "When was this built?". First response should arrive in 2–4 seconds.
- [ ] **Cost guardrails in place (configured in code):**
      - Model: `gemini-2.5-flash` (cheapest modern model — ~$0.075/1M input, $0.30/1M output tokens)
      - Free tier: 5 messages/day/user · Pro tier: 200/day/user
      - Max output: 800 tokens (~600 words)
      - Last 8 prior turns included as context so follow-ups stay coherent
- [ ] **(Optional) Firestore rules** — since `users/{uid}/bedeChats` and `users/{uid}/bedeUsage` are written by the Cloud Function with admin privileges, existing user-level rules that let a user read their own subcollections are sufficient. Nothing needed unless your rules are overly restrictive.

### Hosted files on `historia.app` (required for Universal Links / App Links)
- [ ] **AASA file** — `https://historia.app/.well-known/apple-app-site-association`
      - Plain JSON, `Content-Type: application/json`, no `.json` extension, no redirects.
      - `appID` must be `<APPLE_TEAM_ID>.com.historia.app`.
      - Paths: `["/landmark/*", "/referral/*"]`.
      - Template & validator: "Universal Links & App Links" section below.
- [ ] **assetlinks.json** — `https://historia.app/.well-known/assetlinks.json`
      - `package_name`: `com.historia`.
      - `sha256_cert_fingerprints`: debug + Play upload key + Play App Signing key.
      - Template & `keytool` commands: "Universal Links & App Links" section below.

### Web landing pages on `historia.app`
- [ ] `/landmark/:id` — renders a landmark summary + App Store / Play Store badges. Users with the app installed never see this page (the universal link intercepts); it's only for users without the app.
- [ ] `/referral/:code` — renders the code + store badges. Needed because there's no deferred deep linking (users must manually enter the code after install — this is the known trade-off for dropping Branch).

### Shopify Pro welcome email
- [ ] Set `REDDIT_COMMUNITY_URL` on the `sendSubscriptionWelcome` function env (defaults to `https://www.reddit.com/r/HistoriaPro`).
- [ ] Confirm the Shopify Admin token has `write_customers` and `read_customers` scopes, not just `write_discounts`.

### Push notifications
- [ ] APNs `.p8` uploaded to Firebase Console → Project Settings → Cloud Messaging → iOS app.
- [ ] On-device smoke test: send a DM to a killed app on another device, confirm the push arrives and the tap deep-links into the correct chat.

### Post-deploy verification
- [ ] **iOS universal link:** paste `https://historia.app/landmark/<real-id>` into Apple Notes → tap → app opens to that landmark (not Safari). If Safari opens, the AASA is wrong — check MIME type and no redirects.
- [ ] **Android app link:**
      ```bash
      adb shell pm verify-app-links --re-verify com.historia
      adb shell pm get-app-links com.historia       # all hosts should show "verified"
      ```

### Known gap (accepted, documented)
- [ ] **Deferred deep linking is not supported.** A user tapping a `/referral/:code` link *before* installing won't have the code auto-applied after install. The "Got a referral code?" manual input on SignUpScreen is the fallback. This is the one thing paid services (Branch, Adjust, etc.) do that we aren't paying for.

---

## After Every Native Package Install
```bash
cd ios && bundle exec pod install && cd ..
```
Run this any time a new package with native modules is added (e.g. after `npm install`).

---

## Universal Links & App Links (deep linking — replaces Branch)

Free, native deep linking for `https://historia.app/landmark/{id}` and `https://historia.app/referral/{code}`. No third-party SDK. These links open the app directly on iOS and Android when installed, fall back to the web page otherwise.

### iOS — 1. Enable Associated Domains in Xcode
- Open `ios/historia.xcworkspace`
- Select the `historia` target → **Signing & Capabilities** → `+ Capability` → **Associated Domains**
- (The entitlement is already in `ios/historia/historia.entitlements`: `applinks:historia.app`)

### iOS — 2. Host the AASA file at `https://historia.app/.well-known/apple-app-site-association`
Plain JSON (no `.json` extension), served with `Content-Type: application/json`, no redirects.
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.historia.app",
        "paths": ["/landmark/*", "/referral/*"]
      }
    ]
  }
}
```
Replace `TEAMID` with your 10-character Apple Developer Team ID (Apple Developer → Membership).

**Validate** at https://branch.io/resources/aasa-validator/ (their validator is free to use even though we aren't using their product). iOS caches the AASA aggressively — if it doesn't pick up, delete + reinstall the app.

### Android — 3. Host assetlinks.json at `https://historia.app/.well-known/assetlinks.json`
Served with `Content-Type: application/json`. **Must** include the SHA-256 fingerprint of every keystore you sign with — debug, Play App Signing upload key, and (if used) the Play-generated signing key itself.
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.historia",
      "sha256_cert_fingerprints": [
        "<DEBUG_SHA256>",
        "<UPLOAD_KEY_SHA256>",
        "<PLAY_SIGNING_SHA256>"
      ]
    }
  }
]
```
Get the fingerprints with:
```bash
# Debug keystore:
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA256
# Play upload keystore (path varies):
keytool -list -v -keystore /path/to/upload-keystore.jks | grep SHA256
# Play App Signing key: grab from Google Play Console → Release → Setup → App integrity
```
Generate/validate at https://developers.google.com/digital-asset-links/tools/generator.

After deploying the file, force re-verification on device:
```bash
adb shell pm verify-app-links --re-verify com.historia
adb shell pm get-app-links com.historia   # all hosts should show "verified"
```

### Web fallback pages (your historia.app website)
Because the same HTTPS URLs are used for both deep linking and for users who don't have the app installed, you need simple landing pages at `/landmark/:id` and `/referral/:code`. Minimum behavior:
- **`/landmark/:id`** — show the landmark name/summary + "Open in Historia" button + App Store / Play Store badges.
- **`/referral/:code`** — show the code + "Get the App" button + App Store / Play Store badges. (There is **no** auto-apply of the code — see "Known limitation" below.)

Minimal React template (no Branch required):
```tsx
// src/pages/ReferralPage.tsx
import { useParams } from 'react-router-dom';

const IOS_URL = 'https://apps.apple.com/app/historia/idYOUR_APP_ID';
const ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.historia';

export default function ReferralPage() {
  const { code } = useParams<{ code: string }>();
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 40, textAlign: 'center' }}>
      <h1>You've been invited to Historia!</h1>
      <p>Use referral code <strong>{code}</strong> when signing up for 20 bonus points.</p>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24 }}>
        <a href={IOS_URL}><img src="/images/app-store-badge.svg" alt="App Store" height={44} /></a>
        <a href={ANDROID_URL}><img src="/images/google-play-badge.png" alt="Google Play" height={44} /></a>
      </div>
    </div>
  );
}
```

### Known limitation: no deferred deep linking
If a user taps `https://historia.app/referral/ABC123` *before* installing the app, iOS/Android drop them on the web page — the code is **not** carried through the install. Solutions:
- **Current:** user enters the code manually on the SignUpScreen "Got a referral code?" input (this path already works).
- **Fix later if needed:** add a paid deferred-deep-link service (Branch, Appsflyer, Adjust, etc.). None are free for this feature.

Landmark links don't have this concern — a user tapping a landmark link without the app installed just sees the web page, which is acceptable.

### Testing
```bash
# iOS simulator (custom scheme):
xcrun simctl openurl booted "historia://landmark/<real-landmark-id>"

# iOS physical device: paste an https://historia.app/landmark/<id> URL in Notes and tap it

# Android:
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://historia.app/landmark/<real-landmark-id>" com.historia
```

---

### Firestore Security Rules for Referrals
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
- Create a new **Auto-Renewable Subscription** with product ID: `historia_pro_monthly`
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

---

## Subscription Welcome Email (`sendSubscriptionWelcome`)

Fires after a user successfully starts a Historia Pro purchase — sends them a welcome email via Resend and adds them to the Shopify email marketing list.

### 1. Create / verify the private subreddit
- Create a private subreddit for Historia Pro members (e.g. `r/HistoriaPro`)
- Decide on the access flow (manual approval, invite link, etc.) — the welcome email links users here

### 2. Set the Reddit URL env var on the function
```bash
firebase functions:config:set reddit.community_url="https://www.reddit.com/r/HistoriaPro"
# or, for v2 params, set REDDIT_COMMUNITY_URL in the function's env at deploy time
```
If unset, the function falls back to `https://www.reddit.com/r/HistoriaPro`.

### 3. Verify existing env vars are set
The function reuses the same env vars as `processRewards`:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (default: `Historia Rewards <rewards@historia.app>`)
- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_ADMIN_API_TOKEN`

### 4. Add `write_customers` scope to the Shopify Admin API token
The rewards flow only needs `write_discounts`. To add customers to the marketing list, the same token must also have:
- `write_customers`
- `read_customers`

Update the custom app permissions in Shopify Admin → Apps → Develop apps → your app → Configuration, then reinstall and copy the new token.

### 5. Deploy the function
```bash
cd functions && firebase deploy --only functions:sendSubscriptionWelcome
```

### 6. Test
After deploy, start a Pro trial on a test account and verify:
- Welcome email arrives at the user's email
- Reddit link in email works
- Customer appears in Shopify Admin → Customers with `email_marketing_consent: subscribed` and the `historia-pro` tag

---

## Push Notifications (FCM)

End-to-end push for new messages. Uses FCM's free `data` payload for deep-linking — no Branch / OneSignal / external service required.

### 1. Upload an APNs auth key to Firebase (iOS, one-time)
- Apple Developer Portal → Keys → `+` → name it "Historia APNs" → check **Apple Push Notifications service (APNs)** → Continue → Register → download the `.p8` (you only get one chance).
- Also note the **Key ID** (10 chars) and your **Team ID** (top-right corner of Apple Developer).
- Firebase Console → Project Settings → Cloud Messaging tab → Apple app configuration → upload the `.p8`, paste Key ID and Team ID.

### 2. Flip `aps-environment` before shipping to TestFlight / App Store
`ios/historia/historia.entitlements` currently has:
```xml
<key>aps-environment</key>
<string>development</string>
```
For production / TestFlight builds, change `development` → `production`. Xcode's "Release" configuration typically handles this via capabilities, but double-check before archiving.

### 3. Run pod install after the first pull
The AppDelegate adds `import UserNotifications` and conforms to `UNUserNotificationCenterDelegate` — no new pods, but run it once to be safe:
```bash
cd ios && bundle exec pod install && cd ..
```

### 4. Confirm Android `google-services.json` is current
`android/app/google-services.json` must include the **Cloud Messaging** sender ID for the project. If the file was added before FCM was enabled, re-download from Firebase Console → Project Settings → Your apps → Android app.

### 5. Deploy the Firestore trigger
```bash
cd functions && firebase deploy --only functions:onMessageCreate
```
This deploys the `onMessageCreate` trigger which fires on every new document in `conversations/{conversationId}/messages/{messageId}` and sends push + writes the in-app notification doc.

### 6. Test end-to-end
Use two physical devices (iOS simulator can't receive push).

- **Token registration:** log in on device B → open Firestore Console → `users/{uid}` → confirm `fcmToken` field is populated.
- **Background/killed push:** kill the app on device B → from device A, send a DM to B → device B should receive a system push. Tap it → app opens directly into the ChatScreen with the right conversation.
- **Foreground toast:** put device B's app in foreground → from device A, send another DM → device B should show a bottom toast with the message preview. Tap the toast to jump into the chat.
- **In-app bell:** open Profile on device B → the bell icon shows a red unread badge → tap to open NotificationsScreen → entry reads "A: <preview>" → tap opens the chat AND marks it read.
- **Stale token cleanup:** in Firestore Console, manually set `users/{B}.fcmToken` to `"bogus"` → from device A, send a message → in the function logs you should see a `messaging/registration-token-not-registered` error and the field should be deleted from the user doc.

### 7. (Optional) Test with the Firebase Console before wiring the trigger
Firebase Console → Cloud Messaging → "Send your first message" → paste a `fcmToken` from a user doc → send a test. If this works but real messages don't, the trigger isn't deployed (step 5).
