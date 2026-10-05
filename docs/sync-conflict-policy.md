# Sync conflict policy

Status: current behavior documented + sprint-1 product decision.
Sources: `src/main.tsx` (`initSync`), `src/lib/supabase.ts`, `src/lib/syncStatus.ts`, `src/lib/storage.ts`. `src/lib/firebaseSync.ts` is a REMOVED stub.

## 0. Incident: the agenda that vanished (2026-10-05)

Reported as "I planned my whole agenda and it disappeared, I had to start over".

Root cause was **local, not sync**: `createOrUpdateDayPlan`
(`src/store/useMonkStore.ts`) rebuilds the `DayPlan` object from a fixed field
list. Every field carried an `existing?.` fallback except `agenda`, so any later
call for the same date — the rest-day toggle, a Plan B switch, a status write,
a journal entry, a weekly review — silently replaced the row without its agenda.
The day still read as "planned"; only the agenda was gone. Sync then propagated
the agenda-less row to every other device via LWW, which is why it looked like
cloud loss.

Fixes (with regression tests):

- `createOrUpdateDayPlan` now carries `agenda` over like every other field
  (`useMonkStore.agenda.test.ts`).
- The "Change theme" undo no longer restores a 5-field subset — it carries
  `agenda`, `highlight`, `timeBlocks`, `planningCompleted` too, so an undo of a
  clear is not a partial re-create (`TodayScreen.tsx`).
- Clearing every agenda row now persists the empty list; it previously skipped
  the write, so the erased plan reappeared on reload
  (`MorningPlanningModal.tsx`).
- Committing the planning sheet with no active season now refuses with a toast
  instead of showing success while every store write early-returned.
- An unparseable `monk_mode_pwa_state_v1` is quarantined under
  `monk_mode_pwa_state_v1__corrupt_backup` before `loadState` returns null.
  Previously the store kept its initial state and the next write persisted that
  over the user's data — a parse hiccup became permanent loss (`storage.ts`).

**Invariant to preserve:** any store action that rebuilds a record rather than
spreading it must carry over *every* field the record owns. A field with no
fallback is a field that gets deleted.

### Closed gap: cleared days no longer resurrect

`mergeRemoteState` previously had no `dayPlans` tombstone, so a *cleared* day
could be resurrected by a later pull from a device that still held the row —
the opposite direction from the incident above (data returns, not vanishes).

`dayPlanDeletedAt` now mirrors the proven `notebookDeletedAt` mechanism:
`clearDayPlan` tombstones the removed plan's id, the merge unions tombstones
from both sides and drops any plan whose id is tombstoned (delete always wins
over a stale resurrect, regardless of `updatedAt`), and `hydrate` purges
tombstones older than 30 days. The filter runs **after** `dedupeDayPlans` so a
tombstoned id cannot slip back in through the composite-key union.

The agenda is also now visible on Today: the "Agenda" section used to render
only time blocks, so a day planned with agenda items and no time blocks looked
empty. It lists both and badges the combined count.

## 1. Sources of truth

| Layer | Store | Shape |
| --- | --- | --- |
| Local primary | `localStorage` key `monk_mode_pwa_state_v1` | Full `MonkMVPState` blob |
| Local side keys | `focusSessions`, `learningSessions`, `timelineEvents` | Arrays; re-merged on `loadState` / written on `saveState` |
| Local draft | `monk_journal_draft_v1` | Not part of remote blob |
| Remote | Supabase table `zendo_state`, row `id = auth.uid()` (per user), column `state_json` | One row per user; `setState` upserts the user's own row. |
| Auth | Scoped per user | RLS enforces owner-only access (`auth.uid() = id`). Not shared, not world-readable. |

App boots from local (`loadState` → store). Remote is secondary overlay + push target.

## 2. Current startup merge (as implemented)

1. App renders first; store hydrates from localStorage (separate session keys applied).
2. `initSync()` runs non-blocking after render.
3. If `!navigator.onLine` → `syncStatus = offline`, return (no subscribe, no pull).
4. Else: `syncing` → `getState()` raced with 3s timeout.
5. If remote object has keys:  
   `useMonkStore.setState(state => ({ ...state, ...remote }))`  
   **Shallow** top-level key overwrite only. Nested arrays/objects replaced whole when key present on remote; local-only top-level keys kept.
6. Subscribe store: any change → debounce **800ms** → if online, `setState(full next)` (whole blob push) → `synced` / `error` / `offline`.
7. `online` / `offline` window listeners only flip `syncStatus` (`synced` / `offline`). No re-pull or flush queue on reconnect.
8. Pull/timeout failure → log + `offline`. Subscribe is **not** registered if pull path throws before subscribe.

Push payload = full Zustand snapshot. No client revision / `updatedAt` in blob. Remote DB `updated_at` is written on push but **never read** for merge decisions.

## 3. Conflict implications (risks)

- **Whole-blob last-write-wins** at network order: later successful `setState` wins; no compare-and-swap.
- **Shallow merge on pull**: remote top-level keys stomp local siblings; nested arrays not field-merged. Inconsistent hybrid state if remote is partial or stale relative to local nested data.
- **Multi-device**: device that opens later and pulls, then edits, overwrites earlier device on next push. No awareness of concurrent editors.
- **No revision on push**: lost-update if two tabs/devices push interleaved.
- **Offline edits clobbered**: next online open that pulls non-empty remote applies shallow remote-over-local with no local-newer check.
- **Global row**: all users/devices share one blob — data leak / cross-user clobber if multi-account ever shares project.
- **Reconnect gap**: online event does not push queued local blob or re-pull.
- **Side keys vs remote**: focus/learning/timeline live in local side keys and in main blob; remote only carries whatever is in the store snapshot at push time.

## 4. Chosen policy (sprint 1 lock)

Product decision — implement next; not current code:

1. **Local-first for active session**  
   Never replace in-memory/local with remote when local is newer.  
   **Gap today:** no `updatedAt` on client state. **Add** `stateMeta.updatedAt` (ISO) on every local save / before push.

2. **LWW with timestamp once meta exists**  
   Compare `local.stateMeta.updatedAt` vs remote equivalent (or remote row `updated_at` if not yet embedded).  
   `max(updatedAt)` wins the **entire blob**. Simple; matches single-blob architecture.

3. **No field-merge of arrays**  
   Do not deep-merge `goals` / `dayPlans` / `focusSessions` / etc. Whole-blob LWW only until a CRDT/OT sprint.

4. **Offline**  
   Keep last local blob as source. On reconnect: if local newer → push; else pull and replace. No silent remote-over-local when local timestamp wins.

5. **Multi-user (implemented)**  
   Per-user rows (`id = auth.uid()`), RLS owner-scoped. Signed-in users sync only their own state.

## 5. Status labels (UI)

| Status | Meaning |
| --- | --- |
| `idle` | Initial; sync not started |
| `syncing` | Pull in progress or debounced push in flight |
| `synced` | Last pull/push ok, or browser went online (listener sets this without verifying) |
| `offline` | `navigator.onLine === false`, pull failed/timeout, or push skipped/failed while offline |
| `error` | Push failed while still online |

## 6. Out of scope this sprint

- Per-entity / array merge
- OT / CRDT
- Multi-user ACL, per-user rows
- Realtime multi-tab coordination beyond LWW timestamps
- Reading DB `updated_at` without also adding client `stateMeta` (prefer client meta for offline-comparable clock)

---

### Sprint-1 policy (5 bullets)

- Local-first: remote must not clobber newer local (`stateMeta.updatedAt`).
- Whole-blob LWW by max timestamp; no nested/array field merge.
- Offline: retain local blob; reconnect push-if-local-newer else pull.
- Push full blob only; no partial remote patches.
- Multi-tenant (`id = auth.uid()`) implemented; `global` row removed (migrated).
