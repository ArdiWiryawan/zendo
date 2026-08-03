# Graph Report - zendo  (2026-08-03)

## Corpus Check
- 130 files · ~117,120 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1411 nodes · 2980 edges · 150 communities (127 shown, 23 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5d8878b6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- useMonkStore
- FocusSession.tsx
- pwa_spec.md
- technical_spec.md
- screen_spec.md
- MonkMVPState
- Zendo Research Foundation
- useMonkStore.ts
- app.ts
- app_logic.md
- compilerOptions
- devDependencies
- dependencies
- Design System for Monk Mode PWA
- Spec — Obstacle + Mitigation Step (WOOP)
- 9.2 Card
- lucide-react
- planScoring.ts
- ux_writing.md
- PwaInstallBanner.tsx
- defaultData.ts
- design system.md
- 7. Onboarding Copy
- data_model.md
- compilerOptions
- i18n/index.ts
- SettingsScreen.tsx
- component_library.md
- main.tsx
- prompts/en.ts
- 9. Component System
- prompts/id.ts
- 4.3 Typography Usage
- Sync conflict policy
- implementation_plan.md
- 10. Phase 5 — Main App Screens
- syncMerge.ts
- LauncherActivity
- Spec — 5 Product Additions (Batch A/B/C)
- Spec — F6: Reflection → Plan Feedback Loop
- Spec — "Release" as a Recurring Ritual (Mid-Season Goal Release)
- Spec — Weekly Review: Re-Decide, Not Re-Commit
- scripts
- JournalNotebook.tsx
- 15. Validation Message Library
- 11. Phase 6 — Focus, Learning, Journal
- 17. Manual QA Scenarios
- focusSessionStatus.ts
- 14. Empty State Library
- 16. Notification Copy
- 25. Progress Calculation Logic
- 27. Notification Logic
- 31. Error & Edge Case Logic
- 10. Weekly Components
- 15. Timeline Components
- 6. Form Components
- 11. Screen Layout Pattern
- Spec — UI/UX Improvements (audit-driven)
- 7. Phase 2 — Data Types & State Store
- 19. Before / After Copy Improvements
- 4. Copy Length Rules
- 6. Product Language
- 13. Weekly Allocation Logic
- 30. Empty State Logic
- 11. Today Components
- 17. Feedback Components
- 5. Layout Components
- 9. Goal Components
- 19. Derived Values
- 21. State Transitions
- 10. Mobile-First Layout
- 12. Phase 7 — Timeline & Season Reflection
- 19. Risk Management
- 5. Phase 0 — Project Setup
- 6. Phase 1 — Design Tokens & UI Foundation
- 8. Phase 3 — Onboarding Flow
- 9. Phase 4 — Season & Weekly Logic
- package.json
- 18. Microcopy Patterns
- 8. Main App Copy
- 16. Flow Mode Day Logic
- 17. Today Highlight Logic
- 23. Relapse Logic
- 26. Season End Logic
- Application
- DelegationService
- 12. Focus Components
- 13. Learning Components
- 14. Journal Components
- 4. Navigation Components
- 7. Choice Components
- 8. Season Components
- 10. DayPlan
- 9. WeeklyPlan
- coach.ts
- gradlew
- 13. Phase 8 — PWA Setup
- 14. Phase 9 — QA & Polish
- 2. MVP Scope
- 10. Season Logic
- 12. Weekly Mode Logic
- 19. Learning Companion Logic
- 20. Focus Session Logic
- 29. Editing Logic
- 5. Distraction Removal Logic
- 8. Goal Elimination Logic
- 16. Relapse Components
- 18. Settings Components
- 3. App Shell Components
- 6. Season
- 7. Goal
- 8. BadHabit
- Design System — Zendo Zen Dark Minimalism PWA
- 3. Color System
- 7. Border & Shadow
- PageTransition.tsx
- tsconfig.json
- 3. Tone Rules
- AGENTS.md
- 14. WeeklyPlan Creation Logic
- syncStatus.ts
- 4. Habit Audit Logic
- restSuggestion.test.ts
- 11. FocusSession
- 12. LearningEntry
- 13. JournalEntry
- 14. RelapseLog
- 15. TimelineDay
- 20. Validation Rules
- 4. UserProfile
- 5. AppSettings
- @testsprite/testsprite-cli
- @types/react
- vercel.json
- useMonkStore.notebook.test.ts
- 18. Daily Main Action Logic
- 7. Goal Brain Dump Logic

## God Nodes (most connected - your core abstractions)
1. `useMonkStore` - 90 edges
2. `useT()` - 70 edges
3. `t()` - 50 edges
4. `getTodayDateString()` - 40 edges
5. `TodayScreen()` - 30 edges
6. `selectTodayPlan()` - 24 edges
7. `addDaysToDate()` - 23 edges
8. `GhostButton()` - 21 edges
9. `formatHumanDate()` - 21 edges
10. `PrimaryButton()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `RootRedirect()` --calls--> `useMonkStore`  [EXTRACTED]
  src/app/App.tsx → src/store/useMonkStore.ts
- `OnboardingGate()` --calls--> `useMonkStore`  [EXTRACTED]
  src/app/App.tsx → src/store/useMonkStore.ts
- `ProtectedMain()` --calls--> `useMonkStore`  [EXTRACTED]
  src/app/App.tsx → src/store/useMonkStore.ts
- `OnboardingScreen()` --calls--> `useMonkStore`  [EXTRACTED]
  src/app/App.tsx → src/store/useMonkStore.ts
- `findTodayPlan()` --calls--> `getTodayDateString()`  [EXTRACTED]
  src/store/useMonkStore.ts → src/lib/date.ts

## Import Cycles
- None detected.

## Communities (150 total, 23 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.06
Nodes (76): ArchiveScreenLazy, FocusScreen, JournalEntryScreenLazy, JournalLibraryScreenLazy, LearningScreenLazy, NotebookPageLazy, OnboardingGate(), OnboardingScreen() (+68 more)

### Community 1 - "useMonkStore"
Cohesion: 0.05
Nodes (111): DefenseChips(), LoginScreen(), RetroLogModal(), SeasonProgressCard(), SignupScreen(), BottomNav(), EmptyState(), SettingsLink() (+103 more)

### Community 2 - "FocusSession.tsx"
Cohesion: 0.05
Nodes (66): App(), createFocusPhases(), FocusPresetConfig, getCompletedSeconds(), getCurrentFocusPhase(), getTotalPlannedMinutes(), summarizeFocusSession(), getSharedCtx() (+58 more)

### Community 3 - "pwa_spec.md"
Cohesion: 0.04
Nodes (46): 10. Update Behavior, 11. Install Prompt Logic, 12. Local Storage Specification, 13. IndexedDB Upgrade Path, 14. Data Persistence Rules, 15. Notification Specification, 16. Reminder Schedule Defaults, 17. Grey Mode Limitation (+38 more)

### Community 4 - "technical_spec.md"
Cohesion: 0.05
Nodes (40): 10. Selectors, 11. Persistence Layer, 12. Validation Layer, 13. Onboarding Implementation, 14. Season Creation Logic, 15. Weekly Plan Logic, 16. Today Logic, 17. Focus Timer Implementation (+32 more)

### Community 5 - "screen_spec.md"
Cohesion: 0.05
Nodes (37): A. Header, B. Today Focus Card, Bottom Navigation, C. Learning Companion, D. Energy Check, E. Focus CTA, F. Reflect Shortcut, Final UX Rule (+29 more)

### Community 6 - "MonkMVPState"
Cohesion: 0.16
Nodes (8): createInitialState(), mkState(), baseState(), today, baseState(), today, Goal, MonkMVPState

### Community 7 - "Zendo Research Foundation"
Cohesion: 0.07
Nodes (27): 10. Measurement Framework, 11. Risks & Ethical Considerations, 12. Research Gaps — what remains uncertain, 13. Final Recommendations — highest-impact changes, 1. Executive Summary — the 20 findings that matter most, 2. Why People Succeed or Fail — the model, 3.1 Goals, 3.2 Habits (+19 more)

### Community 8 - "useMonkStore.ts"
Cohesion: 0.12
Nodes (22): getWeekEndDate(), getWeekStartDate(), buildPlanningSequence(), deriveTimelineStatus(), findTodayPlan(), getActiveGoals(), getFocusSessionsForDay(), getLearningSessionsForDay() (+14 more)

### Community 9 - "app.ts"
Cohesion: 0.09
Nodes (21): DateOnlyString, DayStatus, DayType, EnergyLog, GoalStatus, ISODateString, JournalEntry, JournalPackAnswer (+13 more)

### Community 10 - "app_logic.md"
Cohesion: 0.09
Nodes (22): 11. Keystone Action Logic, 15. Planning Mode Day Logic, 1. Product Logic Philosophy, 21. Day Completion Logic, 22. Journal Logic, 24. Timeline Logic, 28. Reset Logic, 2. App Entry Logic (+14 more)

### Community 11 - "compilerOptions"
Cohesion: 0.09
Nodes (21): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop (+13 more)

### Community 12 - "devDependencies"
Cohesion: 0.11
Nodes (19): autoprefixer, devDependencies, autoprefixer, playwright, postcss, tailwindcss, @types/node, @types/react-dom (+11 more)

### Community 13 - "dependencies"
Cohesion: 0.11
Nodes (19): date-fns, framer-motion, dependencies, date-fns, framer-motion, react, react-dom, react-router-dom (+11 more)

### Community 14 - "Design System for Monk Mode PWA"
Cohesion: 0.11
Nodes (17): Accessibility, Buttons, Cards (`Card`), Choice Cards (`ChoiceCard`), Choice Chips (`ChoiceChip`), Color Palette, Components, Design System for Monk Mode PWA (+9 more)

### Community 15 - "Spec — Obstacle + Mitigation Step (WOOP)"
Cohesion: 0.11
Nodes (17): 1. `src/types/app.ts` — Goal type, 2. `src/types/app.ts` — OnboardingState, 3. New store action — `src/store/useMonkStore.ts`, 4. New step component — `src/screens/OnboardingSteps.tsx`, 5. Wire routing — `src/app/App.tsx`, 6. Insert into order — `src/constants/routes.ts`, 7. Persist — `src/store/useMonkStore.ts`, `createSeasonFromOnboarding` (line ~679), Data model changes (+9 more)

### Community 16 - "9.2 Card"
Cohesion: 0.50
Nodes (4): 9.2 Card, Default Card, Focus Card, Soft Card

### Community 19 - "planScoring.ts"
Cohesion: 0.23
Nodes (11): defaultWeeklyTargets(), capacityCheck(), PlanScore, planStrengthLabel(), scoreAntiGoals(), scoreDuration(), scoreKeystoneActions(), scorePlan() (+3 more)

### Community 20 - "ux_writing.md"
Cohesion: 0.13
Nodes (14): 10. Learning Copy, 11. Relapse Copy, 12. Season Reflection Copy, 13. Settings Copy, 17. Button Copy Rules, 1. UX Writing Philosophy, 20. Writing QA Checklist, 21. Final UX Writing Rule (+6 more)

### Community 21 - "PwaInstallBanner.tsx"
Cohesion: 0.32
Nodes (11): PwaInstallBanner(), BeforeInstallPromptEvent, canShowInstallBanner(), dismissInstall(), initPwaInstallCapture(), isInstallDismissed(), isStandalone(), listeners (+3 more)

### Community 22 - "defaultData.ts"
Cohesion: 0.13
Nodes (17): BUILT_IN_JOURNAL_PACKS, createDefaultSettings(), DEFAULT_NOTEBOOK_CATEGORIES, frictionActionsForHabit(), habitOptions, learningTypes, nowIso(), createId() (+9 more)

### Community 23 - "design system.md"
Cohesion: 0.15
Nodes (12): 12. Motion Design, 13. Copywriting Rules, 14. Component Priority for MVP, 15. Accessibility Rules, 16. PWA-Specific Design Rules, 17. Design QA Checklist, 18. Final Design Principle, 2. Visual Direction (+4 more)

### Community 24 - "7. Onboarding Copy"
Cohesion: 0.15
Nodes (13): 7. Onboarding Copy, Screen 01 — Splash, Screen 02 — Welcome, Screen 03 — Habit Audit, Screen 04 — Remove Distractions, Screen 05 — Grey Mode Guide, Screen 06 — Goal Brain Dump, Screen 07 — Goal Elimination (+5 more)

### Community 25 - "data_model.md"
Cohesion: 0.17
Nodes (11): 16. NotificationReminder, 17. Storage Structure, 18. MVP localStorage Shape, 1. Data Model Philosophy, 22. Example Full MVP State, 23. Implementation Notes, 24. Final Data Rule, 2. Entity Overview (+3 more)

### Community 26 - "compilerOptions"
Cohesion: 0.17
Nodes (11): postcss.config.cjs, tailwind.config.ts, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution (+3 more)

### Community 27 - "i18n/index.ts"
Cohesion: 0.26
Nodes (9): catalogs, en, MessageKey, id, getPromptPack(), packs, PromptPackId, AppLanguage (+1 more)

### Community 28 - "SettingsScreen.tsx"
Cohesion: 0.27
Nodes (8): getDailyJournalPromptForDate(), getJournalAnswerItems(), getJournalQuestionLabels(), exportStateAsJson(), sectionReveal, SettingsScreen(), syncDotColor(), syncLabel()

### Community 29 - "component_library.md"
Cohesion: 0.18
Nodes (10): 19. Component State Rules, 1. Component Philosophy, 20. Icon Rules Per Component, 21. Animation Rules Per Component, 22. MVP Component Build Order, 23. Component QA Checklist, 24. Final Component Rule, 2. Component Categories (+2 more)

### Community 30 - "main.tsx"
Cohesion: 0.38
Nodes (8): getState(), getSupabase(), setState(), supabase(), ZendoState, setSyncStatus(), initSync(), router

### Community 31 - "prompts/en.ts"
Cohesion: 0.20
Nodes (9): journalQuestionLabels, promptsBig90Days, promptsClosing90Days, promptsDailyJournal, promptsFocusGoal, promptsIdentityDiscipline, promptsLifeAudit, promptsSystemDesign (+1 more)

### Community 32 - "9. Component System"
Cohesion: 0.20
Nodes (10): 9.1 Button, 9.3 Input, 9.4 Textarea, 9.5 Chip, 9.6 Bottom Navigation, 9. Component System, Ghost Button, Primary Button (+2 more)

### Community 34 - "prompts/id.ts"
Cohesion: 0.20
Nodes (9): journalQuestionLabels, promptsBig90Days, promptsClosing90Days, promptsDailyJournal, promptsFocusGoal, promptsIdentityDiscipline, promptsLifeAudit, promptsSystemDesign (+1 more)

### Community 35 - "4.3 Typography Usage"
Cohesion: 0.22
Nodes (9): 4.1 Font, 4.2 Type Scale, 4.3 Typography Usage, 4. Typography, Body Text, Muted Text, Page Title, Section Title (+1 more)

### Community 36 - "Sync conflict policy"
Cohesion: 0.22
Nodes (8): 1. Sources of truth, 2. Current startup merge (as implemented), 3. Conflict implications (risks), 4. Chosen policy (sprint 1 lock), 5. Status labels (UI), 6. Out of scope this sprint, Sprint-1 policy (5 bullets), Sync conflict policy

### Community 37 - "implementation_plan.md"
Cohesion: 0.22
Nodes (8): 15. Feature Build Order, 16. MVP Acceptance Checklist, 18. Non-Goals for MVP, 1. Implementation Goal, 20. Final Implementation Rule, 3. Implementation Principles, 4. Development Phases, implementation_plan.md — Monk Mode PWA

### Community 38 - "10. Phase 5 — Main App Screens"
Cohesion: 0.22
Nodes (9): 10. Phase 5 — Main App Screens, Acceptance Criteria, Goal, Journal Screen Requirements, Screens, Tasks, Timeline Screen Requirements, Today Screen Requirements (+1 more)

### Community 39 - "syncMerge.ts"
Cohesion: 0.33
Nodes (8): ARRAY_KEYS, HasId, HasUpdatedAt, isNewer(), mergeById(), mergeRemoteState(), mergeScalar(), SCALAR_KEYS

### Community 40 - "LauncherActivity"
Cohesion: 0.39
Nodes (4): Override, LauncherActivity, Bundle, Uri

### Community 41 - "Spec — 5 Product Additions (Batch A/B/C)"
Cohesion: 0.25
Nodes (7): Feature 1 — Surface obstacle Plan B at failure point (WOOP close), Feature 2 — Miss-state diagnostic in ReEntryBanner, Feature 3 — Close-day competence feedback (echo words), Feature 4 — Energy-prescriptive card, Feature 5 — Concrete intention trigger (when-cue), Implementation order & coupling, Spec — 5 Product Additions (Batch A/B/C)

### Community 42 - "Spec — F6: Reflection → Plan Feedback Loop"
Cohesion: 0.25
Nodes (7): Constraints, Design, Evidence, Files, Problem, Spec — F6: Reflection → Plan Feedback Loop, Storage

### Community 43 - "Spec — "Release" as a Recurring Ritual (Mid-Season Goal Release)"
Cohesion: 0.25
Nodes (7): Constraints, Design, Evidence, Files, Problem, Spec — "Release" as a Recurring Ritual (Mid-Season Goal Release), Storage

### Community 44 - "Spec — Weekly Review: Re-Decide, Not Re-Commit"
Cohesion: 0.25
Nodes (7): Constraints, Design, Evidence, Files, Problem, Spec — Weekly Review: Re-Decide, Not Re-Commit, Storage

### Community 45 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:watch, testsprite

### Community 46 - "JournalNotebook.tsx"
Cohesion: 0.13
Nodes (28): InlinePhoto(), LightboxImage(), photoIdsInBody(), PhotoLightbox(), PhotoOpenHandler, useObjectUrl(), compressImage(), deleteImage() (+20 more)

### Community 47 - "15. Validation Message Library"
Cohesion: 0.25
Nodes (8): 15. Validation Message Library, Goal Brain Dump, Goal Elimination, Goal Selection, Journal, Keystone Action, Learning, Weekly Setup

### Community 48 - "11. Phase 6 — Focus, Learning, Journal"
Cohesion: 0.29
Nodes (7): 11. Phase 6 — Focus, Learning, Journal, Acceptance Criteria, Focus Requirements, Goal, Journal Requirements, Learning Requirements, Tasks

### Community 49 - "17. Manual QA Scenarios"
Cohesion: 0.29
Nodes (7): 17. Manual QA Scenarios, Scenario 1 — New User, Scenario 2 — Returning User, Scenario 3 — Flow Mode, Scenario 4 — Planning Mode, Scenario 5 — Invalid Weekly Plan, Scenario 6 — Season End

### Community 50 - "focusSessionStatus.ts"
Cohesion: 0.12
Nodes (28): ExpectedFocusSessionConfig, FocusSessionRecord, formatFocusSessionTimelineDescription(), formatMinutes(), formatTotal(), getExpectedSessionConfig(), getFocusSessionPreset(), getFocusSessionTiming() (+20 more)

### Community 51 - "14. Empty State Library"
Cohesion: 0.29
Nodes (7): 14. Empty State Library, No Active Season, No Journal, No Learning, No Timeline, No Today Plan, No Weekly Plan

### Community 52 - "16. Notification Copy"
Cohesion: 0.29
Nodes (7): 16. Notification Copy, Daily Reflection, Daily Start, Midday Reminder, Season Countdown, Season End, Weekly Review

### Community 53 - "25. Progress Calculation Logic"
Cohesion: 0.33
Nodes (6): 25. Progress Calculation Logic, Current Week, Focus Minutes, Learning Minutes, Season Days, Weekly Quota Progress

### Community 54 - "27. Notification Logic"
Cohesion: 0.33
Nodes (6): 27. Notification Logic, Daily Reflection, Daily Start, Season Countdown, Season End, Weekly Review

### Community 55 - "31. Error & Edge Case Logic"
Cohesion: 0.33
Nodes (6): 31. Error & Edge Case Logic, If goals are missing from active season, If localStorage corrupted, If today is outside season range, If user has no active season but onboardingCompleted true, If weekly plan invalid

### Community 56 - "10. Weekly Components"
Cohesion: 0.33
Nodes (6): 10.1 WeeklyAllocationCard, 10.2 WeeklyQuotaList, 10.3 WeekPlannerGrid, 10.4 DayThemeCell, 10.5 FlowPickTodayCard, 10. Weekly Components

### Community 57 - "15. Timeline Components"
Cohesion: 0.33
Nodes (6): 15.1 TimelineCalendar, 15.2 CalendarDayCell, 15.3 HeatmapGrid, 15.4 TimelineLegend, 15.5 MilestoneList, 15. Timeline Components

### Community 58 - "6. Form Components"
Cohesion: 0.33
Nodes (6): 6.1 PrimaryButton, 6.2 SecondaryButton, 6.3 GhostButton, 6.4 TextInput, 6.5 Textarea, 6. Form Components

### Community 59 - "11. Screen Layout Pattern"
Cohesion: 0.33
Nodes (6): 11.1 Onboarding Screen Pattern, 11.2 Today Screen Pattern, 11.3 Week Screen Pattern, 11.4 Timeline Screen Pattern, 11.5 Journal Screen Pattern, 11. Screen Layout Pattern

### Community 60 - "Spec — UI/UX Improvements (audit-driven)"
Cohesion: 0.33
Nodes (5): Batch 1 — AA Critical (cheap, broad, do first), Batch 2 — Core ritual / flow, Batch 3 — Consistency / cleanup, Execution, Spec — UI/UX Improvements (audit-driven)

### Community 61 - "7. Phase 2 — Data Types & State Store"
Cohesion: 0.33
Nodes (6): 7. Phase 2 — Data Types & State Store, Acceptance Criteria, Files, Goal, Must Implement Types, Tasks

### Community 62 - "19. Before / After Copy Improvements"
Cohesion: 0.33
Nodes (6): 19. Before / After Copy Improvements, Bad Habit, Failure, Goal Deletion, Productivity, Reminder

### Community 63 - "4. Copy Length Rules"
Cohesion: 0.33
Nodes (6): 4. Copy Length Rules, Button, Card Title, Empty State, Headline, Subcopy

### Community 64 - "6. Product Language"
Cohesion: 0.33
Nodes (6): 6. Product Language, Bad Habits, Goals, Relapse, Rest, Season

### Community 65 - "13. Weekly Allocation Logic"
Cohesion: 0.40
Nodes (5): 13. Weekly Allocation Logic, If 1 Goal, If 2 Goals, If 3 Goals, Validation

### Community 66 - "30. Empty State Logic"
Cohesion: 0.40
Nodes (5): 30. Empty State Logic, No Journal, No Learning Entry, No Timeline Data, No Today Plan

### Community 67 - "11. Today Components"
Cohesion: 0.40
Nodes (5): 11.1 TodayFocusCard, 11.2 EnergyCheck, 11.3 MainActionCard, 11.4 LearningCompanionCard, 11. Today Components

### Community 68 - "17. Feedback Components"
Cohesion: 0.40
Nodes (5): 17.1 EmptyState, 17.2 CalmAlert, 17.3 ConfirmationSheet, 17.4 Toast, 17. Feedback Components

### Community 69 - "5. Layout Components"
Cohesion: 0.40
Nodes (5): 5.1 PageHeader, 5.2 SectionHeader, 5.3 Stack, 5.4 ScreenContainer, 5. Layout Components

### Community 70 - "9. Goal Components"
Cohesion: 0.40
Nodes (5): 9.1 GoalCard, 9.2 GoalBrainDumpList, 9.3 ReleasableGoalItem, 9.4 KeystoneActionInput, 9. Goal Components

### Community 71 - "19. Derived Values"
Cohesion: 0.40
Nodes (5): 19. Derived Values, Current Week Number, Season Progress, Today Status, Weekly Completion

### Community 72 - "21. State Transitions"
Cohesion: 0.40
Nodes (5): 21. State Transitions, DayPlan, FocusSession, Goal, Season

### Community 73 - "10. Mobile-First Layout"
Cohesion: 0.40
Nodes (5): 10.1 Canvas, 10.2 Page Container, 10.3 Safe Area, 10.4 Layout Rule, 10. Mobile-First Layout

### Community 74 - "12. Phase 7 — Timeline & Season Reflection"
Cohesion: 0.40
Nodes (5): 12. Phase 7 — Timeline & Season Reflection, Acceptance Criteria, Goal, Tasks, Timeline Status Priority

### Community 75 - "19. Risk Management"
Cohesion: 0.40
Nodes (5): 19. Risk Management, Risk 1 — App becomes too complicated, Risk 2 — User loses data, Risk 3 — PWA limitations, Risk 4 — UI feels too empty

### Community 76 - "5. Phase 0 — Project Setup"
Cohesion: 0.40
Nodes (5): 5. Phase 0 — Project Setup, Acceptance Criteria, Goal, Suggested Commands, Tasks

### Community 77 - "6. Phase 1 — Design Tokens & UI Foundation"
Cohesion: 0.40
Nodes (5): 6. Phase 1 — Design Tokens & UI Foundation, Acceptance Criteria, Files, Goal, Tasks

### Community 78 - "8. Phase 3 — Onboarding Flow"
Cohesion: 0.40
Nodes (5): 8. Phase 3 — Onboarding Flow, Acceptance Criteria, Goal, Screens, Tasks

### Community 79 - "9. Phase 4 — Season & Weekly Logic"
Cohesion: 0.40
Nodes (5): 9. Phase 4 — Season & Weekly Logic, Acceptance Criteria, Goal, Rules, Tasks

### Community 80 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 81 - "18. Microcopy Patterns"
Cohesion: 0.40
Nodes (5): 18. Microcopy Patterns, Constraint, Encouragement, Progress, Reflection

### Community 82 - "8. Main App Copy"
Cohesion: 0.40
Nodes (5): 8. Main App Copy, Journal Screen, Timeline Screen, Today Screen, Week Screen

### Community 83 - "16. Flow Mode Day Logic"
Cohesion: 0.50
Nodes (4): 16. Flow Mode Day Logic, Completion Ratio, Energy Adjustment, Recommendation Logic

### Community 84 - "17. Today Highlight Logic"
Cohesion: 0.50
Nodes (4): 17. Today Highlight Logic, If Goal Day, If Rest Day, Today Can Be

### Community 85 - "23. Relapse Logic"
Cohesion: 0.50
Nodes (4): 23. Relapse Logic, Copy Rule, Recovery Prompt, Trigger Options

### Community 86 - "26. Season End Logic"
Cohesion: 0.50
Nodes (4): 26. Season End Logic, Continue Season, Refine Goals, Start New Season

### Community 89 - "12. Focus Components"
Cohesion: 0.50
Nodes (4): 12.1 FocusTimer, 12.2 FocusSessionSummary, 12.3 FocusControlButtonGroup, 12. Focus Components

### Community 90 - "13. Learning Components"
Cohesion: 0.50
Nodes (4): 13.1 LearningTypeSelector, 13.2 LearningEntryCard, 13.3 LearningNoteForm, 13. Learning Components

### Community 91 - "14. Journal Components"
Cohesion: 0.50
Nodes (4): 14.1 JournalQuestionCard, 14.2 JournalForm, 14.3 JournalHistoryItem, 14. Journal Components

### Community 92 - "4. Navigation Components"
Cohesion: 0.50
Nodes (4): 4.1 BottomNav, 4.2 BackButton, 4.3 SettingsButton, 4. Navigation Components

### Community 93 - "7. Choice Components"
Cohesion: 0.50
Nodes (4): 7.1 ChoiceChip, 7.2 ChoiceCard, 7.3 StepIndicator, 7. Choice Components

### Community 94 - "8. Season Components"
Cohesion: 0.50
Nodes (4): 8.1 SeasonProgressCard, 8.2 SeasonCountdown, 8.3 SeasonStatusBadge, 8. Season Components

### Community 95 - "10. DayPlan"
Cohesion: 0.50
Nodes (4): 10. DayPlan, Example, LearningPlan, Rules

### Community 96 - "9. WeeklyPlan"
Cohesion: 0.50
Nodes (4): 9. WeeklyPlan, Example, GoalAllocation, Rules

### Community 97 - "coach.ts"
Cohesion: 0.29
Nodes (8): COACH_STORAGE_KEY, CoachContext, CoachDismissMap, CoachStepId, dismissCoachStep(), getCoachStep(), isCoachStepDismissed(), loadDismissed()

### Community 98 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 99 - "13. Phase 8 — PWA Setup"
Cohesion: 0.50
Nodes (4): 13. Phase 8 — PWA Setup, Acceptance Criteria, Goal, Tasks

### Community 100 - "14. Phase 9 — QA & Polish"
Cohesion: 0.50
Nodes (4): 14. Phase 9 — QA & Polish, Acceptance Criteria, Goal, Tasks

### Community 101 - "2. MVP Scope"
Cohesion: 0.50
Nodes (4): 2. MVP Scope, P0 Must Have, P1 Later, P2 Later

### Community 102 - "10. Season Logic"
Cohesion: 0.67
Nodes (3): 10. Season Logic, Active Season Rule, Date Logic

### Community 103 - "12. Weekly Mode Logic"
Cohesion: 0.67
Nodes (3): 12. Weekly Mode Logic, Flow Mode, Planning Mode

### Community 104 - "19. Learning Companion Logic"
Cohesion: 0.67
Nodes (3): 19. Learning Companion Logic, Anti-Consumption Rule, Rule

### Community 105 - "20. Focus Session Logic"
Cohesion: 0.67
Nodes (3): 20. Focus Session Logic, Completion Rule, State Transitions

### Community 106 - "29. Editing Logic"
Cohesion: 0.67
Nodes (3): 29. Editing Logic, User can edit:, User should not casually edit:

### Community 107 - "5. Distraction Removal Logic"
Cohesion: 0.67
Nodes (3): 5. Distraction Removal Logic, Completion Rule, Generated Friction Actions

### Community 108 - "8. Goal Elimination Logic"
Cohesion: 0.67
Nodes (3): 8. Goal Elimination Logic, Copy Rule, Interaction

### Community 109 - "16. Relapse Components"
Cohesion: 0.67
Nodes (3): 16.1 RelapseTriggerSelector, 16.2 RelapseReflectionCard, 16. Relapse Components

### Community 110 - "18. Settings Components"
Cohesion: 0.67
Nodes (3): 18.1 SettingsListItem, 18.2 ToggleRow, 18. Settings Components

### Community 111 - "3. App Shell Components"
Cohesion: 0.67
Nodes (3): 3.1 AppShell, 3.2 OnboardingShell, 3. App Shell Components

### Community 112 - "6. Season"
Cohesion: 0.67
Nodes (3): 6. Season, Example, Rules

### Community 113 - "7. Goal"
Cohesion: 0.67
Nodes (3): 7. Goal, Example, Rules

### Community 114 - "8. BadHabit"
Cohesion: 0.67
Nodes (3): 8. BadHabit, Example, FrictionAction

### Community 115 - "Design System — Zendo Zen Dark Minimalism PWA"
Cohesion: 0.67
Nodes (3): 1. Product Design Principle, Design System — Zendo Zen Dark Minimalism PWA, V2 Redesign Direction

### Community 116 - "3. Color System"
Cohesion: 0.67
Nodes (3): 3.1 Core Palette, 3.2 Usage Rules, 3. Color System

### Community 117 - "7. Border & Shadow"
Cohesion: 0.67
Nodes (3): 7. Border & Shadow, Border, Shadow

### Community 120 - "3. Tone Rules"
Cohesion: 0.67
Nodes (3): 3.1 Always Use, 3.2 Avoid, 3. Tone Rules

### Community 123 - "syncStatus.ts"
Cohesion: 0.33
Nodes (5): Listener, listeners, subscribeSyncStatus(), SyncStatus, useSyncStatus()

## Knowledge Gaps
- **712 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+707 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useMonkStore` connect `useMonkStore` to `App.tsx`, `FocusSession.tsx`, `MonkMVPState`, `useMonkStore.ts`, `JournalNotebook.tsx`, `focusSessionStatus.ts`, `planScoring.ts`, `defaultData.ts`, `useMonkStore.notebook.test.ts`, `i18n/index.ts`, `SettingsScreen.tsx`, `main.tsx`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `useT()` connect `useMonkStore` to `App.tsx`, `FocusSession.tsx`, `JournalNotebook.tsx`, `focusSessionStatus.ts`, `PwaInstallBanner.tsx`, `i18n/index.ts`, `SettingsScreen.tsx`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `MonkMVPState` connect `MonkMVPState` to `App.tsx`, `useMonkStore`, `syncMerge.ts`, `useMonkStore.ts`, `app.ts`, `focusSessionStatus.ts`, `defaultData.ts`, `restSuggestion.test.ts`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _712 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05702970297029703 - nodes in this community are weakly interconnected._
- **Should `useMonkStore` be split into smaller, more focused modules?**
  _Cohesion score 0.05392156862745098 - nodes in this community are weakly interconnected._
- **Should `FocusSession.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._