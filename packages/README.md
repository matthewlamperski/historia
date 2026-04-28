# Shared packages

Currently one: `shared/`. Contains design tokens, Tailwind preset,
TypeScript types, and zod schemas used by both web apps.

There's no build step. Vite resolves `@historia/shared` directly to
`shared/src/` via path aliases — see each app's `vite.config.ts` and
`tsconfig.json`.

If the mobile app's `src/constants/theme.ts` ever changes, update
`shared/src/theme.ts` and `shared/src/tailwind-preset.cjs` in lockstep.
