# Notifications Cloud Function

This Cloud Function sends a push notification via FCM whenever a new document is written to the `notifications` Firestore collection. Deploy it yourself from your Firebase project.

---

## Prerequisites

1. Firebase project with Firestore, Authentication, and Cloud Messaging enabled.
2. `firebase-tools` installed globally: `npm install -g firebase-tools`
3. A `functions/` directory initialised in your repo (run `firebase init functions` if not).

---

## The Function

Create (or add to) `functions/src/index.ts`:

```typescript
import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

// Only call initializeApp() once — skip if already done elsewhere in the file
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Triggered whenever a new notification document is created.
 * Fetches the recipient's FCM token and sends a push notification.
 */
export const sendCompanionNotification = onDocumentCreated(
  'notifications/{notificationId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { recipientId, senderName, type } = data;

    // Look up the recipient's FCM token
    const recipientDoc = await admin
      .firestore()
      .collection('users')
      .doc(recipientId)
      .get();

    const fcmToken: string | undefined = recipientDoc.data()?.fcmToken;
    if (!fcmToken) {
      console.log(`No FCM token for user ${recipientId} — skipping push`);
      return;
    }

    // Build the notification payload
    const title =
      type === 'companion_request'
        ? 'New Companion Request'
        : 'Companion Request Accepted';

    const body =
      type === 'companion_request'
        ? `${senderName} wants to be your companion`
        : `${senderName} accepted your companion request`;

    // Send the push notification
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
        },
      },
    });

    console.log(`Push sent to ${recipientId}: "${title}"`);
  }
);
```

---

## Deploy

```bash
cd functions
npm install          # or yarn
npm run build        # compiles TypeScript
firebase deploy --only functions:sendCompanionNotification
```

---

## iOS Native Setup

Add the following to `ios/historia/Info.plist` to enable background push delivery:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

Then run:

```bash
cd ios && bundle exec pod install && cd ..
```

In the iOS Developer Portal / Xcode, ensure **Push Notifications** and **Background Modes → Remote Notifications** capabilities are enabled for your app target.

Upload your APNs key (`.p8`) or certificate to the Firebase Console under **Project Settings → Cloud Messaging → Apple app configuration**.

---

## Android Native Setup

No extra code is needed — `@react-native-firebase/messaging` auto-links and uses `google-services.json`. Ensure your `AndroidManifest.xml` contains:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

(Required for Android 13+.)

---

## Firestore Security Rules (add to your rules)

```
match /notifications/{notificationId} {
  // Only the recipient may read their own notifications
  allow read: if request.auth.uid == resource.data.recipientId;
  // Only authenticated users may create (the companion service writes these)
  allow create: if request.auth != null;
  // Only the recipient may update (mark as read)
  allow update: if request.auth.uid == resource.data.recipientId
                && request.resource.data.diff(resource.data).affectedKeys()
                     .hasOnly(['isRead']);
  // No deletes via client (optional: allow recipient to delete)
  allow delete: if request.auth.uid == resource.data.recipientId;
}
```

---

## Companion Requests Security Rules (add to your rules)

```
match /companionRequests/{requestId} {
  allow read: if request.auth.uid == resource.data.senderId
              || request.auth.uid == resource.data.receiverId;
  allow create: if request.auth != null
                && request.resource.data.senderId == request.auth.uid;
  allow update: if request.auth.uid == resource.data.senderId
                || request.auth.uid == resource.data.receiverId;
}
```
