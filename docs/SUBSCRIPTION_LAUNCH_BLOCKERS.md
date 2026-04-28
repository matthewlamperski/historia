# Subscription Launch Blockers

The current TestFlight build is **safe to ship** — Pro perks are gated, the Apple ASSN webhook is deployed, and existing testers won't lose access. However, before going to **production / public launch**, work through every item in this list.

Last updated when: this hand-off was written. Update the **Status** column as you complete each.

---

## A. Configure App Store Connect (Apple webhook)

**Status: ⏳ pending — needed before any production purchase tracking works**

1. App Store Connect → **My Apps → Historia → App Information** (under General).
2. Scroll to **App Store Server Notifications**.
3. Set both URLs to the deployed webhook:
   - **Production Server URL**: `https://us-central1-historia-application.cloudfunctions.net/appleAssnWebhook`
   - **Sandbox Server URL**: same URL — the function reads the `environment` field on each notification and routes accordingly.
4. **Version**: select **Version 2** (V2 is what the code parses).
5. Click **Save**.

**Test it:** Use the **Send Test Notification** button on the same page, then watch:
```
firebase functions:log --only appleAssnWebhook --project historia-application
```
You should see a `verifyAndDecodeNotification` succeed within seconds.

---

## B. Apple intro offer setup (free trial)

**Status: ⏳ pending — needed for the 14-day trial to actually work in production**

The mobile code currently treats the first purchase as a 14-day trial. For Apple to actually grant a free trial (vs. immediately charging the user), you need to configure an **Introductory Offer** on the subscription product in App Store Connect:

1. App Store Connect → **My Apps → Historia → Monetization → In-App Purchases**.
2. Open the `historia_pro_monthly` subscription (or whatever the production SKU is).
3. **Introductory Offers** → **Set up Introductory Offer**.
4. Type: **Free Trial**, Duration: **14 days**.
5. Apply to all territories where the sub is sold.
6. Save and submit for review with your next binary.

**If you skip this**: Apple charges the user immediately on subscribe. The app's "14-day trial" badge in the UI would lie. Either fix this OR remove the trial copy from `SubscriptionScreen.tsx`.

---

## C. Production product IDs

**Status: ⏳ pending — confirm matches App Store Connect**

`src/store/subscriptionStore.ts` lines 60-63:
```ts
export const PRODUCT_IDS = {
  ios: ['historia_pro_monthly'],
  android: ['historia_pro_monthly'],
};
```

Verify these match the **exact Product IDs** configured in App Store Connect → My Apps → Historia → Subscriptions. Apple is case-sensitive and unforgiving — a typo here means no products load and the Subscribe button does nothing.

---

## D. Google Play setup (when launching Android)

**Status: 🟡 deferred — only needed before Android launch**

The Google Play webhook (`googlePlayRtdnWebhook`) is **written but not deployed** because Google Play Console isn't set up yet. The two secrets are placeholder values (`com.historia.app` and `{}`).

Before shipping Android:

### D.1 — Service account
1. **GCP Console → IAM & Admin → Service Accounts** in the `historia-application` project.
2. Create one named `historia-play-billing-reader`. No project roles needed.
3. **Keys** tab → Add Key → JSON. Download the JSON.
4. **Google Play Console → Setup → API access** → link the service account → grant:
   - **View financial data, orders, and cancellation survey responses**
   - **Manage orders and subscriptions**
5. Replace the placeholder secret with the real JSON:
   ```bash
   firebase functions:secrets:set GOOGLE_PLAY_SERVICE_ACCOUNT --data-file path/to/key.json --project historia-application
   ```

### D.2 — Pub/Sub topic
1. **GCP Console → Pub/Sub → Topics → Create Topic**.
2. Topic ID: **`google-play-rtdn`** (exact spelling — must match the one declared in `functions/src/subscriptions.ts:googlePlayRtdnWebhook`).
3. After creation, click **Show info panel** in the top right of the topic page.
4. **Permissions** section in the panel → **Add principal**:
   - Principal: `google-play-developer-notifications@system.gserviceaccount.com`
   - Role: **Pub/Sub Publisher**
   - (Confirm the email by visiting Play Console → Setup → Real-time developer notifications — Google shows the exact email there.)

### D.3 — Wire RTDN in Play Console
1. Play Console → **Monetize → Subscriptions → Real-time developer notifications**.
2. **Topic name** (full path):
   ```
   projects/historia-application/topics/google-play-rtdn
   ```
3. Click **Send test publication**.
4. Watch logs:
   ```
   firebase functions:log --only googlePlayRtdnWebhook --project historia-application
   ```
   Should log `googlePlayRtdnWebhook: test notification received`.

### D.4 — Deploy the webhook
```bash
cd functions
npm run build
firebase deploy --only functions:googlePlayRtdnWebhook --project historia-application --force
```

---

## E. Re-enable strict client-side expiration check

**Status: 🟡 deferred — re-enable after both webhooks are firing reliably**

`src/store/subscriptionStore.ts` has a commented-out auto-expire block (look for the comment block ending in *"Re-enable this block once google-play-rtdn topic is wired up"*). Currently the client trusts the `status` field — if a webhook event is lost, a cancelled user could keep premium until they trigger a state-changing event.

Once both Apple ASSN and Google Play RTDN have been firing reliably for a week or two:
1. Uncomment the auto-expire block.
2. Tighten `isPremiumActive` in `src/services/subscriptionService.ts` — remove the "no end-date = trust status" branches; require explicit dates.
3. Mirror the same tightening in `functions/src/bede.ts` and `functions/src/index.ts`.

This is defense-in-depth: webhooks are primary, client-side check is the safety net.

---

## F. Migrate existing subscription docs (one-time)

**Status: ⏳ pending — needed before the strict check from §E is re-enabled**

Existing TestFlight subscribers have docs from old code with:
- `status: 'trial'`
- `trialEndDate`: 14 days from their purchase (long expired for early testers)
- `subscriptionStartDate`: same as `trialEndDate` (weird)
- `subscriptionEndDate`: missing
- `originalTransactionId`: missing

When you tighten the entitlement check (§E), these users would all get downgraded. To prevent that, run a one-time migration script that calls Apple's `getAllSubscriptionStatuses` for each affected user and replaces the doc with canonical state.

Sketch (write this script when you're ready):
```js
// scripts/migrate-subscriptions.js
// 1. Query all subscription docs where status === 'trial' AND trialEndDate < now.
// 2. For each, call Apple's App Store Server API to get current state.
//    Requires the user's transactionId — Apple's lookup endpoint accepts it.
// 3. Write the canonical state back via subscriptionLifecycle.applyCanonicalState.
```

You can also bypass this by asking each existing tester to tap **Restore Purchases** once after the new build — the new `restorePurchases` flow validates against Apple and writes correct state. Less reliable but zero engineering cost.

---

## G. Algolia user index — `isPremium` field

**Status: ⏳ pending — UI gap on `NearbyUsersScreen` until done**

The `LevelTag` rendered next to each user on `NearbyUsersScreen` only shows for Pro users. The screen's user data comes from the Algolia users index, which must include the `isPremium` field per record.

1. Algolia dashboard → `users` index → check that recent records include an `isPremium` boolean field.
2. If missing: in the Firebase Algolia Search extension config (Firebase Console → Extensions), add `isPremium` to the **transform** allowlist.
3. Trigger a re-index (or modify each user doc in Firestore once to force the extension to re-sync).

If you skip this: Pro users on `NearbyUsersScreen` won't show their level tag (free users wouldn't either, but that's the correct behavior). Only nice-to-have for now.

---

## H. App Store Connect privacy + tax + banking

**Status: must be done before Apple lets you sell**

Standard App Store boilerplate — confirm none of these are blocking:
- **Tax forms** signed in App Store Connect → Agreements, Tax, and Banking.
- **Banking info** filled in.
- **Privacy policy URL** added to the app listing.
- **Subscription terms URL** (Auto-renewing Subscription disclosure) added to `SubscriptionScreen.tsx` near the Subscribe button — Apple requires the user see "by subscribing you agree to..." with links to T&Cs and Privacy.
- App Store Connect → Subscription Group → review group description and "what's included" copy.

If your test sandbox subscriber works but production doesn't, this is usually the cause.

---

## I. Refunds and customer-care UX

**Status: 🟡 nice-to-have**

Currently when an Apple webhook fires `REFUND` or `REVOKE`, the Firestore doc is updated to `cancelled` and access is dropped. The user gets no notification.

Consider:
- Send a "your subscription was cancelled" email when status flips to `cancelled` or `expired` (trigger from a Firestore document write).
- Show a re-subscribe banner on app open if `subscriptionStatus === 'expired'`.

---

## J. Server-side validation telemetry

**Status: 🟡 nice-to-have**

`validateReceipt` writes to Cloud Functions logs but doesn't track outcomes. Add metrics for:
- Validation success rate
- Most common failure modes (e.g. expired sandbox cert vs malformed receipt)
- Time to validate (Apple's API can be slow)

This becomes important once you have meaningful purchase volume.

---

## K. Welcome email from Doug — already shipping

**Status: ✅ done — verify on next signup**

The `onUserCreate` Cloud Function sends Doug's welcome DM on every new account. Confirm working by signing up a fresh account and watching:
```
firebase functions:log --only onUserCreate --project historia-application
```

---

## What's safe to ship in TestFlight RIGHT NOW

Everything below is in the current code and will work once you build + upload:

- ✅ All Pro perks gated correctly (Bookmarks 10-cap, Offline Maps, Ask Bede 10/day, Gratitude Reflections, Levels screen)
- ✅ `processRewards` Cloud Function refuses non-Pro callers with HTTP 403
- ✅ Free users earn points but see "Upgrade to Pro to redeem" toast nudges
- ✅ `LevelTag` pill appears next to Pro users' names in posts, comments, group chats, profile, and nearby (once Algolia §G is done)
- ✅ New subscriptions go through `validateReceipt` → real Apple expiry / dates / environment captured in Firestore
- ✅ `originalTransactionId` captured on purchase → Apple webhook can match events to users
- ✅ Apple ASSN v2 webhook ready to handle renewals, cancellations, refunds, expiry — pending §A configuration in App Store Connect
- ✅ Lenient client-side `isPremium` — existing testers don't lose access; webhooks correct state over time
- ✅ Welcome email is idempotent (won't double-send on retries)

## What's NOT yet enforced for TestFlight

- App Store Connect notification URL (§A) — until configured, cancellations / refunds / renewal failures aren't received
- Apple intro offer (§B) — sandbox testing of the 14-day trial works but production wouldn't grant it without this
- Strict client-side expiration check (§E) — temporarily lenient

## Order to do these in

1. **§A** — configure ASSN URL in App Store Connect — *do this today*
2. **§B + §C** — confirm intro offer + product IDs — *do this before submitting for review*
3. **§H** — privacy / tax / banking — *standard, do whenever*
4. **§G** — Algolia field — *whenever*
5. **§D** — full Google Play setup — *only when you're ready to ship Android*
6. **§F** — migration script — *write before re-enabling §E*
7. **§E** — re-enable strict expiration — *after webhooks have proven themselves for a week or two*
8. **§I, §J** — polish — *post-launch*

That's the full launch path.
