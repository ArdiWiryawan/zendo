# Reflection System — Implementation Contract (frozen interface)

Authoritative for the 3 parallel agents. Do not deviate from names/signatures. File ownership is exclusive.

## Ownership

| Agent | May write ONLY these files |
|---|---|
| 1 — bank + selection | `src/lib/reflectionPrompts.ts`, `src/lib/reflectionPrompts.test.ts` |
| 2 — types + persistence | `src/types/app.ts`, `src/store/useMonkStore.ts`, `src/lib/storage.ts` |
| 3 — UI + wiring + copy | `src/screens/JournalEntryScreen.tsx`, `src/screens/TodayScreen.tsx`, `src/i18n/prompts/index.ts`, `src/i18n/messages/en.ts`, `src/i18n/messages/id.ts` |

Agents 2 and 3 may READ agent 1's module but must not edit it. Nobody else edits `useMonkStore.ts`.

## Module 1 — `src/lib/reflectionPrompts.ts` (Agent 1)

```ts
export type ReflectionPhase = "early" | "middle" | "late";
export type ReflectionCategory =
  | "awareness" | "progress" | "energy" | "learning" | "identity";
export type ReflectionContext =
  | "rest_day" | "focus_day" | "low_energy" | "season_ending" | "universal";

export type ReflectionPrompt = {
  id: string;                          // "A01".."E10", stable across languages
  text: { en: string; id: string };
  category: ReflectionCategory;
  eligiblePhases: ReflectionPhase[];   // empty array = eligible in every phase
  contextTags: ReflectionContext[];
  isActive: boolean;
  version: number;
};

export const REFLECTION_PROMPTS: readonly ReflectionPrompt[];  // EXACTLY 50

export type ReflectionPhase = "early" | "middle" | "late";

export function computeReflectionPhase(
  season: { startDate: string; durationDays: number } | null,
  date: string
): ReflectionPhase | null;

export type ReflectionSelectionInput = {
  seasonId: string | null;
  date: string;
  season: { startDate: string; durationDays: number; status?: string } | null;
  usedPromptIdsInSeason: string[];   // every id already assigned this season
  recentPromptIds: string[];         // most-recent-first, last few days
  context: ReflectionContext[];
};

export function selectReflectionPrompt(input: ReflectionSelectionInput): ReflectionPrompt;
export function getReflectionPromptText(id: string, lang: "en" | "id"): string | null;
```

Hard rules:
- Exactly 50 prompts, 10 per category, ids `A01..A10`, `B01..B10`, `C01..C10`, `D01..D10`, `E01..E10`.
- Text is the spec's 50 prompts verbatim (English) + natural Indonesian. One short sentence each.
- Deterministic. **No `Math.random`, no `Date.now`.** Pick by a stable hash of `` `${seasonId}:${date}` `` over the candidate set, then walk forward until a candidate is found.
- Eligibility order: prompts whose `eligiblePhases` include the phase AND whose `contextTags` intersect the supplied context (or are `universal`). Fall back to phase-only, then to all active prompts. Never return a prompt with `isActive: false` unless every prompt is inactive.
- Exclude `recentPromptIds[0]` (yesterday) and any id in `recentPromptIds.slice(0, 3)` when alternatives exist. Then prefer ids absent from `usedPromptIdsInSeason`. Then allow controlled reuse.
- `computeReflectionPhase`: `progress = (daysPassed - 1) / durationDays` where `daysPassed = clamp(differenceInCalendarDays(date, startDate) + 1, 1, durationDays)`. `progress < 1/3 → early`, `< 2/3 → middle`, else `late`. Works for 7/14/30/90. Returns `null` when season is null or duration invalid. Reuse `parseLocalDateKey` from `src/lib/date.ts` for timezone consistency.
- Phase → default eligible categories: early → `awareness`; middle → `progress`, `learning`, `energy`; late → `identity`, `learning`. Encode this with `eligiblePhases` on each prompt; `contextTags` carry the rest.

## Module 2 — persistence (Agent 2)

`src/types/app.ts`:
```ts
export type ReflectionStatus = "prompt_assigned" | "draft" | "submitted";

export type JournalEntry = {          // EXISTING fields unchanged
  // ...existing...
  promptId?: string;                  // stable bank id, drives rotation/dedup
  promptText?: string;                // immutable snapshot of the question SHOWN
  reflectionStatus?: ReflectionStatus;
  submittedAt?: ISODateString;
};
```

`src/store/useMonkStore.ts`:
- New action `assignReflectionPrompt(date: string, promptId: string, promptText: string): void`
  - Idempotent on `(seasonId, date)`. Creates the entry if absent, otherwise **updates only the prompt fields**.
  - MUST NOT touch `timelineDays`, `timelineEvents`, or `journalCompleted`. Looking at the prompt is not writing a journal.
  - MUST NOT overwrite an existing `promptId` for that date (assignment is stable once made).
  - Sets `reflectionStatus: "prompt_assigned"` only when absent or already `prompt_assigned`.
- `saveJournalEntry` must:
  - Preserve `promptId`/`promptText`/`reflectionStatus` from `existing` — never regenerate.
  - Set `reflectionStatus: "submitted"` and `submittedAt` when the reflection answer (`whatMovedToday`) is non-empty.
  - Remain idempotent: one entry per `(seasonId, date)`.
- Do NOT change any existing signature. `saveJournalEntry(answers, opts)` keeps its shape.

`src/lib/storage.ts`: no new key required. Optional `saveJournalEntry` accepts an extra `opts.prompt?: { id: string; text: string }` (additive, optional).

## Module 3 — UI (Agent 3)

- Both `JournalEntryScreen` (reflection tab) and `TodayScreen` `CloseDayCard` read the **same assigned prompt**:
  1. `const assigned = store.journalEntries.find(e => e.date === today && e.seasonId === activeSeasonId)`.
  2. If `assigned?.promptText` → show it (history-faithful).
  3. Else if `assigned?.promptId` → `getReflectionPromptText(promptId, lang)`.
  4. Else → call `selectReflectionPrompt(...)`, then `assignReflectionPrompt(date, p.id, p.text[lang])`, and render it.
- Context passed to the selector comes ONLY from data the app has: `rest_day` when the day plan is rest, `focus_day` when focus evidence exists for the date, `low_energy` when an `EnergyLog` exists and is low, `season_ending` when `getDaysLeft(season.endDate) <= 2`. Otherwise `["universal"]`. Never infer feelings.
- `getJournalAnswerItems` must prefer the stored `promptText` over recomputing from the date, so Library/Timeline/exports never re-label history.
- Keeps `getDailyJournalPromptForDate` exported (other callers may exist) — it may delegate to the new selector or stay as-is, but it must not throw.
- New i18n keys, EN + ID parity: `reflection.assignedHint` (a quiet one-line label), `reflection.skip` if not already present. Keep tone calm; no emoji; no productivity judgement.
- Exactly one question visible at a time. Skip stays non-punitive and out of the record.

## Gates (run by the lead agent after all three land)

`npx tsc --noEmit` → exit 0; `npx vitest run` → all green. No commit, no deploy.