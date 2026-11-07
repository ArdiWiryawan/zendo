# Weekly Planning validation — 2026-11-07

Implemented approved weekly workspace, optional Outcomes and reflection/carryover, Ideal Week references, selective proposals, explicit preview/confirmation, known-overlap detection, Today context, occurrence adjustments/recovery/undo, and a bounded Today entry without a Season. Existing navigation and daily planning remain intact. Existing semantic tokens and native labeled controls are reused.

## Automated evidence

- `npx vitest run --maxWorkers 2`: 96 files, 979 tests passed. Includes 18 weekly-planning transaction/persistence regressions.
- `npm run lint`: passed (TypeScript project check).
- `npm run build`: passed, including PWA generation. Existing mixed static/dynamic import and bundle-size warnings remain.
- `git diff --check`: passed.
- Tests cover draft persistence, storage failure rollback, legacy cloud merge compatibility, duplicate prevention, overlap rejection, midnight splitting/group adjustments, cross-week ownership, explicit Outcome completion, unrelated records, and undo surviving stale cloud data.
- Fixed an existing hydration defect: each week now selects its own refreshed record rather than copying index zero, preserving different weeks' Outcomes and history after reload.

## Ego-browser evidence

Local development server only; screenshots and JSON reports in `artifacts/weekly-planning/`.

- Draft survives reload and resumes with title and done-when rule.
- Saving Ideal Week leaves actual block count at zero. Reference selection and preview also leave it at zero; only confirmation creates the dated block.
- Confirmed Outcome/block survives reload. Keep-for-later releases actual time; keyboard confirmation and Undo restore the block with reference unchanged.
- Conflicting manual proposal names both overlapping blocks and disables confirmation. Unselecting resolves conflict; confirming with zero additions preserves the existing actual block.
- Week measured at 360, 768, and 1280 CSS pixels: no horizontal overflow, one h1; existing reading surface caps at 480px. Screenshots visually inspected at all three widths.
- Axe WCAG 2 A/AA and 2.2 AA checks: no violations on final Week and Guest Today. Found and fixed pre-existing Week calendar list-role mismatch, then reran axe successfully.
- New planning flow operated using native keyboard focus/Enter, including preview, confirm, adjustment, and Undo.
- Today shows open Weekly Outcome context without choosing Main Action automatically.
- Switched language through Settings to EN: Week copy and document language change to English, user-authored Outcome text remains intact, and mobile has no horizontal overflow.
- Separate clean local origin (`127.0.0.1`) verifies Today with no Season. Highlight/Main Action persist after reload. Focus starts, pauses, and resets independently; no Season focus-session history is added.
- Simulated quota failure on Guest Today: error displayed, text retained, no false saved message. After restoring storage, save and reload succeed.

## Critique and corrections

1. Undo initially removed newly created dated rows, allowing stale cloud rows to resurrect blocks. Retained empty timestamped rows; regression verifies cloud merge.
2. Midnight adjustment initially lost provenance on continuation and could leave old dated parts. Grouped whole occurrence, retained links and duration, and verified moving/deferring from either dated part.
3. Preview could apply to records changed since preview. Added fresh revision/group checks before confirmation and explicit retry guidance.
4. Keep-draft initially closed even on storage failure. It now stays open and reports the unsaved draft.
5. Last actual block disappearing could unmount Undo. Kept adjustment recovery surface present for released occurrences.

## Limits

No production deployment, connected-calendar availability claims, or signed-in cross-device browser test. Cloud merge behavior is unit-tested; real network synchronization and participant usability targets require separate validation. Guest Focus is explicitly page-local, with no Season history. Existing floating navigation can overlay mid-page content while scrolling; keyboard and normal scrolling remain usable. No new runtime dependencies were added.
