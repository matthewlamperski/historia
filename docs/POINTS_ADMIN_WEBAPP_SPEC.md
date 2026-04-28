# Historia Admin Web-App — Build Spec

This is a **standalone hand-off spec** for an LLM/engineer who has not seen the
mobile app. Build a small internal admin web-app that lets Historia staff edit
runtime configuration **without shipping a new mobile release**. The mobile
app and Cloud Functions read this config from Firestore; this admin tool
writes to the same Firestore documents.

The tool has **two distinct editor surfaces**:

1. **Points / Levels / Rewards** (sections §4–§7) — the points economy.
2. **Welcome Message** (§7.5) — the founder welcome DM sent to every new
   user by a Cloud Function trigger.

Both share the same auth gate, layout shell, and Firestore project. The
welcome-message editor is intentionally tiny (one form, one save button); the
points editor is the bulk of the work.

---

## 1. Background

The Historia mobile app (React Native + React Native Firebase) has a points
economy:

- Users earn points for actions (creating posts, referring friends, visiting
  landmarks).
- Points push the user up through 9 named **levels**, each with a coin image,
  point range, color, icon, and a list of perks called **rewards**.
- A separate **`rewardTiers`** Firestore collection drives a Cloud Function
  (`processRewards`) that issues real Shopify discount codes by email when a
  user crosses a points threshold.

Until recently, all of this was hardcoded in the mobile app bundle. Now the
**display + earning rules** live in one Firestore document, `config/points`,
which the mobile app reads at startup. The Shopify-issuance system in
`rewardTiers` is unchanged.

Separately, every brand-new user receives an automated welcome direct
message from the founder's account. The text and sender of that message
live in a second Firestore document, `config/welcomeMessage`, read by an
`onUserCreate` Cloud Function (Firestore trigger on `users/{userId}` create).

The admin web-app must:

1. Edit `config/points` (levels, rewards, earning rules, coin images).
2. Edit `rewardTiers` documents (the issuance ledger).
3. Edit `config/welcomeMessage` (founder welcome DM body, sender UID,
   on/off toggle).
4. Surface drift warnings between the points-display and rewardTiers
   issuance systems so staff don't display a reward on the Levels screen
   that has no matching tier in the issuance engine (or vice-versa).

The mobile app fetches `config/points` once at startup, caches it via
AsyncStorage, and refetches when the document's `version` field is bumped.
The `config/welcomeMessage` doc is read only by the Cloud Function — there
is no version field; saves take effect immediately on the next user signup.

---

## 2. Recommended tech stack

- **React + TypeScript** (Vite is fine).
- **Firebase Web SDK v10+** (`firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/storage`).
- **Tailwind CSS** for styling — not strict; pick whatever you want, but keep
  it lightweight (this is internal-only).
- **react-router** for routing.
- **zod** for runtime validation (mirror the schemas defined below).

No need for a complex framework — this is an internal CRUD tool with maybe 5
pages.

The Firebase Web project is `historia-application`. Default storage bucket is
`historia-application.firebasestorage.app`.

---

## 3. Authentication & authorization

Firebase Auth (email/password). **Allow-list** of admin UIDs lives in a
Firestore collection at `admins/{uid}` (presence-only — the document body is
ignored). The collection is pre-seeded by `scripts/seed-admins.js` in the
mobile repo (idempotent — safe to re-run when adding new admins).

Initial admin UIDs (already used by the mobile app's in-app admin gating
and present as docs in `admins/{uid}`):

```
MsgaoumnlwSbZZYgHFGMRKZPlCs2
HzIGqkeYhVbuiZogz34nPpIVMKW2
0gYuyq2FvyWNNZYoAhCiMI2jODY2
```

Login flow:

1. User signs in with Firebase Auth.
2. After successful auth, check `admins/{uid}` exists.
3. If yes, render the app. If no, show a "you don't have access" screen and
   sign them out.

---

## 4. Firestore data model

### 4.1 `config/points` (single doc)

This is the document the mobile app reads on every launch.

```ts
{
  // Bumped on every save. Mobile app refetches when remote > cached version.
  version: number;

  // Server timestamp of last save.
  updatedAt: Timestamp;

  // Earning rules (all required, all non-negative integers).
  earning: {
    postBasePoints: number;     // pts awarded for creating a post
    postPerMediaPoints: number; // additional pts per attached image/video
    dailyPostCap: number;       // max posts per day that earn points
    referralPoints: number;     // pts to BOTH referrer and referred
    siteVisitPoints: number;    // pts for verified landmark check-in
  };

  // Levels in order. Must form contiguous, non-overlapping point ranges.
  // The highest-`order` level must have maxPoints = null.
  levels: Array<{
    id: string;                 // stable kebab/snake-case identifier
    name: string;               // display name
    minPoints: number;          // inclusive lower bound (>= 0)
    maxPoints: number | null;   // inclusive upper bound; null on highest level
    color: string;              // hex color "#rrggbb" — used for UI accents
    icon: string;               // FontAwesome6 icon name (decorative fallback)
    imageUrl: string;           // signed/public HTTPS URL to coin PNG
    imageStoragePath: string;   // e.g. "levels/eternal_steward.png" — for re-resolving URLs
    order: number;              // 1..N display order
    rewards: Array<{
      id: string;               // stable id within this level
      title: string;            // display text on Levels screen
      description?: string;     // optional secondary line
      rewardTierId?: string;    // optional FK to rewardTiers/{id} — see §5
    }>;
  }>;
}
```

**Validation rules** (enforce in admin app + zod schema):

- `levels` non-empty, sorted by `order`.
- For every adjacent pair: `levels[i+1].minPoints === levels[i].maxPoints + 1`.
- Last (highest-order) level: `maxPoints === null`. All others: numeric.
- For each level: `maxPoints >= minPoints` (when not null).
- `color` matches `#rrggbb` or `#rgb`.
- `imageUrl` is a valid HTTPS URL.
- `earning.*` are non-negative integers.

### 4.2 `rewardTiers/{tierId}` (collection)

Each document is consumed by the `processRewards` Cloud Function, which
issues Shopify discount codes when a user's `pointsBalance` crosses
`pointsRequired`. **The mobile app does not read this collection.**

```ts
// Percentage off
{
  pointsRequired: number;
  type: "percentage_off";
  discountPercent: number;     // e.g. 10 for "10% off"
  name: string;                // display name in emails
  description: string;
}

// Free item
{
  pointsRequired: number;
  type: "free_item";
  shopifyProductId: string;    // numeric product ID, as a string
  shopifyVariantId?: string;   // optional variant pin
  itemName: string;            // free-item name shown in emails
  name: string;
  description: string;
}
```

The full canonical type lives in
`/historia/functions/src/types.ts` (in the mobile repo). Mirror it verbatim
in the admin app for type safety. Do not change field names.

### 4.3 `admins/{uid}` (collection)

Presence-only auth list. Body fields are optional — store `addedAt: Timestamp`
and `addedBy: string` (uid) as breadcrumbs if you want.

### 4.4 `config/welcomeMessage` (single doc)

Read by the `onUserCreate` Cloud Function (Firestore trigger) every time a
new user document is created. The function uses these values to send a
founder welcome direct message to the new user.

```ts
{
  // Firebase Auth UID of the user account that should appear as the sender
  // (typically the founder's account, e.g. Doug's UID). The function will
  // refuse to send if this is empty or if no `users/{senderId}` doc exists.
  senderId: string;

  // Message body. Whitespace, blank lines, and line breaks are preserved
  // verbatim by the Cloud Function — admins can format with paragraph
  // breaks and the recipient sees them as written.
  text: string;

  // Kill-switch. When false, the Cloud Function logs and skips. Use this
  // when you need to temporarily disable the welcome flow without
  // erasing the message body.
  enabled: boolean;

  // Server timestamp of last save. Set on every write.
  updatedAt: Timestamp;
}
```

**Validation rules** (enforce in admin app):

- `text` non-empty after trimming (block save with empty body).
- `senderId` non-empty after trimming. Optional UI nicety: validate that
  a `users/{senderId}` doc actually exists before saving (saves a confused
  Cloud Function log later).
- `enabled` must be `true` or `false` (default `true`).

**No version bump required** — unlike `config/points`, this doc is read
fresh by the Cloud Function on every trigger. Saves take effect on the
next user signup with zero latency.

---

## 5. The two-systems caveat (CRITICAL)

There are two parallel "rewards" systems the admin must keep in sync:

| System | Where | Role |
|--------|-------|------|
| `levels[].rewards[]` | `config/points` | **Display only** — perks shown to users on the Levels screen |
| `rewardTiers/{id}` | top-level collection | **Issuance engine** — actually creates Shopify discount codes via email |

These can drift. If a level says "Get 15% off at shophistoria.com" but no
`rewardTiers` document with `pointsRequired === level.minPoints` exists with
that discount, users will see the perk but never receive a code.

**The admin app MUST surface drift.** Implementation:

- On every level edit screen, for each reward with a `rewardTierId`, look up
  the linked tier and show:
  - ✅ "Linked: 15% off (pointsRequired = 100, matches level.minPoints)"
  - ⚠️ "Linked tier's pointsRequired (200) ≠ this level's minPoints (100). Users will receive this code at 200 pts, not when they reach this level."
  - ❌ "Linked tier no longer exists."
- On the levels list page, summarize drift across all levels at the top: "3
  rewards have linked tiers; 2 rewards are unlinked (display-only); 1 drift
  warning."
- On the rewardTiers page, show whether each tier is linked from any level
  ("Linked from level: Patriotic Chronicler") or orphaned.

Optional editor sugar: when creating a new reward inside a level, offer to
auto-create a matching `rewardTiers` doc with `pointsRequired = level.minPoints`.
This is the right default for percentage-off rewards.

---

## 6. Pages

### 6.1 Login + admin gate
Standard Firebase Auth UI. After login, check `admins/{uid}`.

### 6.2 Levels list (home)
- List of levels sorted by `order`.
- Each row: order, name, point range, color swatch, coin image thumbnail,
  reward count, drift indicator.
- Drag-to-reorder (updates `order` on save).
- Buttons: **New Level** (top of list, slot before any existing level),
  **Edit**, **Delete** (delete only allowed if it doesn't break range
  contiguity).
- "Save All Changes" button at bottom — bumps `version`, sets
  `updatedAt: serverTimestamp()`, writes the entire doc.

### 6.3 Level edit page
Form with all fields:

- **Identity**: id (kebab/snake-case, immutable after creation), name, order
  (auto-derived but editable).
- **Range**: minPoints, maxPoints (toggle "Highest level — no cap"). Range
  contiguity validated against neighbors live.
- **Visual**: color picker (hex), FontAwesome icon name (free text — link to
  fontawesome.com/v6 for browsing), coin image upload.
- **Rewards** (list editor):
  - Per-row: id (auto-generated, hidden), title, optional description,
    optional `rewardTierId` (dropdown of all `rewardTiers` docs with their
    `pointsRequired` shown for context).
  - "Add reward" button.
  - Reorder by drag.
- Live drift warnings under rewards section.

### 6.4 Coin image upload flow
- Drag-drop or file-picker for the level's coin PNG.
- Upload to `levels/{level.id}.png` in Firebase Storage with metadata
  `cacheControl: 'public, max-age=31536000, immutable'`.
- After upload, generate a signed URL (`getDownloadURL` from the Web SDK
  works) and store it as `imageUrl`. Also store `imageStoragePath`.
- For replacements (when a coin changes), upload to a versioned path like
  `levels/{level.id}-v{n}.png` so caches don't keep showing the old image.
  Increment a version suffix client-side or use a content hash.

### 6.5 Earning rules page
Simple form for the 5 earning fields. Number inputs with sensible min=0,
step=1. Save bumps version.

### 6.6 Reward Tiers list + edit
Standard CRUD on the `rewardTiers` collection. Show per-tier:
- pointsRequired
- type
- name
- description
- type-specific fields (discountPercent OR shopifyProductId/itemName)
- "Linked from level: ..." or "Not linked" indicator.

Edit form switches between `percentage_off` and `free_item` schemas.

### 6.7 Audit / version history (nice-to-have)
On every save, also write a doc to `configHistory/{autoId}` with
`{ snapshot, savedAt, savedBy }`. Provides an undo path. Not required for v1.

### 6.8 Welcome Message editor

Build a **single, intentionally tiny** page for editing
`config/welcomeMessage`. This is the hand-off second editor surface — keep
it deliberately minimal. No drag handles, no rich text, no preview.

**Route:** `/welcome-message` (or whatever fits your routing).

**Auth:** Same gate as everything else — Firebase Auth + `admins/{uid}`
presence check. Non-admins must not see this page.

**Page layout** (top to bottom, single column, max-width ~720px):

1. **Header**: page title `Welcome Message` and a one-line description:
   *"Sent automatically as a direct message from the founder's account
   to every new user immediately after signup."*

2. **Sender UID** input (single-line text input):
   - Label: `Sender UID`
   - Helper text: *"Firebase Auth UID of the account that appears as the
     sender (typically the founder's account)."*
   - Validation: required, non-empty after trim.
   - Optional: a small "Verify UID" link that runs `getDoc(users/{uid})`
     and shows ✅ name/handle / ❌ "no user with this UID."

3. **Enabled toggle** (checkbox or switch):
   - Label: `Enabled`
   - Helper text: *"When off, new users will not receive the welcome
     message. The text below is preserved."*
   - Default: `true` for new docs.

4. **Message body** (`<textarea>`):
   - Label: `Message`
   - Use a tall textarea (~20 rows). Set `style="white-space: pre-wrap"`
     so the displayed content matches what the user will see in chat.
   - **Whitespace, blank lines, and line breaks must be preserved
     verbatim**. Do NOT trim, normalize, or HTML-escape on save — write
     `textarea.value` to Firestore as-is. The Cloud Function and the
     mobile chat renderer both treat the field as plain text.
   - Validation: required, non-empty after trim.

5. **Last updated** (read-only, small gray text):
   - Show `updatedAt` formatted in the admin's local time so they can
     verify their own save took effect.

6. **Save button** (primary, full width on mobile):
   - Label: `Save`
   - Disabled while a save is in flight or while the form has validation
     errors.
   - On success: toast/banner "Saved. New signups will receive the
     updated message." Refresh `updatedAt` from Firestore.
   - On failure: surface the error message; do not clear the form.

**Save semantics** (simple — much simpler than the points editor):

```ts
await setDoc(
  doc(db, 'config/welcomeMessage'),
  {
    senderId: senderId.trim(),
    text: textareaValue,         // preserve whitespace verbatim
    enabled: enabled,
    updatedAt: serverTimestamp(),
  },
  { merge: true }
);
```

No version bump, no transaction, no Storage upload. The Cloud Function
reads this doc fresh on every trigger.

**Loading state**: on mount, `getDoc('config/welcomeMessage')`. If the doc
doesn't exist (shouldn't happen — it's seeded — but defensive), show an
empty form with `enabled: true` and let the admin save to create it.

**Out of scope for this editor** (to keep it tiny):

- Preview rendering (the textarea itself, with `white-space: pre-wrap`,
  is the preview).
- Per-user templating / variable substitution (`{firstName}` etc.). The
  message is sent verbatim — the mobile chat UI shows it as-is.
- A/B testing / multiple variants. There's exactly one welcome message
  at a time.
- Send-history / per-user delivery audit. The Cloud Function logs all
  sends to Cloud Logging; that's enough for v1.

---

## 7. Save semantics (CRITICAL)

When saving the points config:

1. Validate the entire document with zod. Block save on any error.
2. Bump `version` (read current, write current + 1). Use a Firestore
   transaction to avoid races between concurrent admins.
3. Set `updatedAt: serverTimestamp()`.
4. Write the entire `config/points` document.

The mobile app polls `version` on cold start and refetches when remote >
cached. Without the bump, users keep seeing the stale cached config. **Every
save must bump the version.**

---

## 8. Security rules

### 8.1 Firestore (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isAdmin() {
      return request.auth != null
        && exists(/databases/$(db)/documents/admins/$(request.auth.uid));
    }

    // Anyone signed in can read config docs (points + welcomeMessage).
    // Only admins write. The Cloud Function reads `config/welcomeMessage`
    // via the admin SDK and bypasses these rules.
    match /config/{docId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // Admins manage reward tiers
    match /rewardTiers/{tierId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // Only admins can read/write the admin allow-list
    match /admins/{uid} {
      allow read, write: if isAdmin();
    }

    // ... existing rules for users / posts / etc. unchanged ...
  }
}
```

### 8.2 Storage (`storage.rules`)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAdmin() {
      return request.auth != null
        && firestore.exists(/databases/(default)/documents/admins/$(request.auth.uid));
    }

    match /levels/{file=**} {
      allow read: if true;        // coin images can be public — they're not user data
      allow write: if isAdmin();
    }

    // ... existing rules unchanged ...
  }
}
```

Public reads on `levels/*` are fine (the images are not sensitive). If you
want auth-gated reads instead, change `allow read: if true;` to
`allow read: if request.auth != null;` — the mobile app is always
authenticated when it needs them.

---

## 9. Test checklist (admin must run after every meaningful change)

1. Open the admin app, log in, edit a level's `name`, save.
2. Check the Firestore `config/points` doc in the Firebase Console — `version`
   bumped, `updatedAt` set, `levels[i].name` updated.
3. Force-quit and relaunch the iOS or Android Historia app. The new name
   should appear on the Levels screen.
4. Edit `earning.postBasePoints`. Save. Reopen the mobile app, create a post,
   confirm `pointsBalance` increases by the new value.
5. Replace a coin image. Save. Reopen mobile app, verify the new coin shows
   on the Levels screen and Profile points card. (May need to clear app
   storage if cached aggressively.)
6. Add a new level (insert at order 5, shift others). Save. Verify mobile app
   shows the new level in the correct position.
7. Edit a `rewardTiers` doc — change `pointsRequired`. Verify the drift
   warning appears on the linked level's edit page in the admin app.
8. **Welcome message — happy path:** open the Welcome Message editor.
   Confirm Sender UID, Enabled, and the message body are populated from
   Firestore. Edit the body (add a paragraph). Save. Open Firestore
   Console → `config/welcomeMessage` and verify `text` matches and
   `updatedAt` advanced.
9. **Welcome message — end-to-end:** create a brand-new account in the
   mobile app. Within ~5 seconds, the new user should see a direct
   message from the configured sender appear in their Messages tab,
   with whitespace and paragraph breaks preserved. The message should
   trigger an FCM push (the existing `onMessageCreate` function handles
   this automatically).
10. **Welcome message — kill switch:** toggle Enabled off in the admin
    editor. Save. Create another new account. No DM should arrive. Check
    Cloud Functions logs — you should see `welcome message disabled in
    config — skipping`.
11. **Welcome message — empty senderId:** clear Sender UID and try to
    save. The form must block the save with a validation error. (Don't
    actually save an empty senderId; the function will safely no-op but
    the UX is meant to prevent it upstream.)

---

## 10. Reference: mobile-side context paths

When debugging mobile-side issues, these paths in the mobile repo are
relevant:

- `src/context/PointsConfigContext.tsx` — the React provider that fetches
  `config/points` and caches it.
- `src/services/pointsConfigService.ts` — Firestore read + AsyncStorage
  cache + zod validation.
- `src/types/points.ts` — the canonical zod schemas. Mirror these in the
  admin app.
- `src/services/pointsConfigCache.ts` — in-memory cache that non-React
  services read for earning rules.
- `scripts/seed-points-config.js` — the script that seeded the document
  initially. Reading it shows the exact shape the admin app must produce.
- `functions/src/index.ts` (mobile repo) — the `processRewards` Cloud
  Function that consumes `rewardTiers`. Do not modify.
- `functions/src/types.ts` — canonical `RewardTier` interface.
- `functions/src/welcome.ts` — the `onUserCreate` Cloud Function that
  reads `config/welcomeMessage` and sends the founder DM. The admin
  editor only writes the doc; this function is the consumer. Do not
  modify it from the admin app.
- `scripts/seed-welcome-message.js` — one-shot seed script that
  initialized `config/welcomeMessage` with the default body. The admin
  editor takes over from there.

---

## 11. Out of scope (explicitly do not build)

- Editing user point balances directly (use Firebase Console for one-offs).
- Editing the `processRewards` Cloud Function (it's stable; admin-app changes
  data only).
- Editing or replacing the `onUserCreate` Cloud Function. The admin editor
  changes the doc it reads; the function itself is fixed.
- Real-time push of config changes to running mobile apps. The mobile app
  refetches on cold start. Force-quit + relaunch is the propagation mechanism.
- Mobile-side admin UI in the React Native app. All admin work happens in
  this web tool.
- Sending the welcome message to existing users retroactively. The trigger
  fires only on new `users/{uid}` doc creation.
