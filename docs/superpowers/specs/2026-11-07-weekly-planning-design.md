# Weekly Planning Ritual — repository-mapped design

Source: `Zendo_Weekly_Planning_UX_Spec_v0.1.md`, supplied by the product owner.
Status: approved by the product owner ("lanjutkan sampai selesai"), implemented and verified locally on 2026-11-07. Validation evidence: `docs/superpowers/specs/2026-11-07-weekly-planning-validation.md`.

## Problem and constraints

Help existing Zendo users connect Season Goals to weekly results and a realistic schedule without requiring a weekly wizard. Ideal Week remains reference-only. Every actual schedule change requires a preview and explicit confirmation. Focus completion never implies outcome, task, Main Action, or Goal completion.

## Repository findings

- `WeekScreen.tsx` currently presents goal allocations, activity evidence, rhythm, day planning, and weekly review. Preserve those established flows below the new planning summary.
- `WeeklyPlan` stores season-relative dates, goal allocations, and status; no Weekly Outcomes or planning-ritual confirmation marker exists. An automatically created weekly plan does not mean the user completed weekly planning.
- Actual `TimeBlock` records belong to dated `DayPlan.timeBlocks`; they already support title, local start/end time, category, and optional Goal link. No recurrence/template representation exists.
- `DayPlan.mainAction` and `highlight` are separate optional fields. Keep their selection explicit in Today.
- Today and Timeline reuse `DayTimeBlockVisualizer`; adjustment entry points must work wherever actual blocks appear.
- State passes through store snapshot, partial persistence, hydration, JSON export/import, and typed cloud merge. New fields must be included in every applicable path and survive legacy snapshots.
- `saveState` currently catches storage failures and returns void. Confirmation cannot use store mutation alone as proof of durable saving.
- Main routes currently require completed onboarding and an active Season. Spec's first-use/no-Season access contradicts that existing gate; include a bounded guest-Today path that preserves onboarding recovery rather than removing the gate indiscriminately.

## Alternatives and chosen direction

1. Recommended: incremental planning workspace inside Week, with an explicit confirmation view. Users can edit Outcomes, inspect commitments, or visit Ideal Week independently. Strong fit for skippable planning and existing navigation.
2. Optional multi-step wizard: clearer linear tutorial, but introduces navigation and draft complexity and risks making planning feel mandatory.
3. Full calendar replacement: useful for calendar-heavy users, but duplicates existing day scheduling and expands scope unnecessarily.

Choose option 1. Preserve current dark semantic tokens, type hierarchy, controls, and navigation. Use three top-level groups: Weekly Outcomes, Actual Week, Ideal Week reference. Reference rows use dashed boundaries plus explicit labels; actual rows use solid boundaries and dated times. Proposed additions have explicit proposal labels. No dependency or new visual system is needed.

## Flow and behavior

- Week opens with current date range, optional planning CTA, and a persistent Today shortcut. Existing weekly activity remains accessible.
- Outcomes allow title, optional Goal link, and optional done-when rule. Recommend 1–3 without enforcing a cap. Completion requires an explicit user action.
- Draft edits persist separately from confirmed Outcomes and Actual Week. Navigating away preserves the draft; canceling proposals never alters existing dated blocks.
- Last-week incomplete Outcomes offer carry forward, revise, or leave behind. Never copy automatically. Reflection notes remain user-written, with no inferred discipline or failure score.
- Ideal Week starts empty and accepts a single repeatable block: title, weekdays, start, duration, optional fixed/flexible and Goal/Practice link. Template edits explicitly affect future reference suggestions only; existing actual blocks remain unchanged.
- Each reference occurrence starts unselected. Select, edit proposed date/time, inspect overlaps, then preview exact dated additions. Zero selected blocks is valid.
- Preview separates existing blocks, additions, skipped proposals, duplicates, and conflicts. User resolves conflicts by editing or removing proposals; no automatic shifts. Conflict copy refers only to known Zendo commitments.
- Confirm saves Outcomes and new dated blocks together where feasible, with a stable occurrence identity preventing duplicate application, including after an occurrence is skipped or deferred.
- Actual block adjustments offer reschedule, reduce, keep for later, or skip this time. Preview retains Goal/Outcome links, identifies released time, and requires approval. Deferred/skipped occurrences remain recoverable and do not count as scheduled hours. Undo restores only the changed occurrence and checks current conflicts.
- Today shows relevant Weekly Outcome context and actual agenda. Choosing Main Action remains explicit. Starting/completing Focus does not mark Outcomes complete.

## Data and persistence

Extend existing dated block records with optional outcome/provenance/status fields so old records remain valid. Keep templates separate from actual events. Weekly planning draft and confirmation state attach to the canonical season-relative week. Outcomes have stable IDs, explicit status, optional source-outcome identity, and timestamps. Cloud merge must preserve deletions using existing tombstone conventions or retained deleted records rather than resurrecting removed items.

Validate dates, local times, positive duration, and overlaps at the mutation boundary. Midnight-spanning proposals must preview both dated portions rather than save invalid end-before-start blocks. Use local date helpers, not UTC conversion of date-only strings. Revalidate against current store immediately before confirmation.

Add an explicit persistence result path for new confirmation actions. On failure, retain draft, report what was not saved, and provide retry; never show success solely because in-memory state changed. Offline local persistence and cloud synchronization are distinct statuses.

## Verification plan

- Store tests: backward-compatible hydration/export/merge; draft reload; explicit carryover; unlimited Outcomes; reference selection creates no actual event; atomic confirmation and duplicate prevention; conflict checks; failed persistence retains draft; occurrence adjustments preserve template and links; recovery/undo; Focus independence; date and midnight boundaries.
- Browser journeys: skip planning to Today; create Outcomes without Ideal Week; create one reference; preview/apply one occurrence; resolve overlap; adjust and undo; switch language; resume draft after reload.
- Inspect at 360, 768, and 1280 CSS pixels. Check long labels, empty/error/success states, keyboard navigation, visible focus, screen-reader distinction, target sizes, and reduced motion. Run automated accessibility checks when available and report any tooling gap.
- Run project tests, typecheck, and production build. No production deployment is part of this implementation request.

## Delivery boundary

Implement specification stages 1–4 as one coherent feature, delivered in testable increments. External calendars, ICS imports, multiple templates, and automatic scheduling intelligence remain outside this update, matching the source document. User usability testing is a follow-up activity, not a claim made by implementation checks.
