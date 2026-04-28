# Historia web apps

This directory contains the two web applications that complement the
React Native mobile app at the repo root.

## Apps

### `marketing/` — public marketing site

Vite + React + TypeScript + Tailwind. Lives at `historia.app`.

```sh
cd apps/marketing
cp .env.example .env       # then fill in the App Store / Play Store / support values
npm install
npm run dev                # http://localhost:5174
npm run build              # outputs to dist/
```

Pages: Home, Download, Blog, About, Contact. The blog reads published
posts from the Firestore `blogPosts` collection — write them through the
admin app.

### `admin/` — internal staff tool

Vite + React + TypeScript + Tailwind. Authenticated via Firebase Auth +
the `admins/{uid}` Firestore allow-list (per
`docs/POINTS_ADMIN_WEBAPP_SPEC.md` §3). Not exposed on a public URL.

```sh
cd apps/admin
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
npm run build
```

Pages:

- **Moderation** (existing): Dashboard, Reports, Users
- **App Configuration** (new): Levels & Rewards, Earning Rules, Reward
  Tiers, Welcome Message
- **Content** (new): Blog

The Levels and Earning Rules pages write `config/points` and bump a
`version` field that the mobile app polls on cold start (spec §7).

The Welcome Message page writes `config/welcomeMessage`; the
`onUserCreate` Cloud Function reads it fresh on every signup. No version
bump needed.

The Blog editor writes the `blogPosts` collection; the marketing site
queries it with `where('status', '==', 'published')`.

## Shared package

`packages/shared/` exports:

- **theme tokens** — mirrored from the mobile app's
  `src/constants/theme.ts`.
- **Tailwind preset** — both apps load it via `presets:
  [require('@historia/shared/tailwind-preset')]` in their respective
  `tailwind.config.js`.
- **TypeScript types** — Firestore document shapes (PointsConfig,
  RewardTier, WelcomeMessageConfig, BlogPost, etc.).
- **Zod schemas** — runtime validation mirrored from the mobile app's
  `src/types/points.ts`.

There is no build step; both apps consume the TypeScript source directly
via Vite path aliases.

## Why no npm workspaces?

The React Native app at the repo root has a fragile native dep tree
(Metro, `react-native-firebase`, etc.) and pinned versions of `react`
that conflict with the web apps. Hoisting through workspaces caused
resolution issues in early experiments. So each web app keeps its own
`node_modules`, and `packages/shared` is consumed via a Vite alias —
no symlinks, no workspaces, nothing the RN bundler can trip over.

If you ever decide to convert to workspaces, exclude the RN root from
the workspace list and add explicit `nohoist` for `react`, `react-dom`,
and the firebase packages.
