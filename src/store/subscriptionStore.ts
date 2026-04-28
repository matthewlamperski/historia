import { create } from 'zustand';
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  getPurchaseHistory,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  Subscription,
  SubscriptionPurchase,
  PurchaseError,
} from 'react-native-iap';
import { Platform } from 'react-native';
import { SubscriptionRecord, SubscriptionStatus, User } from '../types';
import { subscriptionService } from '../services/subscriptionService';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS } from '../services/firebaseConfig';

const WELCOME_EMAIL_URL =
  'https://us-central1-historia-application.cloudfunctions.net/sendSubscriptionWelcome';
const VALIDATE_RECEIPT_URL =
  'https://us-central1-historia-application.cloudfunctions.net/validateReceipt';

interface ValidatedReceipt {
  startsAt: string;            // ISO
  endsAt: string;              // ISO
  isTrial: boolean;
  autoRenewStatus: boolean;
  environment: 'production' | 'sandbox';
}

/**
 * Calls the validateReceipt Cloud Function. Returns the canonical subscription
 * state from Apple/Google, or throws if validation fails (caller falls back
 * to local approximation).
 */
async function validateReceiptOnServer(args: {
  userId: string;
  platform: 'ios' | 'android';
  productId: string;
  receipt: string;
  purchaseToken: string | null;
  originalTransactionId: string | null;
}): Promise<ValidatedReceipt> {
  const res = await fetch(VALIDATE_RECEIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`validateReceipt ${res.status}: ${text}`);
  }
  return (await res.json()) as ValidatedReceipt;
}

async function sendWelcomeEmail(userId: string): Promise<void> {
  try {
    const doc = await firestore().collection(COLLECTIONS.USERS).doc(userId).get();
    const user = doc.data() as User | undefined;
    if (!user?.email) {
      console.warn('sendWelcomeEmail: no email on user', userId);
      return;
    }
    const fullName = (user.name ?? '').trim();
    const [firstName, ...rest] = fullName.split(/\s+/);
    const lastName = rest.join(' ') || undefined;

    // Send the ID token so the Cloud Function can record the welcome-sent
    // flag against the right uid (drives idempotency).
    const idToken = await auth().currentUser?.getIdToken().catch(() => null);

    const res = await fetch(WELCOME_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({
        email: user.email,
        firstName: firstName || undefined,
        lastName,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn('sendWelcomeEmail failed:', res.status, text);
    }
  } catch (err) {
    console.warn('sendWelcomeEmail error:', err);
  }
}

// Placeholder product IDs — replace with real IDs from App Store Connect / Google Play Console
// See docs/SUBSCRIPTION_SETUP.md for instructions
export const PRODUCT_IDS = {
  ios: ['historia_pro_monthly'],
  android: ['historia_pro_monthly'],
};

const ACTIVE_PRODUCT_IDS =
  Platform.OS === 'ios' ? PRODUCT_IDS.ios : PRODUCT_IDS.android;

interface SubscriptionState {
  isPremium: boolean;
  isOnTrial: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionData: SubscriptionRecord | null;
  availableProducts: Subscription[];
  isLoading: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  error: string | null;

  // Actions
  initialize: (userId: string) => Promise<void>;
  subscribe: (userId: string) => Promise<void>;
  restorePurchases: (userId: string) => Promise<void>;
  teardown: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

let purchaseUpdateSubscription: ReturnType<typeof purchaseUpdatedListener> | null = null;
let purchaseErrorSubscriptionListener: ReturnType<typeof purchaseErrorListener> | null = null;

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isPremium: false,
  isOnTrial: false,
  subscriptionStatus: 'free',
  subscriptionData: null,
  availableProducts: [],
  isLoading: false,
  isPurchasing: false,
  isRestoring: false,
  error: null,

  setError: error => set({ error }),
  clearError: () => set({ error: null }),

  initialize: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Load subscription record from Firestore
      let record = await subscriptionService.getSubscription(userId);
      if (!record) {
        record = await subscriptionService.createSubscription(userId);
      }

      // Auto-expire on app open is intentionally OFF until both Apple and
      // Google webhooks are deployed and proven. With webhooks doing the
      // lifecycle work server-side, the client's only job is to render the
      // current `status`. The risk of silently revoking access on existing
      // testers (whose docs may have stale fabricated dates from old code)
      // is greater than the benefit of catching the rare lost-webhook case.
      //
      // Re-enable this block once google-play-rtdn topic is wired up and
      // both webhooks have logged successful real-world events.
      //
      // if (subscriptionService.isStaleEntitlement(record)) {
      //   const expired: SubscriptionStatus = 'expired';
      //   await subscriptionService.updateSubscription(userId, {
      //     tier: 'free',
      //     status: expired,
      //     isOnTrial: false,
      //   });
      //   record = { ...record, tier: 'free', status: expired, isOnTrial: false };
      // }

      const isPremium = subscriptionService.isPremiumActive(record);
      const isOnTrial = subscriptionService.isTrialActive(record);

      set({
        subscriptionData: record,
        isPremium,
        isOnTrial,
        subscriptionStatus: record.status,
      });

      // Initialize IAP connection
      await initConnection();

      // Fetch available products from store
      try {
        const products = await getSubscriptions({ skus: ACTIVE_PRODUCT_IDS });
        set({ availableProducts: products });
      } catch (productError) {
        // Products may not load in simulator/development — not a fatal error
        console.warn('Could not fetch subscription products:', productError);
      }

      // Register purchase listener
      purchaseUpdateSubscription = purchaseUpdatedListener(
        async (purchase: SubscriptionPurchase) => {
          const receipt = purchase.transactionReceipt;
          if (!receipt) {
            return;
          }

          try {
            // Capture the platform-specific stable identifiers BEFORE we
            // finish the transaction. These are required for any later
            // server-side validation, webhook matching, and lifecycle
            // tracking. Without them we have no way to tie an Apple/Google
            // server notification back to a user.
            const platformAny = purchase as unknown as {
              originalTransactionIdentifierIOS?: string;
              purchaseToken?: string;
              productId?: string;
            };
            const originalTransactionId =
              platformAny.originalTransactionIdentifierIOS ?? null;
            const purchaseToken = platformAny.purchaseToken ?? null;

            // Try to validate the receipt server-side. If validation succeeds
            // we use the canonical state (real expiresDate, real status). If
            // it fails (e.g. function not yet deployed, network error), fall
            // back to writing local trial state — better than blocking the
            // user post-payment.
            let validated: ValidatedReceipt | null = null;
            try {
              validated = await validateReceiptOnServer({
                userId,
                platform: Platform.OS as 'ios' | 'android',
                productId: purchase.productId,
                receipt,
                purchaseToken,
                originalTransactionId,
              });
            } catch (validationErr) {
              console.warn('Receipt validation failed; using local trial state', validationErr);
            }

            // Acknowledge the purchase to the store
            await finishTransaction({ purchase, isConsumable: false });

            const now = new Date();
            const trialStart = now;
            const trialEndFallback = new Date(now);
            trialEndFallback.setDate(trialEndFallback.getDate() + 14);

            const startsAt = validated?.startsAt ?? trialStart.toISOString();
            const endsAt = validated?.endsAt ?? trialEndFallback.toISOString();
            const isTrial = validated ? validated.isTrial : true;
            const status: SubscriptionStatus = isTrial ? 'trial' : 'active';
            const environment = validated?.environment ?? null;

            await subscriptionService.updateSubscription(userId, {
              tier: 'premium',
              status,
              isOnTrial: isTrial,
              trialStartDate: isTrial ? startsAt : null,
              trialEndDate: isTrial ? endsAt : null,
              subscriptionStartDate: startsAt,
              subscriptionEndDate: endsAt,
              productId: purchase.productId,
              transactionId: purchase.transactionId || null,
              originalTransactionId,
              purchaseToken,
              latestReceipt: receipt,
              autoRenewStatus: validated?.autoRenewStatus ?? true,
              environment,
              platform: Platform.OS as 'ios' | 'android',
            });

            await subscriptionService.updateUserPremiumStatus(userId, true, status);

            // Update local state
            set({
              isPremium: true,
              isOnTrial: isTrial,
              subscriptionStatus: status,
              isPurchasing: false,
            });

            // Fire-and-forget welcome email + Shopify marketing opt-in.
            // The Cloud Function checks `welcomeEmailSentAt` on the
            // subscription doc so re-fires don't double-email.
            sendWelcomeEmail(userId);
          } catch (err) {
            console.error('Error processing purchase:', err);
            set({ isPurchasing: false, error: 'Purchase processing failed. Please contact support.' });
          }
        }
      );

      purchaseErrorSubscriptionListener = purchaseErrorListener(
        (error: PurchaseError) => {
          if (error.code !== 'E_USER_CANCELLED') {
            set({ error: error.message || 'Purchase failed', isPurchasing: false });
          } else {
            set({ isPurchasing: false });
          }
        }
      );
    } catch (error: any) {
      console.error('Subscription initialization error:', error);
      set({ error: null }); // Non-fatal — app still works without IAP
    } finally {
      set({ isLoading: false });
    }
  },

  subscribe: async (userId: string) => {
    set({ isPurchasing: true, error: null });
    try {
      const { availableProducts } = get();
      const productId = availableProducts[0]?.productId ?? ACTIVE_PRODUCT_IDS[0];

      await requestSubscription({ sku: productId });
      // Purchase result is handled by purchaseUpdatedListener above
    } catch (error: any) {
      if (error.code !== 'E_USER_CANCELLED') {
        set({ error: error.message || 'Purchase failed', isPurchasing: false });
      } else {
        set({ isPurchasing: false });
      }
    }
  },

  restorePurchases: async (userId: string) => {
    set({ isRestoring: true, error: null });
    try {
      const history = await getPurchaseHistory();
      const activeSubscription = history.find(purchase =>
        ACTIVE_PRODUCT_IDS.includes(purchase.productId),
      );

      if (!activeSubscription) {
        set({ isRestoring: false, error: 'No active subscription found to restore.' });
        return;
      }

      const platformAny = activeSubscription as unknown as {
        originalTransactionIdentifierIOS?: string;
        purchaseToken?: string;
        transactionReceipt?: string;
      };
      const originalTransactionId = platformAny.originalTransactionIdentifierIOS ?? null;
      const purchaseToken = platformAny.purchaseToken ?? null;
      const receipt = platformAny.transactionReceipt ?? null;

      // Server-side validate so we get the real expiry / status / env from
      // the store, not fabricated dates. Falls back to a conservative
      // 30-day window if validation isn't available.
      let validated: ValidatedReceipt | null = null;
      if (receipt) {
        try {
          validated = await validateReceiptOnServer({
            userId,
            platform: Platform.OS as 'ios' | 'android',
            productId: activeSubscription.productId,
            receipt,
            purchaseToken,
            originalTransactionId,
          });
        } catch (validationErr) {
          console.warn('Restore validation failed; using fallback dates', validationErr);
        }
      }

      const now = new Date();
      const fallbackEnd = new Date(now);
      fallbackEnd.setDate(fallbackEnd.getDate() + 30);

      const startsAt = validated?.startsAt ?? now.toISOString();
      const endsAt = validated?.endsAt ?? fallbackEnd.toISOString();
      const isTrial = validated ? validated.isTrial : false;
      const status: SubscriptionStatus = isTrial ? 'trial' : 'active';

      await subscriptionService.updateSubscription(userId, {
        tier: 'premium',
        status,
        isOnTrial: isTrial,
        trialStartDate: isTrial ? startsAt : null,
        trialEndDate: isTrial ? endsAt : null,
        subscriptionStartDate: startsAt,
        subscriptionEndDate: endsAt,
        productId: activeSubscription.productId,
        transactionId: activeSubscription.transactionId || null,
        originalTransactionId,
        purchaseToken,
        latestReceipt: receipt,
        autoRenewStatus: validated?.autoRenewStatus ?? true,
        environment: validated?.environment ?? null,
        platform: Platform.OS as 'ios' | 'android',
      });

      await subscriptionService.updateUserPremiumStatus(userId, true, status);

      set({
        isPremium: true,
        isOnTrial: isTrial,
        subscriptionStatus: status,
        isRestoring: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to restore purchases',
        isRestoring: false,
      });
    }
  },

  teardown: () => {
    purchaseUpdateSubscription?.remove();
    purchaseErrorSubscriptionListener?.remove();
    purchaseUpdateSubscription = null;
    purchaseErrorSubscriptionListener = null;
    endConnection();
  },
}));
