// Zod schemas mirrored from the mobile app's `src/types/points.ts`.
// Used by the admin app for runtime validation before writing to Firestore.

import { z } from 'zod';

export const RewardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  rewardTierId: z.string().optional(),
});

export const LevelDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  minPoints: z.number().int().nonnegative(),
  maxPoints: z.number().int().nonnegative().nullable(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, 'must be a hex color'),
  icon: z.string().min(1),
  imageUrl: z.string().url(),
  imageStoragePath: z.string().min(1),
  order: z.number().int().nonnegative(),
  rewards: z.array(RewardSchema),
});

export const EarningRulesSchema = z.object({
  postBasePoints: z.number().int().nonnegative(),
  postPerMediaPoints: z.number().int().nonnegative(),
  dailyPostCap: z.number().int().nonnegative(),
  referralPoints: z.number().int().nonnegative(),
  siteVisitPoints: z.number().int().nonnegative(),
});

export const PointsConfigSchema = z
  .object({
    version: z.number().int().nonnegative(),
    levels: z.array(LevelDefSchema).min(1),
    earning: EarningRulesSchema,
  })
  .superRefine((cfg, ctx) => {
    const levels = [...cfg.levels].sort((a, b) => a.order - b.order);

    for (let i = 0; i < levels.length; i++) {
      const lvl = levels[i];

      if (lvl.maxPoints !== null && lvl.maxPoints < lvl.minPoints) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Level "${lvl.id}": maxPoints must be >= minPoints`,
          path: ['levels', i, 'maxPoints'],
        });
      }

      if (i === levels.length - 1) {
        if (lvl.maxPoints !== null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Highest-order level "${lvl.id}" must have maxPoints = null`,
            path: ['levels', i, 'maxPoints'],
          });
        }
      } else {
        if (lvl.maxPoints === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Non-final level "${lvl.id}" must have a numeric maxPoints`,
            path: ['levels', i, 'maxPoints'],
          });
        }
        const next = levels[i + 1];
        if (lvl.maxPoints !== null && next.minPoints !== lvl.maxPoints + 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Level "${next.id}".minPoints must be ${
              lvl.maxPoints + 1
            } (one above previous maxPoints)`,
            path: ['levels', i + 1, 'minPoints'],
          });
        }
      }
    }
  });

const RewardTierBaseSchema = z.object({
  pointsRequired: z.number().int().nonnegative(),
  name: z.string().min(1),
  description: z.string().min(1),
});

export const PercentageOffTierSchema = RewardTierBaseSchema.extend({
  type: z.literal('percentage_off'),
  discountPercent: z.number().int().min(1).max(100),
});

export const FreeItemTierSchema = RewardTierBaseSchema.extend({
  type: z.literal('free_item'),
  shopifyProductId: z.string().min(1),
  shopifyVariantId: z.string().optional(),
  itemName: z.string().min(1),
});

export const RewardTierSchema = z.discriminatedUnion('type', [
  PercentageOffTierSchema,
  FreeItemTierSchema,
]);

export const WelcomeMessageSchema = z.object({
  senderId: z.string().trim().min(1, 'Sender UID is required'),
  text: z
    .string()
    // `.trim().length > 0` check without actually trimming the value —
    // Cloud Function preserves whitespace verbatim.
    .refine((v) => v.trim().length > 0, 'Message text is required'),
  enabled: z.boolean(),
});

export const BlogPostInputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be kebab-case lowercase'),
  title: z.string().min(1),
  excerpt: z.string().min(1).max(280),
  body: z.string().min(1),
  heroImageUrl: z.string().url().optional().or(z.literal('')),
  authorName: z.string().min(1),
  status: z.enum(['draft', 'published']),
});
