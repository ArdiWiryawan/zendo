# implementation_plan.md — Monk Mode PWA

Version: v0.1
Platform: Mobile-first Progressive Web App
Related Docs: design_system.md, screen_spec.md, data_model.md, app_logic.md, component_library.md, ux_writing.md, pwa_spec.md, technical_spec.md

---

# 1. Implementation Goal

Tujuan implementasi adalah membangun MVP PWA yang membuat user bisa:

```text
menyelesaikan onboarding
menentukan bad habit
membuat 1–3 focus goals
menentukan season
menentukan weekly mode
melihat one focus per day
melakukan focus session
mencatat learning
menulis journal
melihat timeline progress
menggunakan app secara offline
menginstall app sebagai PWA
```

Core MVP experience:

```text
Open app
→ See today’s one focus
→ Do the action
→ Learn intentionally
→ Reflect
→ Return tomorrow
```

---

# 2. MVP Scope

## P0 Must Have

```text
Mobile-first PWA
Onboarding flow
Habit audit
Distraction removal guide
Grey mode guide
Goal brain dump
Goal elimination
Focus goal selection
Season setup
Keystone action setup
Weekly mode setup
Today screen
Week screen
Timeline screen
Journal screen
Focus timer
Local persistence
PWA installability
Offline app shell
Settings basic
```

## P1 Later

```text
Advanced learning notes
Relapse pattern insights
Export journal
Advanced notifications
IndexedDB migration
Season analytics
Backup
```

## P2 Later

```text
Cloud sync
Native wrapper
App blocker integration
AI coach
Multi-device account
```

---

# 3. Implementation Principles

Build with these rules:

```text
MVP first
Mobile first
Local first
Offline first
No backend
No login
No analytics
No social features
No AI coach in MVP
No complex task management
```

The app must stay minimal.

If a feature increases noise, delay it.

---

# 4. Development Phases

Recommended phases:

```text
Phase 0 — Project Setup
Phase 1 — Design Tokens & UI Foundation
Phase 2 — Data Types & State Store
Phase 3 — Onboarding Flow
Phase 4 — Season & Weekly Logic
Phase 5 — Main App Screens
Phase 6 — Focus, Learning, Journal
Phase 7 — Timeline & Settings
Phase 8 — PWA Setup
Phase 9 — QA & Polish
```

---

# 5. Phase 0 — Project Setup

## Goal

Create the project foundation.

## Tasks

```text
Create React + Vite + TypeScript project
Install Tailwind CSS
Install react-router-dom
Install Zustand
Install Lucide React
Install vite-plugin-pwa
Install date-fns
Set up folder structure
Set up global CSS
Set up app routes
```

## Suggested Commands

```bash
npm create vite@latest monk-mode-pwa -- --template react-ts
cd monk-mode-pwa
npm install
npm install react-router-dom zustand lucide-react date-fns
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa
npx tailwindcss init -p
```

## Acceptance Criteria

```text
App runs locally
Tailwind works
Routing works
Folder structure exists
No TypeScript errors
```

---

# 6. Phase 1 — Design Tokens & UI Foundation

## Goal

Implement design system.

## Tasks

```text
Create CSS variables for colors
Create Tailwind token mapping
Create typography utility styles
Create spacing and radius tokens
Create base button styles
Create base card styles
Create safe area layout
Create mobile-first app shell
```

## Files

```text
src/styles/globals.css
tailwind.config.ts
src/constants/designTokens.ts
src/components/app-shell/AppShell.tsx
src/components/app-shell/OnboardingShell.tsx
src/components/layout/ScreenContainer.tsx
src/components/layout/PageHeader.tsx
```

## Acceptance Criteria

```text
Background uses #FAF8F2
Cards use correct border/radius
Buttons follow design system
Layout works at 360px width
Safe area supported
No random colors hardcoded
```

---

# 7. Phase 2 — Data Types & State Store

## Goal

Create the app data foundation.

## Tasks

```text
Create TypeScript entity types
Create default app settings
Create localStorage persistence layer
Create Zustand store
Create selectors
Create validation helpers
Create date utilities
Create ID generator
```

## Files

```text
src/types/
src/store/useMonkStore.ts
src/store/selectors.ts
src/lib/storage.ts
src/lib/date.ts
src/lib/ids.ts
src/lib/validation.ts
src/constants/defaultData.ts
```

## Must Implement Types

```text
UserProfile
AppSettings
Season
Goal
BadHabit
WeeklyPlan
DayPlan
FocusSession
LearningEntry
JournalEntry
RelapseLog
TimelineDay
NotificationReminder
```

## Acceptance Criteria

```text
State persists after refresh
State can be cleared safely
Selectors return active season
Selectors return active goals
Date helpers calculate days left
Validation works for onboarding
```

---

# 8. Phase 3 — Onboarding Flow

## Goal

Build full onboarding from welcome to season creation.

## Screens

```text
Welcome
Habit Audit
Remove Distractions
Grey Mode Guide
Goal Brain Dump
Goal Elimination
Choose Focus Goals
Choose Season
Keystone Action
Weekly Mode
Weekly Setup
Commitment Summary
```

## Tasks

```text
Create onboarding route group
Create onboarding state
Autosave onboarding progress
Build StepIndicator
Build ChoiceChip
Build ChoiceCard
Build GoalBrainDumpList
Build ReleasableGoalItem
Build KeystoneActionInput
Build WeeklySetup form
Validate every step
Create final season on completion
Redirect to Today
```

## Acceptance Criteria

```text
User cannot continue with invalid data
User can select at least one bad habit
User can enter 5–10 goals
User must release at least 2 goals
User can choose 1–3 focus goals
User can set 7/30/90/custom season
Every goal has keystone action
Weekly allocation totals 6 focus days + 1 rest day
Onboarding completion creates active season
App opens Today after onboarding
```

---

# 9. Phase 4 — Season & Weekly Logic

## Goal

Implement product engine.

## Tasks

```text
Create season progress calculation
Create current week detection
Create weekly plan generator
Create default weekly allocation
Create Planning Mode logic
Create Flow Mode logic
Create today plan resolver
Create season ended check
Create weekly quota completion calculation
```

## Rules

```text
One active season only
One to three goals per season
One week = 6 focus days + 1 rest day
Each goal touched at least once per week
One day = one theme only
```

## Acceptance Criteria

```text
Active season skips onboarding
Ended season routes to Season Reflection
Planning Mode creates 7 DayPlans
Flow Mode asks user to pick today
Weekly quota updates after completed days
Today always shows one focus only
```

---

# 10. Phase 5 — Main App Screens

## Goal

Build primary app navigation.

## Screens

```text
Today
Week
Timeline
Journal
Settings
```

## Tasks

```text
Create BottomNav
Create protected route layout
Create Today screen
Create Week screen
Create Timeline screen
Create Journal screen
Create Settings screen
```

## Today Screen Requirements

```text
Show season day
Show days left
Show today focus card
Show one main action
Show learning companion
Show energy check
Show Begin Focus CTA
Show Reflect Today CTA
```

## Week Screen Requirements

```text
Show current week number
Show weekly allocation
Show planning grid or flow quota
Allow Adjust Week
```

## Timeline Screen Requirements

```text
Show season progress
Show calendar cells
Show basic heatmap
Show legend
```

## Journal Screen Requirements

```text
Show daily reflection questions
Autosave draft
Save one journal per day
Show journal history basic
```

## Acceptance Criteria

```text
Bottom nav works
Today displays correct day plan
Week displays quota correctly
Timeline updates from progress
Journal saves and persists
Settings is accessible
```

---

# 11. Phase 6 — Focus, Learning, Journal

## Goal

Implement daily action loop.

## Tasks

```text
Create Focus Session screen
Create FocusTimer
Create start/pause/resume/complete logic
Create action completion confirmation
Create Learning Note form
Create Journal form
Update TimelineDay after actions
```

## Focus Requirements

```text
Default duration: 50 minutes
Allow pause
Allow resume
Allow complete early
Allow abandon
Save focus session
Do not lose active session on refresh if possible
```

## Learning Requirements

```text
Learning type required
Title required
Insight optional
Action takeaway encouraged
Learning links to today goal
```

## Journal Requirements

```text
One journal per day
Can update same-day journal
Autosave draft
Save final reflection
```

## Acceptance Criteria

```text
Focus session starts and completes
Focus minutes are stored
Main action can be marked complete
Learning entry saves
Journal saves
Timeline updates after completion
```

---

# 12. Phase 7 — Timeline & Season Reflection

## Goal

Make progress visible.

## Tasks

```text
Create TimelineDay updater
Create CalendarDayCell
Create TimelineCalendar
Create HeatmapGrid
Create TimelineLegend
Create Season Reflection screen
Create continue/refine/start new season actions
```

## Timeline Status Priority

```text
relapse
rest
completed
partial
missed
not_started
```

## Acceptance Criteria

```text
Completed days appear correctly
Partial days appear correctly
Rest days appear correctly
Missed days appear correctly
Season end screen appears after endDate
User can archive ended season
```

---

# 13. Phase 8 — PWA Setup

## Goal

Make app installable and offline-capable.

## Tasks

```text
Create manifest
Create app icons
Configure vite-plugin-pwa
Cache app shell
Set theme color
Set background color
Test installability
Test offline reload
Add install prompt logic
Add notification permission UI
```

## Acceptance Criteria

```text
Manifest is valid
Icons appear
App can be installed
App opens standalone
App works offline after first load
Today screen loads offline
Journal can be written offline
Data persists after reload
```

---

# 14. Phase 9 — QA & Polish

## Goal

Stabilize MVP.

## Tasks

```text
Manual test all onboarding paths
Test 1 goal, 2 goals, 3 goals
Test 7-day, 30-day, 90-day season
Test planning mode
Test flow mode
Test refresh during onboarding
Test refresh during active season
Test season end
Test localStorage corruption fallback
Test mobile 360px width
Test PWA offline
Polish spacing
Polish copy
Remove visual noise
```

## Acceptance Criteria

```text
No broken route
No invalid season creation
No data loss after refresh
No screen feels visually crowded
No screen has more than one primary CTA
App works on mobile viewport
```

---

# 15. Feature Build Order

Build components and features in this order:

```text
1. ScreenContainer
2. AppShell
3. OnboardingShell
4. PageHeader
5. PrimaryButton
6. SecondaryButton
7. TextInput
8. Textarea
9. ChoiceChip
10. ChoiceCard
11. StepIndicator
12. localStorage layer
13. Zustand store
14. Validation helpers
15. Onboarding screens
16. Season creation
17. BottomNav
18. Today screen
19. Week screen
20. Focus screen
21. Journal screen
22. Timeline screen
23. Settings screen
24. PWA config
25. QA polish
```

---

# 16. MVP Acceptance Checklist

The MVP is considered complete when:

```text
User can install the PWA
User can complete onboarding
User can select bad habits
User can follow distraction removal guide
User can confirm grey mode guide
User can enter 5–10 goals
User can release at least 2 goals
User can choose 1–3 focus goals
User can create a season
User can choose Planning or Flow Mode
User can see today’s one focus
User can start and complete focus session
User can mark main action complete
User can add learning
User can write journal
User can see weekly quota
User can see timeline progress
User can return after refresh without data loss
User is not asked to create goals again during active season
Season end routes to reflection
App works offline after first load
```

---

# 17. Manual QA Scenarios

## Scenario 1 — New User

```text
Open app
Complete onboarding
Create 3 goals
Choose 90-day season
Choose Flow Mode
Enter Season
See Today screen
```

Expected:

```text
Active season exists
Today asks user to pick today if no DayPlan
Goals are saved
Onboarding does not repeat
```

---

## Scenario 2 — Returning User

```text
Close app
Open app again
```

Expected:

```text
User goes directly to Today
Season data persists
Goals are visible
```

---

## Scenario 3 — Flow Mode

```text
Open Week
See quota
Pick today’s goal
Complete focus
Mark action complete
```

Expected:

```text
Today is completed
Weekly quota updates
Timeline updates
```

---

## Scenario 4 — Planning Mode

```text
Plan 7 days
Assign 6 goal days
Assign 1 rest day
Open Today
```

Expected:

```text
Today follows planned theme
Each goal appears at least once
Rest day exists
```

---

## Scenario 5 — Invalid Weekly Plan

```text
Try to create week with no rest day
```

Expected:

```text
App blocks submission
Message: Keep one day for rest.
```

---

## Scenario 6 — Season End

```text
Set season end date in past
Open app
```

Expected:

```text
Season status becomes ended
User goes to Season Reflection
```

---

# 18. Non-Goals for MVP

Do not build:

```text
login
backend
cloud sync
AI coach
social sharing
leaderboard
advanced analytics
calendar sync
native app blocker
complex project management
subscription system
```

---

# 19. Risk Management

## Risk 1 — App becomes too complicated

Mitigation:

```text
Keep one focus per day.
Reject long task lists.
Keep only 4 main tabs.
```

## Risk 2 — User loses data

Mitigation:

```text
Autosave frequently.
Persist after every mutation.
Use clear storage key.
Add export later.
```

## Risk 3 — PWA limitations

Mitigation:

```text
Do not claim app can uninstall apps.
Do not claim app can force grey mode.
Use guide and checklist instead.
```

## Risk 4 — UI feels too empty

Mitigation:

```text
Use calm hierarchy.
Use season progress.
Use pinned goals.
Use timeline.
Empty does not mean unfinished.
```

---

# 20. Final Implementation Rule

Build the app around this loop:

```text
Choose season
→ Shape week
→ Pick one focus today
→ Do one action
→ Learn one thing
→ Reflect once
→ Repeat
```

Do not build anything that distracts from this loop.
