export interface RewardRequest {
  /** Current point balance of the user */
  points: number;
  /** User's email address — used to look up claimed rewards and send the code */
  email: string;
}

/**
 * A document in the `rewardTiers` Firestore collection.
 *
 * Example — percentage off:
 *   { pointsRequired: 500, type: "percentage_off", discountPercent: 10,
 *     name: "10% Off Coupon", description: "10% off your entire order" }
 *
 * Example — free item:
 *   { pointsRequired: 1000, type: "free_item", shopifyProductId: "8012345678901",
 *     itemName: "Historia Tote Bag", name: "Free Tote Bag",
 *     description: "Redeem a free Historia tote bag" }
 */
export interface RewardTier {
  /** Firestore document ID — set after fetch */
  id: string;
  /** Points threshold that unlocks this reward */
  pointsRequired: number;
  /** Reward shape */
  type: 'percentage_off' | 'free_item';
  /** Display name shown in emails and API responses */
  name: string;
  /** Human-readable description */
  description: string;

  // --- percentage_off fields ---
  /** Integer percentage, e.g. 10 for "10% off" */
  discountPercent?: number;

  // --- free_item fields ---
  /** Shopify numeric product ID (as a string) */
  shopifyProductId?: string;
  /** Optional: pin to a specific variant instead of the whole product */
  shopifyVariantId?: string;
  /** Display name of the free item used in the email */
  itemName?: string;
}

export interface DiscountResult {
  code: string;
  priceRuleId: string;
  discountCodeId: string;
}
