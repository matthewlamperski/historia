# Historia Subscription Setup Guide

This guide walks you through setting up the $1.99/month Historia Premium subscription on both Apple App Store and Google Play Store, then wiring the real product IDs into the app.

---

## Overview

- **Product ID (both platforms):** `historia_pro_monthly`
- **Price:** $1.99/month
- **Trial:** 14 days free
- **Library:** `react-native-iap` v12

The placeholder product ID `historia_pro_monthly` is already in the code at:
```
src/store/subscriptionStore.ts → PRODUCT_IDS
```
Replace both `ios` and `android` arrays with your real product IDs once created.

---

## Part 1: Apple App Store Connect (iOS)

### Prerequisites
- An Apple Developer account ($99/year) at [developer.apple.com](https://developer.apple.com)
- Your app created in App Store Connect
- Signed Paid Applications agreement in App Store Connect > Agreements

### Step 1: Set Up Agreements
1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Go to **Agreements, Tax, and Banking**
3. Accept the **Paid Applications** agreement — you **cannot** sell subscriptions without this
4. Fill in your banking and tax info

### Step 2: Create a Subscription Group
1. In App Store Connect, select your app (Historia)
2. Go to **App Store** > **Subscriptions** in the left sidebar
3. Click the **+** button to create a **Subscription Group**
4. Name it: `Historia Premium` (this name appears to users if they manage subscriptions)
5. Click **Create**

### Step 3: Create the Subscription Product
1. Inside the group you just created, click **+** under "Subscriptions"
2. Fill in:
   - **Reference Name:** `Historia Premium Monthly` (internal only)
   - **Product ID:** `historia_pro_monthly` ← **This must match exactly**
3. Click **Create**

### Step 4: Configure the Subscription
1. Select your new subscription product
2. Set **Duration:** 1 Month
3. Under **Subscription Prices**, click **+** and set:
   - Price: **$1.99 USD** (Tier 2 in Apple's pricing matrix)
   - This auto-propagates to other currencies — review as needed
4. Under **Free Trial**, click **+**:
   - Duration: **14 days**
5. Under **Subscription Display Name** (shown to users):
   - Add at least one localization (English)
   - Display Name: `Historia Premium`
   - Description: `Unlock points, badges, offline maps, gratitude reflections, and unlimited bookmarks.`

### Step 5: Submit the Product for Review
In-app purchases must be submitted with your first app version that uses them:
1. Go to **App Store** > **In-App Purchases** in your next app version submission
2. Add `historia_pro_monthly` to the version
3. Apple reviews IAPs alongside the app — approval typically takes 1–3 days

### Step 6: Enable StoreKit in Xcode (already done via react-native-iap)
1. Open `ios/historia.xcworkspace` in Xcode
2. Select the `historia` target > **Signing & Capabilities**
3. Click **+ Capability** and add **In-App Purchase**

### Step 7: Test with Sandbox
1. In App Store Connect > **Users and Access** > **Sandbox Testers**, create a sandbox account
   - Use a **new email address** not associated with any Apple ID
2. On a **real device** (simulator cannot purchase):
   - Sign out of the App Store (Settings > App Store)
   - Run the app in debug/development mode
   - When purchase is triggered, sign in with your sandbox account
3. Sandbox purchases are instant with no charge

---

## Part 2: Google Play Console (Android)

### Prerequisites
- A Google Play Developer account ($25 one-time fee) at [play.google.com/console](https://play.google.com/console)
- Your app created and at least in **Internal Testing** track (required for billing)
- A signed APK/AAB uploaded

### Step 1: Set Up Payment Profile
1. In Play Console, go to **Setup** > **Payments profile**
2. Create or link a payments profile — required for paid features

### Step 2: Create the Subscription
1. In Play Console, select Historia
2. Go to **Monetize** > **Products** > **Subscriptions**
3. Click **Create subscription**
4. Fill in:
   - **Product ID:** `historia_pro_monthly` ← **Must match exactly**
   - **Name:** `Historia Premium Monthly` (displayed to users)
   - **Description:** `Unlock points, badges, offline maps, gratitude reflections, and unlimited bookmarks.`

### Step 3: Configure Pricing and Trial
1. Under **Base plans**, click **+ Add base plan**
   - **Base plan ID:** `monthly`
   - **Billing period:** Monthly
   - **Price:** Set USD to $1.99, others auto-fill
2. Under the base plan, click **+ Add free trial**
   - **Free trial period:** 14 days
3. Click **Activate** on the base plan

### Step 4: Add Billing Permission to AndroidManifest.xml
React-native-iap handles this automatically via autolinking in RN 0.82. Verify it's present:
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="com.android.vending.BILLING" />
```

### Step 5: Test with License Testers
1. In Play Console > **Setup** > **License testing**, add your personal Google account email
2. License testers can make test purchases that don't charge real money
3. Make sure the app is published to **Internal Testing** at minimum — billing does NOT work on local debug builds without at least one uploaded AAB
4. Download the app from the Internal Testing link on a device with your tester account

---

## Part 3: Wire in Your Real Product IDs

Once your products are approved, update the product IDs in the code:

```typescript
// src/store/subscriptionStore.ts
export const PRODUCT_IDS = {
  ios: ['your_real_ios_product_id'],       // e.g. 'historia_pro_monthly'
  android: ['your_real_android_product_id'], // e.g. 'historia_pro_monthly'
};
```

If you used `historia_pro_monthly` as specified, no change is needed.

---

## Part 4: Receipt Validation (Production Recommendation)

The current implementation trusts the device-side receipt. For a production app, you should validate receipts server-side:

### Why it matters
- Prevents subscription spoofing
- Authoritative source of truth for subscription status

### Option A: Firebase Cloud Functions (recommended for this stack)
1. Create a Cloud Function triggered on a Firestore write to `subscriptions/{userId}`
2. Call Apple's `/verifyReceipt` endpoint or Google's Subscription API
3. Update the subscription document with validated status

### Option B: RevenueCat (easier, third-party)
- [revenuecat.com](https://revenuecat.com) — free tier for <$10k/mo revenue
- Handles validation, webhook events, and subscriber management

---

## Part 5: Subscription Status Webhooks

To catch subscription renewals, cancellations, and expirations:

### Apple
1. In App Store Connect > Your App > **App Information** > **App Store Server Notifications**
2. Set Production Server URL to your Cloud Function endpoint
3. Apple sends `RENEWAL`, `CANCEL`, `DID_FAIL_TO_RENEW`, etc.

### Google
1. In Play Console > Your App > **Monetize** > **Subscriptions** > **Real-time developer notifications**
2. Link a Cloud Pub/Sub topic
3. Subscribe your Cloud Function to the topic

---

## Part 6: Testing Checklist

### iOS Sandbox
- [ ] Sandbox tester account created in App Store Connect
- [ ] Real device (not simulator) used for testing
- [ ] App Store account signed out, sandbox account used on first purchase prompt
- [ ] Subscription screen appears when hitting locked feature
- [ ] Purchase completes and app state updates to `isPremium: true`
- [ ] "Restore Purchases" correctly restores a previous sandbox purchase

### Android License Test
- [ ] Internal Testing track has an uploaded AAB
- [ ] License tester email added to Play Console
- [ ] Purchase completes on Android device
- [ ] Restore Purchases works

### General
- [ ] Subscription screen close button dismisses correctly
- [ ] Free user sees promo card in Profile tab
- [ ] Free user sees "Offline Maps" premium lock badge on map
- [ ] Bookmark gate triggers subscription screen when appropriate
- [ ] Premium user sees points balance card in Profile tab

---

## Quick Reference

| Item | Value |
|------|-------|
| iOS Product ID | `historia_pro_monthly` |
| Android Product ID | `historia_pro_monthly` |
| Price | $1.99/month |
| Free Trial | 14 days |
| Money-Back Guarantee | 180 days |
| Code file for IDs | `src/store/subscriptionStore.ts` → `PRODUCT_IDS` |
| Firestore collection | `subscriptions/{userId}` |
| User document field | `isPremium`, `subscriptionStatus`, `pointsBalance` |
