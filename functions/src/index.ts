import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { RewardRequest, RewardTier } from './types';
import { createShopifyDiscount } from './shopify';
import { sendRewardEmail } from './email';

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

admin.initializeApp();
const db = admin.firestore();

// ---------------------------------------------------------------------------
// Firestore collection names
// ---------------------------------------------------------------------------

const COLLECTIONS = {
  REWARD_TIERS: 'rewardTiers',
  USER_REWARDS: 'userRewards',
} as const;

// ---------------------------------------------------------------------------
// HTTP Function: processRewards
//
// POST /processRewards
// Body: { "points": 750, "email": "user@example.com" }
//
// Logic:
//   1. Fetch all rewardTiers where pointsRequired <= points
//   2. Skip tiers already claimed by this email
//   3. For each new tier: create Shopify discount code, email it, record claim
//   4. Return list of newly issued rewards
// ---------------------------------------------------------------------------

export const processRewards = onRequest(
  {
    cors: true,
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Use POST.' });
      return;
    }

    const { points, email } = (req.body ?? {}) as Partial<RewardRequest>;

    if (typeof points !== 'number' || !email || typeof email !== 'string') {
      res.status(400).json({
        error: 'Request body must include { points: number, email: string }',
      });
      return;
    }

    const emailKey = email.toLowerCase().trim();

    try {
      // 1. All tiers the user's balance reaches
      const tiersSnap = await db
        .collection(COLLECTIONS.REWARD_TIERS)
        .where('pointsRequired', '<=', points)
        .orderBy('pointsRequired', 'asc')
        .get();

      if (tiersSnap.empty) {
        res.status(200).json({ message: 'No rewards unlocked at this point level', newRewards: [] });
        return;
      }

      // 2. Rewards already claimed by this user
      const claimedSnap = await db
        .collection(COLLECTIONS.USER_REWARDS)
        .doc(emailKey)
        .collection('claimed')
        .get();

      const alreadyClaimed = new Set(claimedSnap.docs.map((d) => d.id));

      // 3. Process each unclaimed tier
      const newRewards: Array<{ name: string; type: string; code: string }> = [];
      const errors: Array<{ tierId: string; error: string }> = [];

      for (const doc of tiersSnap.docs) {
        if (alreadyClaimed.has(doc.id)) continue;

        const tier: RewardTier = { id: doc.id, ...(doc.data() as Omit<RewardTier, 'id'>) };

        try {
          // Create Shopify price rule + discount code
          const { code, priceRuleId, discountCodeId } = await createShopifyDiscount(tier);

          // Email the code to the user
          await sendRewardEmail({ email: emailKey, tier, code });

          // Persist the claim so it's never issued twice
          await db
            .collection(COLLECTIONS.USER_REWARDS)
            .doc(emailKey)
            .collection('claimed')
            .doc(doc.id)
            .set({
              claimedAt: admin.firestore.FieldValue.serverTimestamp(),
              tierId: doc.id,
              tierName: tier.name,
              tierDescription: tier.description,
              type: tier.type,
              code,
              shopifyPriceRuleId: priceRuleId,
              shopifyDiscountCodeId: discountCodeId,
              pointsAtClaim: points,
            });

          newRewards.push({ name: tier.name, type: tier.type, code });

          console.info(`Reward issued: tier=${doc.id} email=${emailKey} code=${code}`);
        } catch (tierErr) {
          const msg = tierErr instanceof Error ? tierErr.message : String(tierErr);
          console.error(`Failed to process tier ${doc.id} for ${emailKey}:`, msg);
          errors.push({ tierId: doc.id, error: msg });
        }
      }

      const hasNew = newRewards.length > 0;
      res.status(200).json({
        message: hasNew
          ? `${newRewards.length} new reward(s) issued`
          : 'All eligible rewards already claimed',
        newRewards,
        ...(errors.length > 0 && { errors }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('processRewards fatal error:', msg);
      res.status(500).json({ error: 'Internal server error', detail: msg });
    }
  },
);
