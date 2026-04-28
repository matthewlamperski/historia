# Notifications Cloud Function

> **Status:** Implemented as `onMessageCreate` in `functions/src/index.ts`.

This replaces the older "fan out on `notifications/` writes" design. The
current architecture flips the trigger source — the Cloud Function now
**reacts to new messages directly** and does both jobs in one place:

1. Writes the in-app notification document (`notifications/{auto}`) so the
   bell icon picks it up.
2. Sends the FCM push to every recipient's device.

This keeps the client dumb: `messagingService.sendMessage()` only writes
the message doc — it doesn't need to know notifications exist.

## Where it lives
- Implementation: `functions/src/index.ts` — export `onMessageCreate`
- Trigger: `onDocumentCreated` on `conversations/{conversationId}/messages/{messageId}`

## FCM payload contract
```ts
{
  notification: { title, body },
  data: {
    type: 'new_message',
    conversationId,
    senderId,
    senderName,
    senderAvatar?,
    senderUsername?,
  },
  apns:    { payload: { aps: { sound: 'default', badge: 1, 'mutable-content': 1 } } },
  android: { priority: 'high', notification: { channelId: 'historia_default', sound: 'default' } }
}
```
The `data` object is the deep-link surface. Clients parse `data.type` and
route accordingly — see `src/hooks/useNotificationHandlers.ts`.

## Setup & deployment
See the **Push Notifications (FCM)** section in
`docs/MANUAL_SETUP_CHECKLIST.md` for the full one-time setup (APNs key,
pod install, entitlements, Android manifest) and the deploy command:
```bash
cd functions && firebase deploy --only functions:onMessageCreate
```

## Adding new notification types
1. Add the new `NotificationType` value in `src/types/index.ts`.
2. In the Cloud Function: write a new `notifications/{auto}` doc with the
   new `type` and call `admin.messaging().send(...)` with the new
   `data.type` value.
3. In `src/hooks/useNotificationHandlers.ts`, add a `case` in
   `routeFromNotification`'s switch that navigates to the right screen.
4. In `src/screens/NotificationsScreen.tsx`, extend `getNotificationText`
   and `renderNotification` to display the new type.
