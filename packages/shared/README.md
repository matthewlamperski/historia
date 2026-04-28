# @historia/shared

Source-only package shared between `apps/marketing` and `apps/admin`.

- **`theme.ts`** — design tokens (colors, fonts, shadows, radii) mirrored from the mobile app's `src/constants/theme.ts`.
- **`tailwind-preset.cjs`** — Tailwind preset; both web apps load it via `presets: [require('@historia/shared/tailwind-preset')]`.
- **`types/`** — shared Firestore document shapes.
- **`schemas/`** — zod runtime validation schemas mirroring the mobile app's `src/types/points.ts`.

There is no build step. Both apps consume the TypeScript source directly via Vite path aliases (`@historia/shared`). See each app's `vite.config.ts` and `tsconfig.json`.

If the mobile app's palette ever changes, update `theme.ts` and `tailwind-preset.cjs` in lockstep.
