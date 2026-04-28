# TODO — Values & follow-ups

This is the single source of truth for everything that's still missing or
deferred from the marketing site / admin app build. Fill these in as you
collect them; the apps surface visible placeholders wherever a value is
still blank.

> Last updated by initial scaffold on 2026-04-28.

---

## 1. App Store URLs (marketing site)

The Download page and Home page hero show "Download on the App Store" /
"Get it on Google Play" buttons. They render **disabled** until the URLs
are filled in.

- [ ] **iOS App Store URL** — set `VITE_APP_STORE_URL` in
  `apps/marketing/.env`. Example: `https://apps.apple.com/app/historia/id123456789`
- [ ] **Google Play URL** — set `VITE_PLAY_STORE_URL` in
  `apps/marketing/.env`. Example: `https://play.google.com/store/apps/details?id=com.historia`

The buttons live in `apps/marketing/src/components/StoreButtons.tsx` and
auto-detect missing values via `apps/marketing/src/config/site.ts`.

---

## 2. Support email (marketing site)

Contact page (`/contact`) shows a copy-to-clipboard email and a `mailto:`
button. With the value missing, the page falls back to "support is being
set up" copy.

- [ ] **Support email address** — set `VITE_SUPPORT_EMAIL` in
  `apps/marketing/.env`.

---

## 3. Legal pages (marketing site)

The footer links to `/privacy` and `/terms`. These routes don't exist yet
— React Router will surface the 404 page.

- [ ] **Privacy Policy page** — write content + add route in
  `apps/marketing/src/App.tsx`. The mobile app's Subscription screen also
  links to `historia.app/privacy`.
- [ ] **Terms of Service page** — same treatment.

---

## 4. Founder / About page content

`apps/marketing/src/pages/AboutPage.tsx` has placeholder copy under "The
team" — small team intro, no names. Replace with real founder bio when
ready.

- [ ] Founder name(s) and bio
- [ ] Founder photo (drop in `apps/marketing/public/`)
- [ ] Long-form story / origin

---

## 5. Blog seed content (admin app)

You mentioned three posts in
[this Google Doc](https://docs.google.com/document/d/1bII9Og34VPKWQBu9hpj41GhRjyzejg16bip7edsG-Hk/edit?usp=sharing):

1. *The Story Behind Explore Historia: Why We Built An Exploration & Connection Tool*
2. *How Explore Historia Turns Everyday Drives into Meaningful Adventures*
3. *Gratitude Media: What It Means and Why Explore Historia Replaces Endless Scrolling with Uplifting Real Adventures*

Open the admin app at `/blog`, click **+ New post**, and paste each one.
Slugs auto-derive from titles.

- [ ] Paste post #1
- [ ] Paste post #2
- [ ] Paste post #3
- [ ] Optionally upload hero images for each

The marketing site's `/blog` page is empty until at least one post is
published.

---

## 6. Admin auth — Firestore allow-list

The admin app uses a **presence-only allow-list**: if `admins/{uid}`
exists in Firestore, that account is an admin. Each seeded doc has shape
`{ role: 'admin', addedAt, addedBy }`. The `role` field is currently
self-documentation only — rules and the client both gate on `exists()`,
not on the field value. (We can switch to role-based gating later if a
non-admin tier becomes useful.)

- [ ] Run `node scripts/seed-admins.js` from the repo root to seed the
  three pre-listed UIDs into `admins/{uid}`. Re-run any time you add a
  new admin.
- [ ] Confirm at least one admin can log in at `admin.historia.app/login`.

**Adding an admin later:** edit `scripts/seed-admins.js`, append the new
UID to `ADMIN_UIDS`, run `node scripts/seed-admins.js`. **Removing an
admin:** delete the doc directly in the Firebase console (the script
never deletes).

The previous admin app used Firebase custom claims; the new code ignores
them. Anyone with a custom claim but no `admins/{uid}` doc will be
denied. Anyone in the allow-list but missing the custom claim is fine.

---

## 7. Security rules

I wrote proposed rules to `firestore.rules` and `storage.rules` at the
repo root. **They are not deployed** and are not yet wired up in
`firebase.json`. Both files have placeholders for existing collections
(users, posts, comments, etc.) that you'll need to copy from the Firebase
console before deploying.

- [ ] Diff `firestore.rules` against the deployed rules in the Firebase
  console.
- [ ] Diff `storage.rules` against the deployed rules in the Firebase
  console.
- [ ] Add `firestore` and `storage` blocks to `firebase.json` once the
  rules are reconciled, then deploy with `firebase deploy --only
  firestore:rules,storage:rules`.

---

## 8. Mobile app refresh after admin saves

Per spec §7, every save to `config/points` bumps a `version` field. The
mobile app refetches when `remote > cached`.

- [ ] After making any admin change, force-quit and relaunch the iOS or
  Android app to verify the change propagates.
- [ ] If a coin image change isn't appearing, the app may have cached the
  old URL aggressively — clear app storage in dev settings.

Per spec §6.8, `config/welcomeMessage` does NOT bump a version — the
Cloud Function reads the doc fresh on every signup, so welcome message
edits take effect immediately on the next user signup.

---

## 9. Marketing site deployment

Currently builds to `apps/marketing/dist`. Not yet deployed.

- [ ] Decide hosting (Firebase Hosting, Vercel, Netlify, Cloudflare).
- [ ] Wire up DNS to point `historia.app` at the chosen host.
- [ ] If using Firebase Hosting, add a `hosting` block to
  `firebase.json` and deploy.
- [ ] Verify the existing `/.well-known/apple-app-site-association` and
  `/.well-known/assetlinks.json` files (referenced in
  `docs/MANUAL_SETUP_CHECKLIST.md`) are served from the deployed site —
  they are required for iOS Universal Links / Android App Links.

---

## 10. Admin app deployment

Currently builds to `apps/admin/dist`. Not yet deployed.

- [ ] Decide hosting (most likely Firebase Hosting under
  `admin.historia.app` or similar private subdomain).
- [ ] Restrict access at the network level if possible (the admin allow-
  list is the in-app gate, but a private URL is defense in depth).

---

## Nice-to-haves (deferred)

- [ ] **`configHistory/{autoId}` audit log** — spec §6.7. On every
  points-config save, also write a snapshot doc for undo. Not required
  for v1.
- [ ] **Drag-to-reorder** for levels — spec §6.2. Currently up/down
  arrow buttons are wired in `apps/marketing` admin Levels page, which
  works fine but is less ergonomic.
- [ ] **Auto-create matching `rewardTier`** when adding a percentage-off
  reward to a level — spec §5 "optional editor sugar".
- [ ] **Real screenshots** of the mobile app on the marketing Home page
  in place of the achievement-coin grid mockup.
- [ ] **SSG / pre-render** the marketing site for SEO. Currently fully
  client-rendered; meta tags are static in `index.html`.
