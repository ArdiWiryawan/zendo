# Spec — "Release" as a Recurring Ritual (Mid-Season Goal Release)

**STATUS: PENDING IMPLEMENTATION**

## Problem
Goal "release" only exists in onboarding (`releasedGoalIds`). There is **no active-season release mechanism**. Research (§9.10): "Release as a recurring ritual, not just onboarding." A user who picks the wrong goal mid-season has no sanctioned way to let it go — so they either abandon everything or over-commit.

## Evidence
- Autonomy + identified regulation: sanctioned letting-go prevents guilt-driven abandonment.
- Research §13.7: anti-gamification stance — release must feel like a ritual, not a failure.

## Design
A **goal release affordance** reachable from where goals surface:
1. **Entry points:** (a) TodayScreen goal chip → long-press / "…" menu → "Release this goal"; (b) WeekScreen review "Release" choice.
2. **Ritual flow (CalmDialog):**
   - Title: "Release {goal}?"
   - Body: "Letting this go is a decision, not a failure. It frees energy for what matters."
   - Optional one-line note: "What will you do with the freed time?" (stored, echoed later)
   - Confirm "Release" (danger-tinted) / Cancel.
3. **Effect:** removes goal from `activeGoals`, clears its `goalAllocations` + `keystoneAction`, keeps it in an `archivedGoals` list (season archive shows it). Existing day plans referencing it stay (history preserved).
4. **New store action:** `releaseGoalFromSeason(goalId: string, note?: string)`.
5. **Archived goals surfacing:** SeasonEndScreen lists released goals as "released" (not failed).

## Storage
- New field: `releasedSeasonGoals: Array<{ goalId: string; note?: string; releasedAt: ISODateString }>`.
- `releaseGoalFromSeason` removes from active + allocs, appends to released list.

## Files
- `src/store/useMonkStore.ts` — `releaseGoalFromSeason`, `releasedSeasonGoals` state, remove-from-active logic.
- `src/screens/TodayScreen.tsx` — release entry on goal chip (small "…" / long-press affordance).
- `src/screens/SeasonEndScreen.tsx` — show released goals (optional this round).
- i18n `en.ts`/`id.ts` — keys: `release.title`, `release.body`, `release.note`, `release.confirm`, `release.cancel`.

## Constraints
- MUST be reusable from weekly-review release path (spec_weekly_redecide).
- Existing day plans / history not mutated — release is additive (archived list), never destructive.
- Calm, ritual, non-shaming copy. Zero new deps.
