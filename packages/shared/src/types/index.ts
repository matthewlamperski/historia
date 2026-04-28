// Shared TypeScript types between the marketing site, admin app,
// and (eventually) the mobile app. These are the wire shapes for Firestore
// documents — they must stay in sync with the mobile app's `src/types/`
// directory and with `functions/src/types.ts`.

import type { Timestamp } from 'firebase/firestore';

// ─── Points / Levels / Rewards ──────────────────────────────────────────

export interface Reward {
  id: string;
  title: string;
  description?: string;
  /** Optional FK to rewardTiers/{rewardTierId}. Drift detection compares
   *  this tier's pointsRequired against the level's minPoints. */
  rewardTierId?: string;
}

export interface LevelDef {
  id: string;
  name: string;
  minPoints: number;
  /** null only on the highest-order level (top of the ladder). */
  maxPoints: number | null;
  /** Hex color, e.g. "#927f61". */
  color: string;
  /** FontAwesome 6 icon name, decorative fallback. */
  icon: string;
  /** Public/signed HTTPS URL of the coin PNG in Firebase Storage. */
  imageUrl: string;
  /** Storage path used to re-resolve the URL, e.g. "levels/historia_initiate.png". */
  imageStoragePath: string;
  order: number;
  rewards: Reward[];
}

export interface EarningRules {
  postBasePoints: number;
  postPerMediaPoints: number;
  dailyPostCap: number;
  referralPoints: number;
  siteVisitPoints: number;
}

export interface PointsConfig {
  /** Bumped on every save. The mobile app refetches when remote > cached. */
  version: number;
  updatedAt?: Timestamp;
  levels: LevelDef[];
  earning: EarningRules;
}

// ─── Reward Tiers (issuance engine) ──────────────────────────────────────
// Mirrored from `functions/src/types.ts`. Consumed by the `processRewards`
// Cloud Function which issues real Shopify discount codes by email.

export type RewardTierType = 'percentage_off' | 'free_item';

interface RewardTierBase {
  pointsRequired: number;
  name: string;
  description: string;
}

export interface PercentageOffTier extends RewardTierBase {
  type: 'percentage_off';
  discountPercent: number;
}

export interface FreeItemTier extends RewardTierBase {
  type: 'free_item';
  shopifyProductId: string;
  shopifyVariantId?: string;
  itemName: string;
}

export type RewardTier = PercentageOffTier | FreeItemTier;

// ─── Welcome message (founder DM) ────────────────────────────────────────

export interface WelcomeMessageConfig {
  senderId: string;
  /** Verbatim text — whitespace and line breaks preserved by the Cloud Function. */
  text: string;
  /** Kill-switch. When false, the Cloud Function logs and skips. */
  enabled: boolean;
  updatedAt?: Timestamp;
}

// ─── Blog (marketing site) ───────────────────────────────────────────────

export type BlogPostStatus = 'draft' | 'published';

export interface BlogPost {
  id: string;
  /** URL slug, kebab-case. Unique within `status === 'published'`. */
  slug: string;
  title: string;
  excerpt: string;
  /** Markdown body. The marketing site renders this with `react-markdown`. */
  body: string;
  /** Optional hero image URL (Firebase Storage). */
  heroImageUrl?: string;
  /** Display name shown on the post page. */
  authorName: string;
  status: BlogPostStatus;
  /** Set when status transitions to 'published'. */
  publishedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
