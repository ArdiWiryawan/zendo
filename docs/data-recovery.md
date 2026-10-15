# Data recovery & storage guards

Status: implemented 2026-10-15 on `feat/onboarding-mental-model`.

## What happened (2026-10-15, ~23:27–23:33 local)

- The user was in the Zendo PWA at `https://zendo-focus.vercel.app` (Edge, Windows).
- Between 23:27:32 (last successful cloud push) and 23:32:39 (first boot of a
  blank state) the origin's localStorage was emptied: the state key, the
  satellite keys (`focusSessions`, `timelineEvents`, `learningSessions`), the
  journal/notebook drafts and the Supabase session key were all gone. Only an
  origin-wide clear removes all of them together — Settings → Danger Zone
  "Reset" (`localStorage.clear()`), the browser's "clear site data" for the
  site, or browser-level site-data clearing. Edge's storage log shows the
  browser restarting into a database that already lacked the data
  (recovery at 23:31:55), so the leveldb files themselves did not carry it.
- Result: the app booted blank, the gates showed onboarding, and the app's own
  next write persisted the blank state over the main key.
- The season survived in the Supabase row (last pushed 23:27:32): 4 past
  seasons, the active season (2026-09-29 → 2026-12-27), 56 day plans, 47 focus
  sessions, 30 journal entries, 61 notebook entries.

The actor of the clear itself (an in-app button vs a browser action) is not
provable from the artifacts that remain; both produce exactly this signature.
The guards below assume "the origin can be emptied by something outside the
app's control" and make that survivable.

## Guards (`src/lib/storage.ts`)

1. `hasMeaningfulState` — a state is worth keeping only when it carries an
   identity, a season, or records the user created. Seed defaults (journal
   packs, notebook categories, habit reminders) never count.
2. **No-clobber write guard** — `saveState` refuses to write a blank state over
   a stored state that has meaningful data (warns in console). Boot races and
   unknown paths can no longer end a season silently. Danger Zone Reset is
   unaffected: it clears keys directly and reloads.
3. **Boot snapshot** — `hydrate` calls `saveBackupState`, storing the loaded
   state under `monk_mode_pwa_state_v1__last_good`. Blank states are never
   snapshotted.
4. **Heal on boot** — `loadState` falls back to the snapshot when the main key
   is missing, unreadable, or blank. `clearState()` removes the snapshot too.
5. The zustand persist adapter's `setItem` delegates to `saveState`, so the
   multi-key layout, normalization, and the guard live in one place.

## Recovery doors on the welcome screen

`src/screens/WelcomeScreen.tsx` now offers "Already have a season? Sign in /
Restore a backup":

- **Sign in** → `/login` → Supabase session → `pullRemote()` merges the cloud
  row into local (per-record last-write-wins) → the gates land on Today.
- **Restore a backup** → pick a JSON state export, validated for
  `userProfile || activeSeason || goals`, applied via `importState`, then `/`
  decides the landing screen (Today / Season end).

## Limits (stated, not hidden)

- `localStorage.clear()` or browser storage eviction removes the snapshot too.
  The cloud row (or a JSON export the user keeps) is the only copy that
  survives an origin-wide clear; sign-in is the guaranteed path back.
- The snapshot reflects the state as of the last boot, not the last change.
- Healing is silent in the UI (console warning only); no toast was added.
- `startNewSeason` now bumps `userProfile.updatedAt`, so a merged remote copy
  cannot resurrect `onboardingCompleted: true` for an archived season.
- Follow-up candidate (not done): require a typed confirmation for Danger Zone
  Reset.
