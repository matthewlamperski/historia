# Subscription System — Hand-off & Operations Guide

This document is **everything you need to do manually** to make the new subscription lifecycle work end-to-end. The code is shipped; the credentials and console configuration are not.

Read this top-to-bottom before deploying. Each step says **what to get**, **where to get it**, and **what command/screen to paste it into**.

---

## TL;DR — what you need to do

1. **Get & set 6 secrets** (Apple key + 4 Apple IDs, Google service account JSON + package name).
2. **Create a Pub/Sub topic** named `google-play-rtdn`.
3. **Deploy the new Cloud Functions.**
4. **Configure App Store Connect** — paste the `appleAssnWebhook` URL.
5. **Configure Google Play Console** — paste the Pub/Sub topic name.
6. **Run through the test checklist** at the bottom.

Estimated total time: ~45 minutes once you have the credentials.

---

## 1. Apple credentials

You need 4 things from App Store Connect:

### 1.1. Apple Bundle ID
- This is your iOS app bundle identifier.
- For Historia it's `com.historia.app` (confirmed in `ios/historia/Info.plist`).
- Set it:
  ```bash
  firebase functions:secrets:set APPLE_BUNDLE_ID --project historia-application
  ```
  When prompted, paste: `com.historia.app`

### 1.2. Apple Issuer ID
- Where: App Store Connect → **Users and Access** → **Integrations** tab → **App Store Connect API** section.
- It's a UUID at the top of the page (looks like `57246542-96fe-1a63-e053-0824d011072a`).
- Set it:
  ```bash
  firebase functions:secrets:set APPLE_ISSUER_ID --project historia-application
  ```

### 1.3. Apple Key ID + Private Key (.p8)
- Where: same page as Issuer ID — **Keys** sub-tab.
- Click **(+)** to generate a new key. Name it something like `Historia Server Notifications`. Check **App Store Server API** and **App Store Server Notifications** in the access permissions.
- Click **Generate**.
- **Download the `.p8` file immediately — Apple will not show it again.**
- The key ID is shown on that page (10-character alphanumeric, e.g. `9V5W4NPBJ8`).
- Set the key ID:
  ```bash
  firebase functions:secrets:set APPLE_KEY_ID --project historia-application
  ```
- Set the private key (paste the entire contents of the `.p8` file, including the `-----BEGIN PRIVATE KEY-----` lines):
  ```bash
  firebase functions:secrets:set APPLE_PRIVATE_KEY --project historia-application
  ```

### 1.4. Apple environment (optional)
- Default is `production`. If you want to test against sandbox first, set:
  ```bash
  firebase functions:config:set apple_environment=sandbox
  ```
- For production, leave it unset (the param defaults to `production`).

### 1.5. Apple Root Certificates (one-time code change)

**⚠️ I need you to do this — it's the one piece of code I can't write blind.**

Apple's signed-payload verifier requires Apple's root certificate chain to verify the JWS signatures. The chain is publicly available; you just need to download it and paste a base64 representation into one constant.

Steps:
1. Download the certificates:
   ```bash
   curl -o /tmp/AppleRootCA-G3.cer https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
   curl -o /tmp/AppleRootCA-G2.cer https://www.apple.com/certificateauthority/AppleRootCA-G2.cer
   ```
2. Base64-encode each:
   ```bash
   base64 -i /tmp/AppleRootCA-G3.cer
   base64 -i /tmp/AppleRootCA-G2.cer
   ```
3. Open `functions/src/subscriptions.ts` and find the `APPLE_ROOT_CERTS_BASE64` array (currently empty). Paste both base64 strings as array entries.
4. Rebuild + redeploy.

If you don't do this, the Apple webhook **will not work** — `verifyAndDecodeNotification` will fail with a "no root certificates" error.

---

## 2. Google Play credentials

You need 2 things:

### 2.1. Google Play package name
- This is your Android app's `applicationId` — for Historia it's `com.historia.app`.
- Set:
  ```bash
  firebase functions:secrets:set GOOGLE_PLAY_PACKAGE_NAME --project historia-application
  ```
  Paste: `com.historia.app`

### 2.2. Google Play service account JSON
- Where: Google Cloud Console → **IAM & Admin** → **Service Accounts** → **Create Service Account**.
- Name: `historia-play-billing-reader` (whatever you like).
- Roles: **Service Account User** + grant access in Play Console (next step).
- Create key → JSON → download.
- **In the Play Console**: Setup → API access → Link the service account → grant **View financial data, orders, and cancellation survey responses** + **Manage orders and subscriptions**.
- Set the secret (paste the entire JSON file content, including curly braces):
  ```bash
  firebase functions:secrets:set GOOGLE_PLAY_SERVICE_ACCOUNT --project historia-application
  ```
  Paste the full JSON.

### 2.3. Pub/Sub topic for RTDN
- Required because Google Play publishes notifications to a Pub/Sub topic, and our Cloud Function subscribes to that topic.
- In Google Cloud Console → **Pub/Sub** → **Topics** → **Create Topic**.
- Topic ID: **`google-play-rtdn`** (must match exactly — that's what the Cloud Function subscribes to).
- Region: Default is fine.
- After creation, grant the Google Play service account `roles/pubsub.publisher` on this topic:
  - Pub/Sub → Topics → `google-play-rtdn` → **Permissions** → **Grant access** → principal = `google-play-developer-notifications@system.gserviceaccount.com` → role = **Pub/Sub Publisher**.
  - This is **Google Play's own publisher identity** — not your service account. Get the exact email from the Play Console RTDN setup page.

---

## 3. Deploy the Cloud Functions

Once all 6 secrets are set and the Apple root certs are pasted into the code:

```bash
cd functions
npm run build
firebase deploy --only functions:appleAssnWebhook,functions:googlePlayRtdnWebhook,functions:validateReceipt,functions:processRewards,functions:sendSubscriptionWelcome --project historia-application
```

Two of those are updates (`processRewards` and `sendSubscriptionWelcome`), three are brand new (`appleAssnWebhook`, `googlePlayRtdnWebhook`, `validateReceipt`).

If the deploy hits the same Eventarc service-agent propagation issue we saw with `onUserCreate`, just retry after 2–3 minutes.

After deploy, copy the function URLs from the output. The two important ones:

- `https://us-central1-historia-application.cloudfunctions.net/appleAssnWebhook`
- `https://us-central1-historia-application.cloudfunctions.net/validateReceipt`

(The Google webhook is Pub/Sub-triggered, no public URL.)

---

## 4. Configure App Store Connect (Apple webhook)

1. App Store Connect → **My Apps** → **Historia** → **App Information** (under General).
2. Scroll down to **App Store Server Notifications**.
3. **Production Server URL**:
   ```
   https://us-central1-historia-application.cloudfunctions.net/appleAssnWebhook
   ```
4. **Sandbox Server URL** (same — the function checks the `environment` field on each notification):
   ```
   https://us-central1-historia-application.cloudfunctions.net/appleAssnWebhook
   ```
5. **Version**: select **Version 2** (V2 is what the code parses).
6. Save.

Send a **test notification** from the same page to verify the URL works. Watch Cloud Functions logs:
```bash
firebase functions:log --only appleAssnWebhook --project historia-application
```
You should see a successful verify + decode within a few seconds.

---

## 5. Configure Google Play Console (Android webhook)

1. Play Console → **Monetize** → **Subscriptions** → **Real-time developer notifications**.
2. **Topic name** (full path):
   ```
   projects/historia-application/topics/google-play-rtdn
   ```
3. Click **Send test publication** at the bottom of the page.
4. Watch Cloud Functions logs:
   ```bash
   firebase functions:log --only googlePlayRtdnWebhook --project historia-application
   ```
   You should see a `googlePlayRtdnWebhook: test notification received` log.

If it fails with a permissions error, recheck step 2.3 — the publisher service account `google-play-developer-notifications@system.gserviceaccount.com` must have **Pub/Sub Publisher** role on the topic.

---

## 6. Set the real product IDs

Currently `src/store/subscriptionStore.ts:60-63` has:
```ts
export const PRODUCT_IDS = {
  ios: ['historia_pro_monthly'],
  android: ['historia_pro_monthly'],
};
```

If your real product IDs in App Store Connect / Play Console are different, update both arrays.

---

## 7. End-to-end test checklist

Before you ship to users, walk through every one of these. If any fails, do not ship — open Cloud Functions logs and trace.

### Test #1 — Fresh purchase (sandbox)
- [ ] On a sandbox-signed-in iPhone, open the app, hit **Subscribe**.
- [ ] Confirm the App Store sheet shows the product.
- [ ] Complete the trial purchase.
- [ ] In Firebase Console → Firestore → `subscriptions/{your-uid}`, verify these fields are populated:
  - [ ] `status: 'trial'` or `'active'`
  - [ ] `subscriptionEndDate`: a real ISO date matching the trial end
  - [ ] `originalTransactionId`: a non-empty string
  - [ ] `latestReceipt`: a long base64 string
  - [ ] `environment: 'sandbox'`
  - [ ] `autoRenewStatus: true`
  - [ ] `welcomeEmailSentAt`: an ISO timestamp (set after the welcome email succeeds)
- [ ] Check email inbox — Historia Pro welcome email arrived once.
- [ ] App UI shows premium features unlocked (Levels screen, Gratitude Reflections, etc.).

### Test #2 — Cancel via App Store
- [ ] On the same sandbox account, iOS Settings → Apple Account → Subscriptions → cancel Historia Pro.
- [ ] Wait ~30 seconds for Apple to send the ASSN.
- [ ] Watch logs: `firebase functions:log --only appleAssnWebhook`. You should see `applied DID_CHANGE_RENEWAL_STATUS (AUTO_RENEW_DISABLED)`.
- [ ] In Firestore: `subscriptionEndDate` should be unchanged (you keep access until expiry), but `autoRenewStatus: false` and `cancellationDate` set.
- [ ] App UI: still premium until `subscriptionEndDate` passes.

### Test #3 — Trial expiry (force date)
- [ ] In Firestore, manually set `trialEndDate` to a past date for your test user.
- [ ] Force-quit and relaunch the app.
- [ ] Watch console logs in dev for `[subscriptionStore] flipping stale entitlement to expired`.
- [ ] Firestore subscription doc should now have `status: 'expired'`, `tier: 'free'`, `isOnTrial: false`.
- [ ] App UI: premium features locked.

### Test #4 — Refund (Apple sandbox)
- [ ] In App Store Connect → Sales and Trends → manually refund a sandbox transaction (or use the StoreKit test tool to issue a `REFUND` notification).
- [ ] Watch logs: should see `applied REFUND for uid=…`.
- [ ] Firestore: `status: 'cancelled'`, `cancellationReason: 'refund'`, `cancellationDate` set.

### Test #5 — Restore purchases
- [ ] Reinstall the app. Sign in. Tap **Restore Purchases**.
- [ ] Firestore should re-populate with the canonical state from Apple — real dates, not fabricated.

### Test #6 — Free user can earn but not redeem
- [ ] Sign out, sign in as a free user.
- [ ] Create a post → toast says "Post created — +X pts. Upgrade to Pro to redeem."
- [ ] `pointsBalance` on user doc increases.
- [ ] Try to call `processRewards` directly (dev tool / Postman) with this user's ID token → expect HTTP 403 with `requiresUpgrade: true`.

### Test #7 — Subscriber level badge
- [ ] As a Pro subscriber, post in the feed → your name in the post header shows a colored level pill next to it (e.g. "Liberty Sentinel").
- [ ] As a free user, no pill appears (clean username only).
- [ ] In a group chat, sender name has the level pill (Pro) or none (free).
- [ ] On `ProfileView`, the level pill appears under the username (Pro only).
- [ ] On `NearbyUsersScreen`, each Pro user's card shows their level pill.

### Test #8 — Levels screen gate
- [ ] As a free user, navigate directly to `Levels` (e.g. via deep link `historia://Levels?userId=...`).
- [ ] Should see the upgrade gate ("Levels & Rewards — Unlock... Upgrade to Pro"), not the leaderboard.
- [ ] Tap **Upgrade to Pro** → routes to Subscription screen.

### Test #9 — Welcome email idempotency
- [ ] In Firestore, manually clear `welcomeEmailSentAt` on a Pro user.
- [ ] Trigger another subscribe event (e.g. force-call `sendWelcomeEmail` via the store).
- [ ] Email should send once. The flag should be set again.
- [ ] Trigger again — email should NOT send. Logs should show `skip — already sent`.

### Test #10 — Bundled in
Run through every existing Pro perk you didn't touch to confirm nothing regressed:
- [ ] Offline maps download — gated.
- [ ] Bookmark beyond 10 — gated.
- [ ] Ask Bede — Pro = unlimited, free = 10/day.
- [ ] Gratitude Reflections — gated (PRO badge for free users on the journal card).

---

## 8. What's in the code now (file-by-file)

### Mobile (React Native)

| File | Change |
|---|---|
| `src/types/index.ts` | `SubscriptionRecord` gained `originalTransactionId`, `purchaseToken`, `latestReceipt`, `gracePeriodExpiresDate`, `autoRenewStatus`, `cancellationDate`, `cancellationReason`, `environment`, `welcomeEmailSentAt`. |
| `src/services/subscriptionService.ts` | `isPremiumActive` now compares `subscriptionEndDate`/`trialEndDate`/`gracePeriodExpiresDate` to `now`. New `isStaleEntitlement` helper. |
| `src/store/subscriptionStore.ts` | App-open auto-expires stale subs. `purchaseUpdatedListener` calls `validateReceipt` server-side, stores real expiry / status / env. `restorePurchases` does the same — no more fabricated 30-day windows. |
| `src/screens/LevelsScreen.tsx` | Internal premium gate — defense in depth for deep-link bypass. |
| `src/components/ui/LevelTag.tsx` | NEW — pretty pill (coin + level name). Returns `null` for non-Pro users. |
| `src/components/ui/Post.tsx` | LevelTag in post header. |
| `src/components/ui/MessageBubble.tsx` | LevelTag next to sender name in group chats. |
| `src/components/ui/Comment.tsx` | LevelTag in comment author. |
| `src/screens/ProfileView.tsx` | Replaced `LevelBadge` with `LevelTag`. |
| `src/screens/NearbyUsersScreen.tsx` | Replaced inline level chip with `LevelTag`. |
| `src/services/algoliaUsersService.ts` | `NearbyUserHit` adds `isPremium`. |
| `src/hooks/usePosts.ts`, `useVisits.ts`, `useReferral.ts` | Free users see "Upgrade to Pro to redeem" nudge in earning toasts. |

### Cloud Functions

| File | Change |
|---|---|
| `functions/src/subscriptionLifecycle.ts` | NEW — shared helpers (state transitions, Firestore writers, status mappings). |
| `functions/src/subscriptions.ts` | NEW — `appleAssnWebhook`, `googlePlayRtdnWebhook`, `validateReceipt` Cloud Functions. |
| `functions/src/index.ts` | Exports the 3 new functions. `processRewards` now requires Firebase auth + premium check + email match. `sendSubscriptionWelcome` is idempotent via `welcomeEmailSentAt` flag. |
| `functions/src/bede.ts` | `isPremium` mirrors the new client logic (date-aware). |

---

## 9. Algolia user index — one extra field

For the LevelTag to render on `NearbyUsersScreen`, the Algolia users index must include `isPremium` per record. The Firebase Algolia extension should already be syncing all User fields — verify in Algolia dashboard that recent records have `isPremium` populated. If not, in the Algolia extension config, add `isPremium` to the **transform** allowlist OR redeploy the user-sync Cloud Function with `isPremium` included.

If you don't fix this, free users on `NearbyUsersScreen` will simply see no pill — which is fine — but Pro users won't either, since `isPremium` will be `undefined`. So fix it.

---

## 10. What this still doesn't do (intentionally)

- **No StoreKit 2 receipt parsing on-device.** We rely entirely on server-side validation. That's the right call.
- **No client-side caching of subscription state.** Every app open hits Firestore. That's intentional — caching premium status is risky, and Firestore reads are cheap.
- **No automatic "convert trial to paid" UI.** When a trial ends and Apple charges the card, the ASSN webhook flips status to `active` automatically. The app picks it up next launch. No banner/toast yet.
- **No churn re-engagement campaign.** When a sub goes to `expired` or `cancelled`, you might want to email the user. Out of scope for this round.
