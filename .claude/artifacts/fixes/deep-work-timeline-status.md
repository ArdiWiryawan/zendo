# Bug: Deep Work timeline session marked partial

> Status: FIXED
> Mode: default
> Severity: functional
> Author: user
> Last updated: 2026-06-28

## Symptom
Deep Work with 100 min focus + 20 min break showed as partial in timeline.

## Expected
Deep Work and Pomodoro should compare focus time to expected focus time, break time to expected break time, and total time to total session time.

## Reproduction
- Test location: `src/constants/focusSessionStatus.test.ts`
- Case: `deepWork` partial record with 100 min focus, 20 min break, 120 min total resolves to `completed`.
- Stability: executable helper test passed after fix.

## Hypotheses & diagnosis
| # | Hypothesis | Verdict | Evidence |
|---|---|---|---|
| H1 | Timeline day/session status used non-mode-aware focus/session data and did not normalize older partial records. | confirmed | Existing timeline status only treated focus presence as `partial` unless day plan was manually completed; older events loaded without session detail stayed stale. |
| H2 | Timer completion saved incomplete focus/break segment data. | confirmed | Completion path saved focus minutes and total seconds but not expected seconds/segments or `completedAt`. |

## Root cause
Completion status had no shared mode-aware resolver. Timeline day status and legacy event display could not infer that 100 min focus + 20 min break equals a complete 120 min Deep Work/Pomodoro session.

## Fix
- Added `src/constants/focusSessionStatus.ts` for expected configs, status resolution, normalization, and timeline description formatting.
- Saved total/focus/break seconds, completed segments, expected fields, and `completedAt` on completion.
- Normalized focus sessions and timeline events on localStorage load/save.
- Timeline day status now treats a completed focus session as completed.
- Timeline event rendering now displays focus, break, and total duration.

## Verification
- V-1: `npm run lint` -> exit 0
- V-2: `node node_modules\esbuild\bin\esbuild src\constants\focusSessionStatus.test.ts --bundle --platform=node --format=esm --outfile=test-artifacts\focusSessionStatus.test.mjs; node test-artifacts\focusSessionStatus.test.mjs` -> exit 0
- V-3: `npm run build` -> exit 0
- V-4: Playwright smoke at `http://localhost:5173/` -> page title `Zendo`, no console/page errors

## Regression test
- Path: `src/constants/focusSessionStatus.test.ts`
- Covers Deep Work complete, Pomodoro complete, Deep Work incomplete, and old record with inferred break.

## Pattern analysis
| Search | Result |
|---|---|
| `rg -n "focusDuration.*expectedTotal|focusDuration.*plannedDuration|Partial|partial|durationMinutes" src` | No direct focus-vs-expected-total comparison found after fix. Remaining `partial` references are timeline status labels/rules and regression tests. |

## Open questions / Follow-ups
Existing selector summaries still count focus minutes only, which matches "focus time" labels. No follow-up needed unless product wants total session time in those summaries.
