# Weekly Planning implementation plan

Goal: implement approved weekly planning flow without replacing existing daily planning.
Architecture: optional fields on existing weekly plans/settings, pure planning transactions, existing Zustand persistence and UI tokens. React, TypeScript, Vitest; no new runtime dependency.

- [x] Add failing transaction tests: proposals stay drafts, conflicts abort, repeated occurrence is idempotent, midnight splits, adjustments preserve templates, failed local persistence leaves state unchanged.
- [x] Add backward-compatible types and pure planning helpers in `src/lib/weeklyPlanning.ts`. Store `WeeklyRitual` on `WeeklyPlan.ritual`, reference blocks on `AppSettings.idealWeek`; use original occurrence keys for duplicate prevention.
- [x] Connect durable transactions to store through `src/lib/weeklyPlanningStore.ts`; write canonical storage before publishing state. Test with `npx vitest run src/lib/weeklyPlanning.test.ts`.
- [x] Build optional `WeeklyPlanningPanel` in Week: outcomes/reflection, reference editor, known schedule, explicit preview/confirmation, retained drafts and recovery. Native labeled inputs; existing controls/tokens; ID and EN copy.
- [x] Add Today Outcome context and shared actual-block adjustments; keep Main Action/Focus completion independent. Add bounded no-Season Today entry without removing onboarding recovery.
- [x] Run full tests, TypeScript and build. Inspect 360/768/1280 widths, keyboard, persistence reload, conflict/duplicate/adjustment journeys, and accessibility. Fix concrete defects and record evidence.

Execution inline, as user requested completion without another handoff. External calendars/imports/multiple templates remain outside source spec MVP.
