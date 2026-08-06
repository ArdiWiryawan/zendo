# Spec — Re-Entry Card (delta)

Status: PENDING IMPLEMENTATION · Date: 2026-08-06
Baseline: `ReEntryBanner` already exists (TodayScreen.tsx:148-276). This spec closes the 3 gaps.

## Context

`ReEntryBanner` + `shouldOfferReentry` (src/lib/dailyActivity.ts:164) + trigger chips + rest/tiny-step already shipped. Missing:
1. **Free-text "what got in the way?"** — banner writes `trigger` only, note stays empty (`saveReloadLog({ trigger, note: "", recoveryAction: "" })` TodayScreen.tsx:265).
2. **Answer replay** — next miss never shows user's own words back.
3. **Dismissal vs answered** — dismissal is per-date localStorage; no way to know if a miss was actually *diagnosed* (metric needs it).

Evidence base: miss-state diagnostic (never shaming) = ADD item, `docs/research_foundation.md` §5.3; relapse-as-data ethos. Reuses `RelapseLog`, no new store field → no syncMerge work.

## Changes

### 1. Banner — capture free text (`TodayScreen.tsx:221-275`)
- Add optional free-text field next to trigger chips (state `reentryNote`, useState at banner level).
- On save: `store.saveRelapseLog({ trigger, note: reentryNote, recoveryAction })` — reuse existing call, fill `note`.
- If user picks chip "felt tired / no energy" → copy stays rest-offer (`today.reentry.rest*` keys). Others → tiny-step path (existing).

### 2. Replay — own words back (`TodayScreen.tsx` banner render + `dailyActivity.ts`)
- On next miss, fetch that date's `RelapseLog.note`/`trigger` and render line: "Terakhir kali karena [trigger]." in banner.
- Lookup: existing `getRelapseForDate(date)` (or add 4-line helper in `dailyActivity.ts`) — check existing lib first.

### 3. Answered flag — per-date localStorage (matches `isReentryDismissed` pattern, dailyActivity.ts:112-130)
- New keys: `zendo.reentry.answered.${date}` set on save.
- Guards `reentryVisible` (TodayScreen.tsx:389-395): add `!isReentryAnswered(today)`.
- ~5 lines, no store/sync change. Purely for instrumentation → retention metric.

### i18n (en.ts:198-209 + id.ts)
- `today.reentry.notePlaceholder` ("Apa yang menghalangi? / What got in the way?")
- `today.reentry.previous` ("Terakhir kali karena {trigger} / Last time it was {trigger}")
- `today.reentry.answered` (a11y/confirm label)

### Tests
- Extend `src/lib/dailyActivity.test.ts`: `isReentryAnswered` sets/reads; `getRelapseForDate` replay lookup.
- Vitest, colocated — pattern: `useMonkStore.setState(baseState(), false)`.

## Out of scope (`ponytail:`)
- Auto If-Then Plan B generation — bolt on after answered-rate proven.
- Sync of answered flag cross-device — localStorage per-date is enough until sync matters.
- Store-field approach — rejected: 6 touchpoints + ARRAY_KEYS registration for a flag that's instrumentation-only.

## Metric (from design-thinking analysis)
- Proxy: % of users who answer the diagnostic (note or trigger, no shame language) + complete ≥2 focus days after a miss.
- Live target: 15-day retention ≥ 6% vs 3.9% baseline.
- Never A/B against streaks — AVOID list.
