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
import { SubscriptionRecord, SubscriptionStatus } from '../types';
import { subscriptionService } from '../services/subscriptionService';

// Placeholder product IDs — replace with real IDs from App Store Connect / Google Play Console
// See docs/SUBSCRIPTION_SETUP.md for instructions
export const PRODUCT_IDS = {
  ios: ['historia_premium_monthly'],
  android: ['historia_premium_monthly'],
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
            // Acknowledge the purchase
            await finishTransaction({ purchase, isConsumable: false });

            // Calculate trial end date (30 days from now)
            const trialStart = new Date();
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 30);

            // Save to Firestore
            await subscriptionService.updateSubscription(userId, {
              tier: 'premium',
              status: 'trial',
              isOnTrial: true,
              trialStartDate: trialStart.toISOString(),
              trialEndDate: trialEnd.toISOString(),
              subscriptionStartDate: trialEnd.toISOString(),
              productId: purchase.productId,
              transactionId: purchase.transactionId || null,
              platform: Platform.OS as 'ios' | 'android',
            });

            await subscriptionService.updateUserPremiumStatus(userId, true, 'trial');

            // Update local state
            set({
              isPremium: true,
              isOnTrial: true,
              subscriptionStatus: 'trial',
              isPurchasing: false,
            });
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
      const activeSubscription = history.find(
        purchase =>
          ACTIVE_PRODUCT_IDS.includes(purchase.productId)
      );

      if (activeSubscription) {
        const trialStart = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30);

        await subscriptionService.updateSubscription(userId, {
          tier: 'premium',
          status: 'active',
          isOnTrial: false,
          subscriptionStartDate: trialStart.toISOString(),
          productId: activeSubscription.productId,
          transactionId: activeSubscription.transactionId || null,
          platform: Platform.OS as 'ios' | 'android',
        });

        await subscriptionService.updateUserPremiumStatus(userId, true, 'active');

        set({
          isPremium: true,
          isOnTrial: false,
          subscriptionStatus: 'active',
          isRestoring: false,
        });
      } else {
        set({ isRestoring: false, error: 'No active subscription found to restore.' });
      }
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
