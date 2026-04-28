import * as admin from 'firebase-admin';

/**
 * Subscription lifecycle helpers — pure data transformations + Firestore writes
 * that the various subscription-related Cloud Functions all share.
 *
 *   - Apple App Store Server Notifications v2 webhook (`appleAssnWebhook`)
 *   - Google Play Real-time Developer Notifications (`googlePlayRtdnWebhook`)
 *   - Receipt validation HTTP endpoint (`validateReceipt`)
 *
 * The mobile client mirrors much of this logic in `src/services/subscriptionService.ts`
 * — keep the two in sync.
 */

const SUBSCRIPTIONS = 'subscriptions';
const USERS = 'users';

export type SubscriptionStatus =
  | 'free'
  | 'trial'
  | 'active'
  | 'expired'
  | 'cancelled';

export type Platform = 'ios' | 'android';

export interface CanonicalSubscriptionState {
  status: SubscriptionStatus;
  /** ISO string. Subscription start. */
  startsAt: string | null;
  /** ISO string. Effective end of access. */
  endsAt: string | null;
  isTrial: boolean;
  autoRenewStatus: boolean;
  environment: 'production' | 'sandbox';
  productId?: string | null;
  originalTransactionId?: string | null;
  purchaseToken?: string | null;
  /** Set if the user is in a billing-retry / grace window. */
  gracePeriodExpiresDate?: string | null;
  cancellationDate?: string | null;
  cancellationReason?: string | null;
}

/**
 * Locate the user's UID by Apple's stable `originalTransactionId` (set on the
 * subscription doc at purchase time).
 */
export async function findUidByOriginalTransactionId(
  db: FirebaseFirestore.Firestore,
  originalTransactionId: string,
): Promise<string | null> {
  const snap = await db
    .collection(SUBSCRIPTIONS)
    .where('originalTransactionId', '==', originalTransactionId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

/**
 * Locate the user's UID by Google Play's `purchaseToken`.
 */
export async function findUidByPurchaseToken(
  db: FirebaseFirestore.Firestore,
  purchaseToken: string,
): Promise<string | null> {
  const snap = await db
    .collection(SUBSCRIPTIONS)
    .where('purchaseToken', '==', purchaseToken)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

/**
 * Apply a canonical state to the user's Firestore subscription doc + the
 * mirrored fields on their user doc. Idempotent — same payload twice is
 * safe.
 */
export async function applyCanonicalState(
  db: FirebaseFirestore.Firestore,
  userId: string,
  state: CanonicalSubscriptionState,
  platform: Platform,
): Promise<void> {
  const isPremium = computeIsPremium(state);

  await db.collection(SUBSCRIPTIONS).doc(userId).set(
    {
      tier: isPremium ? 'premium' : 'free',
      status: state.status,
      isOnTrial: state.isTrial,
      trialStartDate: state.isTrial ? state.startsAt : null,
      trialEndDate: state.isTrial ? state.endsAt : null,
      subscriptionStartDate: state.startsAt,
      subscriptionEndDate: state.endsAt,
      productId: state.productId ?? null,
      originalTransactionId: state.originalTransactionId ?? null,
      purchaseToken: state.purchaseToken ?? null,
      gracePeriodExpiresDate: state.gracePeriodExpiresDate ?? null,
      autoRenewStatus: state.autoRenewStatus,
      cancellationDate: state.cancellationDate ?? null,
      cancellationReason: state.cancellationReason ?? null,
      environment: state.environment,
      platform,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  await db.collection(USERS).doc(userId).update({
    isPremium,
    subscriptionStatus: state.status,
    updatedAt: new Date().toISOString(),
  }).catch(err => {
    console.warn(`applyCanonicalState: user doc update failed for ${userId}`, err);
  });
}

function computeIsPremium(state: CanonicalSubscriptionState): boolean {
  const now = new Date();
  if (state.status === 'active') {
    if (!state.endsAt) return true;
    if (new Date(state.endsAt) > now) return true;
  }
  if (state.status === 'trial' && state.endsAt) {
    if (new Date(state.endsAt) > now) return true;
  }
  if (state.gracePeriodExpiresDate && new Date(state.gracePeriodExpiresDate) > now) {
    return true;
  }
  return false;
}

/** Apple's transactionInfo `expiresDate` is ms-since-epoch; convert to ISO. */
export function msToIso(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

/**
 * Map an Apple ASSN v2 `notificationType` (+ optional subtype) to a
 * canonical SubscriptionStatus + flags. The signed transactionInfo gives us
 * the dates; this only decides what to call the resulting state.
 *
 * Reference: https://developer.apple.com/documentation/appstoreservernotifications/notificationtype
 */
export function appleNotificationToState(
  notificationType: string,
  subtype: string | undefined,
  txInfo: {
    expiresDate?: number;
    purchaseDate?: number;
    productId?: string;
    originalTransactionId?: string;
    environment?: 'Production' | 'Sandbox';
  },
  renewalInfo: {
    autoRenewStatus?: 0 | 1;
    gracePeriodExpiresDate?: number;
  },
): CanonicalSubscriptionState {
  const env: 'production' | 'sandbox' =
    txInfo.environment === 'Sandbox' ? 'sandbox' : 'production';
  const startsAt = msToIso(txInfo.purchaseDate);
  const endsAt = msToIso(txInfo.expiresDate);
  const grace = msToIso(renewalInfo.gracePeriodExpiresDate);
  const autoRenew = renewalInfo.autoRenewStatus !== 0;

  // Defaults — refined per notificationType below.
  let status: SubscriptionStatus = 'active';
  let isTrial = false;
  let cancellationDate: string | null = null;
  let cancellationReason: string | null = null;

  switch (notificationType) {
    case 'SUBSCRIBED':
      // Subtype INITIAL_BUY (first time) or RESUBSCRIBE (re-up after lapse).
      isTrial = subtype === 'INITIAL_BUY';
      status = isTrial ? 'trial' : 'active';
      break;
    case 'DID_RENEW':
      status = 'active';
      break;
    case 'OFFER_REDEEMED':
      status = 'active';
      break;
    case 'DID_CHANGE_RENEWAL_STATUS':
      // AUTO_RENEW_DISABLED — user turned off auto-renew. Still has access
      // until expiresDate. Status stays 'active' with autoRenewStatus=false.
      status = 'active';
      cancellationDate = subtype === 'AUTO_RENEW_DISABLED' ? new Date().toISOString() : null;
      break;
    case 'DID_FAIL_TO_RENEW':
      // Subtype GRACE_PERIOD if Apple is still retrying; otherwise expired.
      if (subtype === 'GRACE_PERIOD') {
        status = 'active';
      } else {
        status = 'expired';
      }
      break;
    case 'GRACE_PERIOD_EXPIRED':
      status = 'expired';
      break;
    case 'EXPIRED':
      status = 'expired';
      break;
    case 'REVOKE':
      status = 'cancelled';
      cancellationReason = 'revoked';
      cancellationDate = new Date().toISOString();
      break;
    case 'REFUND':
      status = 'cancelled';
      cancellationReason = 'refund';
      cancellationDate = new Date().toISOString();
      break;
    case 'REFUND_DECLINED':
      // No state change.
      break;
    case 'CONSUMPTION_REQUEST':
      // Apple is asking us if a refund should be granted. No-op for state.
      break;
    case 'PRICE_INCREASE':
      // Status doesn't change; user must consent. No-op.
      break;
    default:
      console.warn(`Unhandled Apple notification type: ${notificationType}`);
      break;
  }

  return {
    status,
    startsAt,
    endsAt,
    isTrial,
    autoRenewStatus: autoRenew,
    environment: env,
    productId: txInfo.productId ?? null,
    originalTransactionId: txInfo.originalTransactionId ?? null,
    gracePeriodExpiresDate: grace,
    cancellationDate,
    cancellationReason,
  };
}

/**
 * Google Play notification types are integers documented at
 * https://developer.android.com/google/play/billing/rtdn-reference#sub
 */
export function googleNotificationTypeToStatus(
  notificationType: number,
): { status: SubscriptionStatus; cancellationReason?: string } {
  switch (notificationType) {
    case 1: // SUBSCRIPTION_RECOVERED
      return { status: 'active' };
    case 2: // SUBSCRIPTION_RENEWED
      return { status: 'active' };
    case 3: // SUBSCRIPTION_CANCELED — still has access until expiry
      return { status: 'active', cancellationReason: 'user_cancelled' };
    case 4: // SUBSCRIPTION_PURCHASED
      return { status: 'active' };
    case 5: // SUBSCRIPTION_ON_HOLD
      return { status: 'expired', cancellationReason: 'on_hold' };
    case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
      return { status: 'active' };
    case 7: // SUBSCRIPTION_RESTARTED
      return { status: 'active' };
    case 8: // SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
      return { status: 'active' };
    case 9: // SUBSCRIPTION_DEFERRED
      return { status: 'active' };
    case 10: // SUBSCRIPTION_PAUSED
      return { status: 'expired', cancellationReason: 'paused' };
    case 11: // SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
      return { status: 'active' };
    case 12: // SUBSCRIPTION_REVOKED
      return { status: 'cancelled', cancellationReason: 'revoked' };
    case 13: // SUBSCRIPTION_EXPIRED
      return { status: 'expired' };
    default:
      return { status: 'active' };
  }
}

/** Quick alias — returns admin Firestore. */
export function fs(): FirebaseFirestore.Firestore {
  return admin.firestore();
}
