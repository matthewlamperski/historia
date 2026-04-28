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
  color: z.string().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, 'must be a hex color'),
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
            message: `Level "${next.id}".minPoints must be ${lvl.maxPoints + 1} (one above previous maxPoints)`,
            path: ['levels', i + 1, 'minPoints'],
          });
        }
      }
    }
  });

export type Reward = z.infer<typeof RewardSchema>;
export type LevelDef = z.infer<typeof LevelDefSchema>;
export type EarningRules = z.infer<typeof EarningRulesSchema>;
export type PointsConfig = z.infer<typeof PointsConfigSchema>;
