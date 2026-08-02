# Spec — F6: Reflection → Plan Feedback Loop

**STATUS: PENDING IMPLEMENTATION**

## Problem
User's close-day reflection (`whatMovedToday`) is captured and echoed back (competence feedback), but **never feeds forward** into the next day's plan. The research (research_foundation §13.4) requires: "show how their words changed tomorrow/week." Today the reflection is a dead-end — captured, echoed, discarded.

## Evidence
- Identified-regulation loop: seeing your own words reshape the plan closes the "reflection → adaptation" cycle (Van den Broeck 2021).
- A reflection that changes nothing is homework (research_foundation §13.8: "Every prompt must feed a plan change or be skippable").

## Design
After saving a close-day reflection on day D, the **next day's (D+1) TodayScreen** shows a small feed-forward hint when the user opens their plan:
- If `whatMovedToday` exists for yesterday (D-1) AND today's plan has a `mainAction`, render a subtle inline line above the plan editor:
  `"Yesterday you said: '{whatMovedToday}'. Keep that thread today?"`
- One-tap affordance: a GhostButton "Keep it as today's main action" that sets today's `mainAction` from the reflected thread (if today's mainAction is empty) OR offers "See yesterday" (link to timeline).
- **Non-blocking, skippable** — dismissible, never forces.

## Storage
- `NotebookEntry`/`JournalEntry.answers.whatMovedToday` already exists (string).
- New store action: `applyReflectionToPlan(date: string)` — sets today's dayPlan.mainAction if empty, from yesterday's reflection. Or simpler: read-only hint + one button that calls `createOrUpdateDayPlan(today, { mainAction })`.

## Files
- `src/screens/TodayScreen.tsx` — new `ReflectionThreadHint` inline block (near plan editor, ~line 305).
- `src/store/useMonkStore.ts` — tiny helper or reuse `createOrUpdateDayPlan`.
- i18n `en.ts`/`id.ts` — keys: `today.thread.title`, `today.thread.keep`, `today.thread.dismiss` (parallel).

## Constraints
- Keep calm non-coercive tone (no "you must finish what you started").
- Dismissed → stored in a `dismissedReflectionThreads` set keyed by date, so it never re-shows that day.
- No new deps. Zero migration.
