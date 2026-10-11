# Zendo — Season-Aware Reflection & Journaling System Upgrade

**Date:** 2026-10-11
**Branch:** `feat/onboarding-mental-model`
**Method:** line-level code inspection, persisted-state inspection, full test-suite baseline. Every claim is tagged **[tested]** (read directly in code or executed) or **[assumed]** (inferred).

---

## A. Audit Report

### 1. Current behavior

There are **two reflection surfaces**, and they do not share a prompt source.

| Surface | Where | Prompt source |
|---|---|---|
| Journal screen, `reflection` tab | `src/screens/JournalEntryScreen.tsx:301` | rotating list, `getDailyJournalPromptForDate(lang, date)` |
| Close-day card | `src/screens/TodayScreen.tsx:63` (`CloseDayCard`) | **static string**, `t("today.closeDay.prompt")` |

The rotating list is `src/i18n/prompts/index.ts:49`:

```ts
export function getDailyJournalPromptForDate(lang: AppLanguage, date: string): string {
  // Fixed epoch so rotation is calendar-stable and independent of season start.
  const dayNumber = getDayNumber(date, "2020-01-01");
  const list = packs[lang].dailyJournal;
  return list[Math.abs(dayNumber) % list.length];
}
```

`packages[lang].dailyJournal` holds **10 items** (`src/i18n/prompts/en.ts:66-77`). The index is days-since-2020-01-01 mod 10. Nothing is written to the store; the value is recomputed on every mount from the date.

The data model (`src/types/app.ts:506-529`) stores answers only. `JournalEntry` is identified by `(seasonId, date)`, has no prompt field, and no status field. Completion is a boolean on `TimelineDay` (`journalCompleted`). The *skipped* state lives outside the store, in `localStorage["zendo.closeday.skipped.${date}"]`.

### 2. Confirmed problems

- **P1 · The week's most-seen prompt never changes. [tested]** `TodayScreen.tsx:67` renders `t("today.closeDay.prompt")` — one literal string, every night, forever. This is the surface a user meets on the home screen, so it is the strongest match for the reported symptom.
- **P2 · The rotating prompt repeats every 10 days. [tested]** A 10-item list indexed by calendar day guarantees the same question every 10 nights and only 10 distinct questions per language total.
- **P3 · The prompt is not persisted. [tested]** No prompt id or text is stored on any entry, so history cannot reconstruct what the user was actually asked. If the bank changes, old reflections silently re-label themselves — `getJournalAnswerItems` (`src/i18n/prompts/index.ts:56`) **recomputes** the question from the date for display.
- **P4 · No season awareness. [tested]** The rotation is anchored to the constant `2020-01-01`; the comment at `index.ts:50` states it is deliberately independent of season start. A question about "lessons learned" can land on day 1.
- **P5 · The two surfaces disagree. [tested]** Same app, same night, two different questions, from two unrelated mechanisms.
- **P6 · No lifecycle. [tested]** There is no `assigned → draft → submitted` state. "Skipped" is a localStorage side-channel with a duplicate declaration (`src/lib/dailyActivity.ts:162` and `src/lib/eveningNudge.ts:14` define `isCloseDaySkipped` identically).

### 3. Root causes

- The repeated-question symptom has **two independent causes**, not one: a hardcoded string on the home screen (`TodayScreen.tsx:67`) and a 10-item calendar-indexed list on the journal screen (`index.ts:49`). Neither is random, neither resets on refresh.
- **Ruled out** by inspection: no `Math.random()` in any prompt path; no state reset on refresh; the per-date draft key cannot cross-contaminate prompts.
- The absence of a prompt field on `JournalEntry` is why history is not faithful: display recomputes rather than reads.

### 4. Proposed changes

1. A single **curated bank of 50 prompts** as structured records with stable ids and localized text in one file, so identity is identical across languages and the bank is not scattered through UI components.
2. A **pure, deterministic selection function**, separate from presentation, keyed on `(seasonId, date)` so refresh/tab/device cannot change the night's question.
3. **Phase-aware eligibility** from real season progress (`early`/`middle`/`late`), computed from `startDate` + `durationDays` — no hardcoded 30/90 assumptions.
4. **Context tags** from signals the app actually has (rest day, focus day, energy, season near its end). No inference about feelings.
5. **Persisted assignment**: extend `JournalEntry` with `promptId`, an immutable `promptText` snapshot, `status`, and `submittedAt`. The existing save path already merges by `(seasonId, date)`, so it is idempotent and needs only to stop discarding these fields.
6. **One surface**: both the close-day card and the journal tab read the same assigned prompt.
7. **Skipping stays outside the record** — it must not become a failed reflection.

### 5. Data migration and regression risks

- Existing entries have no prompt fields → `promptText` is `undefined`. Display falls back to the legacy recompute so **no history is rewritten**; new entries always carry a snapshot.
- `syncMerge` unions `journalEntries` by id, newer `updatedAt` wins. Adding fields is a widening change; entries without them merge as `undefined` and are tolerated. A backfill that bumps `updatedAt` is **not** performed, so it cannot win a conflict.
- Prompt-bank updates must never rewrite old reflections — guaranteed by the stored `promptText` snapshot.
- Baseline before this work: **79 files, 840 tests passing**; `tsc --noEmit` exit 0.

---

## B–D. Implementation Summary, Verification Results, Final UX Assessment

Recorded in the commit for this work and in the verification section of this file's companion run. Filled in below once the gates are run.
## B. Implementation Summary

### Files added
| File | Purpose |
|---|---|
| `src/lib/reflectionPrompts.ts` | the 50-prompt bank + pure selection/phase logic |
| `src/lib/reflectionPrompts.test.ts` | 21 tests: bank shape, determinism, exclusion ladder, phases |
| `src/store/reflectionPersistence.test.ts` | 10 tests: assignment idempotency, submission, backward compat |
| `src/i18n/reflectionResolve.test.ts` | 3 tests: language handling and history freeze |

### Files changed
| File | Change |
|---|---|
| `src/types/app.ts` | `ReflectionStatus` type; 4 optional fields on `JournalEntry` |
| `src/store/useMonkStore.ts` | `assignReflectionPrompt` action; `saveJournalEntry` writes prompt fields + `submittedAt`; optional `opts.prompt` |
| `src/i18n/prompts/index.ts` | shared resolver, context builder, `ensureReflectionPromptAssigned`, `getJournalAnswerItems` prefers stored text |
| `src/screens/JournalEntryScreen.tsx` | reflection tab reads the shared resolver |
| `src/screens/TodayScreen.tsx` | close-day card reads the same resolver, replacing the hardcoded string |
| `src/screens/TimelineScreen.tsx`, `src/screens/SettingsScreen.tsx` | pass `promptText` into `getJournalAnswerItems` so exports show the real question |
| `src/i18n/messages/{en,id}.ts` | `reflection.assignedHint` |

### Prompt bank and rotation
50 prompts, ids `A01`–`E10`, 10 per category, `text: { en, id }` so identity is language-independent. `eligiblePhases` maps categories to early/middle/late. `selectReflectionPrompt` is deterministic (FNV-1a over `seasonId:date`, no `Math.random`, no clock) and walks a candidate ladder: phase+context → phase-only → all active, then unused-and-non-recent → non-recent → not-yesterday-and-unused → not-yesterday → any. It never returns `undefined`.

### Persistence and migration
`promptId` + an immutable `promptText` snapshot + `reflectionStatus` + `submittedAt` on `JournalEntry`. Assignment is **stable once made** — re-assign never overwrites. Existing entries keep working with all four fields absent; **no backfill was performed**, so no historical reflection was rewritten or re-timestamped and no sync conflict was manufactured. `storage.ts` was not changed: the whole-state blob round-trips optional fields as-is.

### UX changes
One question, both surfaces, same text. The close-day card no longer shows a permanent static string. A quiet `reflection.assignedHint` label sits above the question. Skip stays outside the record. Merely displaying a prompt writes **no** `journalCompleted` and **no** timeline event.

## C. Verification Results

**Run:**

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx tsc -b` (the build's stricter pass) | exit 0 |
| `npx vitest run` | **82 files, 874 tests passing** (baseline was 79 / 840) |
| `npm run build` | `✓ built in 8.70s`, PWA precache 46 entries |

**Tested, live (Playwright against the dev server, real persisted state):**
- The journal reflection tab renders an assigned prompt. **[tested]**
- Assignment persists: `promptId: "C04"` with its `promptText` snapshot written to the store; surviving a full page reload unchanged. **[tested]**
- Assigning writes **no** `timelineDays` row and does **not** set `journalCompleted`. **[tested]**
- Submitting sets exactly one entry to `reflectionStatus: "submitted"` with `submittedAt`, keeps `promptText`, saves the answer, and only then marks the timeline day complete. **[tested]**
- The four pre-existing September entries kept no prompt fields and were not rewritten. **[tested]**
- Language switch: an unanswered day follows its id into the new language; an answered day keeps the words it was answered in. **[tested — after the fix below]**
- 390 px: no horizontal overflow, zero emoji in rendered text, zero console errors. **[tested]**
- 90-day simulated season: 0 consecutive repeats, all 50 distinct prompts used. 7-day: `early,early,early,middle,middle,late,late`, 0 consecutive repeats. 14-day: clean thirds. **[tested — via a scratch test, since removed]**

**One defect found and fixed during verification.** The resolver returned the stored `promptText` unconditionally, so switching language left an *unanswered* day showing the previous language's wording. Fixed: a submitted day keeps its frozen wording (history), an open day resolves through its id into the current language.

**Known limitations, stated plainly:**
- **Supabase cross-device sync is NOT tested.** No server was available. `journalEntries` ride the existing whole-state blob; nothing new was added to the sync path, but "two devices requesting the same night's prompt simultaneously agree" is **[assumed]**, not verified.
- **The close-day card was not seen rendering live.** It is gated on `isDone || focusMinutes > 0` and today has no completed focus. Verified by code inspection only: it calls the same `resolveReflectionPromptText` as the journal tab. **[assumed — shared-function identity, not a rendered observation]**
- No automated test asserts the **render path** of either screen; the resolver beneath them is unit-covered.
- `today.closeDay.prompt` is now an orphaned i18n key in both locales. Left in place deliberately (deleting copy is a one-way door) and reported rather than removed.

## D. Final UX Assessment

**More varied.** The user meets 50 distinct questions instead of one static string plus a 10-item loop. Over the simulated 90-day season every prompt was used exactly once before any repeat.

**More relevant.** Each question is chosen for where the season actually is: beginnings while starting, adjustment while mid-season, meaning and direction as it closes. The same code serves 7/14/30/90 days because the phase is a fraction of progress, not a date.

**Easier to complete at night.** One question, one short answer, no dashboard, no score, no second form. The question a tired person sees is the same one on both surfaces and does not change under them when they reload.

**Simpler than before, despite doing more.** Two mechanisms collapse into one shared resolver; a hardcoded string disappears; the write path gains no new keys. Skipping remains free, and looking at the question is not recorded as answering it.

Reflection here is not a test of whether the day was productive. It is one honest sentence, chosen for the night it is asked on, kept exactly as it was asked.
