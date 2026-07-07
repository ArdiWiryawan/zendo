# Bug: Daily activity status and journal context

> Status: FIXED
> Mode: default
> Severity: functional
> Author: user
> Last updated: 2026-06-28

## Symptom
Journal answers appeared without questions. Empty/future days could show progress-like states. Daily completion did not require both focus and learning.

## Expected
Journal answers show their prompt. Day status is activity-based: focus + learning = completed, one of them = partial, neither = not started.

## Reproduction
- Test location: `src/constants/dailyActivityStatus.test.ts`
- Cases: empty, focus-only, learning-only, focus+learning, future empty, helper copy.

## Hypotheses & diagnosis
| # | Hypothesis | Verdict | Evidence |
|---|---|---|---|
| H1 | Timeline status relied on `dayPlan.status`/date existence instead of actual activity. | confirmed | `deriveTimelineStatus` returned completed for completed day plan and partial for active day plan before checking real focus+learning completion. |
| H2 | Learning sessions were saved to feed but did not update `timelineDays`. | confirmed | `saveLearningSession` appended event/session only. |
| H3 | Journal UI rendered answer fields with abbreviated labels or event description only. | confirmed | Timeline used `event.description`; Library Journal rendered answer text with short labels. |

## Root cause
Daily activity status had no shared resolver. Focus, learning, journal, and timeline paths each inferred status/display separately, so date/dayPlan state could masquerade as progress and journal context was lost in display.

## Fix
- Added `src/constants/dailyActivityStatus.ts` for daily status + helper copy.
- Updated `deriveTimelineStatus` to require actual focus and learning activity.
- Updated `saveLearningSession` to refresh same-day `timelineDays` and mark day complete only when focus also exists.
- Updated focus completion path to avoid completing day unless daily activity is complete.
- Updated Timeline journal cards to render question + answer pairs.
- Updated Library Journal cards to show date, daily status, focus summary, learning summary, and question + answer pairs.
- Added visible Today status helper in Timeline.

## Verification
- V-1: `npm run lint` -> exit 0
- V-2: `node node_modules\esbuild\bin\esbuild src\constants\dailyActivityStatus.test.ts --bundle --platform=node --format=esm --outfile=test-artifacts\dailyActivityStatus.test.mjs; node test-artifacts\dailyActivityStatus.test.mjs` -> exit 0
- V-3: `node test-artifacts\focusSessionStatus.test.mjs` -> exit 0
- V-4: `npm run build` -> exit 0
- V-5: Playwright smoke at `http://localhost:5173/` -> page title `Zendo`, no console/page errors

## Regression test
- Path: `src/constants/dailyActivityStatus.test.ts`
- Covers empty day, focus only, learning only, focus + learning, future empty, helper text.

## Pattern analysis
| Search | Result |
|---|---|
| `rg -n "deriveTimelineStatus|dayPlan.status === \"completed\"|defaultStatus = \"partial\"|date <= today|statusForDate" src` | Status derivation now routes through activity helper; no date-only `statusForDate` fallback remains. |

## Open questions / Follow-ups
Manual retroactive "Save Log" still creates a day plan but no focus/learning session. Timeline status now remains `not_started` until real activity exists, matching request.
