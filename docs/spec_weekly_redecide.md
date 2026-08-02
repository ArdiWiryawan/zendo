# Spec — Weekly Review: Re-Decide, Not Re-Commit

**STATUS: PENDING IMPLEMENTATION**

## Problem
WeekScreen shows stats + a "week wrap" but has **no weekly review step**. Research (§9.8): "Weekly review prompts that re-decide, not re-commit." The user should be asked *continue / adjust / release* per goal — not just "did you hit your target?"

## Evidence
- Autonomy (self-determination theory): re-deciding goals sustains identified regulation; forcing re-commitment feels controlling.
- Reflection cadence: weekly review is the bounded, evidence-reasonable cadence (research §12.1).

## Design
On WeekScreen, when a week is complete (all 7 days elapsed, or showWeekWrap true), show a **"Review your week"** card (below stats, above wrap):
- For each goal in the weekly plan allocation: a row with the goal title + 3 choices:
  - **Continue** (default, keeps goal + allocation)
  - **Adjust** → inline expand: change `mainAction` or `keystoneAction`
  - **Release** → removes goal from this season's active set (see release ritual spec)
- After review, one summary line: "N goal(s) continue, M adjusted, K released. This is a re-decision, not a report card."
- **Skippable** — a "Skip review" ghost button; dismissed state stored per week.

## Storage
- New store action: `reviewWeek(weekId: string, decisions: Record<goalId, {action: "continue"|"adjust"|"release"; mainAction?: string}>)`.
- New field: `weeklyReviews: Record<weekId, {date: string; decisions: ...; skipped?: boolean}>` (persisted).
- `release` delegates to the goal-release store action (release ritual spec).

## Files
- `src/screens/WeekScreen.tsx` — `WeekReviewCard` (below stats ~line 78, above week wrap).
- `src/store/useMonkStore.ts` — `reviewWeek` + `weeklyReviews` state.
- i18n `en.ts`/`id.ts` — keys: `week.review.title`, `week.review.continue`, `week.review.adjust`, `week.review.release`, `week.review.summary`, `week.review.skip`.

## Constraints
- Calm tone; "re-decide" framing, never "you failed."
- Release path MUST call the shared goal-release action (single source of truth).
- Zero new deps. Existing `goalAllocations`, `keystoneActions` drive the UI.
