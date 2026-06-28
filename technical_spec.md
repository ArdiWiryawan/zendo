# technical_spec.md — Monk Mode PWA

Version: v0.1
Platform: Mobile-first Progressive Web App
Related Docs: design_system.md, screen_spec.md, data_model.md, app_logic.md, component_library.md, ux_writing.md, pwa_spec.md

---

# 1. Technical Philosophy

Aplikasi ini harus dibangun sebagai PWA yang:

```text
simple
fast
offline-first
local-first
mobile-first
easy to maintain
```

Tujuan teknis utama:

```text
User membuka app → langsung melihat satu fokus hari ini.
```

Hindari arsitektur yang terlalu kompleks untuk MVP.

Jangan membangun aplikasi ini seperti enterprise dashboard.

Bangun seperti:

```text
personal focus tool
local-first journal
minimal mobile app
```

---

# 2. Recommended Stack

## Core Stack

```text
React
Vite
TypeScript
Tailwind CSS
```

## State Management

```text
Zustand
```

## Persistence

P0:

```text
localStorage
```

P1:

```text
IndexedDB with Dexie
```

## PWA

```text
vite-plugin-pwa
```

## Icons

```text
Lucide React
```

## Animation

Optional:

```text
Framer Motion
```

Use only for:

```text
fade
subtle slide
goal release animation
```

Avoid heavy animation.

---

# 3. Project Structure

Recommended folder structure:

```text
src/
  app/
    App.tsx
    routes.tsx
    providers.tsx

  components/
    app-shell/
    navigation/
    layout/
    form/
    choice/
    season/
    goal/
    week/
    today/
    focus/
    learning/
    journal/
    timeline/
    feedback/
    settings/

  features/
    onboarding/
    season/
    habits/
    goals/
    week/
    today/
    focus/
    learning/
    journal/
    timeline/
    relapse/
    settings/

  store/
    useMonkStore.ts
    selectors.ts
    actions.ts

  lib/
    date.ts
    storage.ts
    ids.ts
    validation.ts
    pwa.ts
    notifications.ts

  types/
    app.ts
    season.ts
    goal.ts
    habit.ts
    week.ts
    day.ts
    focus.ts
    learning.ts
    journal.ts
    relapse.ts
    timeline.ts
    settings.ts

  constants/
    copy.ts
    routes.ts
    designTokens.ts
    defaultData.ts

  styles/
    globals.css

public/
  icons/
  manifest.webmanifest
```

---

# 4. Architecture Pattern

Use feature-based architecture.

Each feature should contain:

```text
screen
components
logic
helpers
```

Example:

```text
features/today/
  TodayScreen.tsx
  TodayFocusSection.tsx
  useTodayPlan.ts
```

Do not put all logic in `App.tsx`.

Do not make one huge store file if it becomes hard to read.

---

# 5. Routing

Recommended router:

```text
react-router-dom
```

Routes:

```ts
export const routes = {
  root: "/",
  onboardingWelcome: "/onboarding/welcome",
  onboardingHabits: "/onboarding/habits",
  onboardingRemove: "/onboarding/remove",
  onboardingGreyMode: "/onboarding/grey-mode",
  onboardingGoals: "/onboarding/goals",
  onboardingEliminate: "/onboarding/eliminate",
  onboardingFocusGoals: "/onboarding/focus-goals",
  onboardingSeason: "/onboarding/season",
  onboardingKeystone: "/onboarding/keystone",
  onboardingWeeklyMode: "/onboarding/weekly-mode",
  onboardingWeekSetup: "/onboarding/week-setup",
  today: "/today",
  week: "/week",
  timeline: "/timeline",
  journal: "/journal",
  focus: "/focus",
  learn: "/learn",
  relapse: "/relapse",
  seasonEnd: "/season-end",
  settings: "/settings"
};
```

## Route Guard Logic

On app launch:

```ts
if (!userProfile) {
  redirect("/onboarding/welcome");
}

if (!userProfile.onboardingCompleted) {
  redirect(lastOnboardingStep);
}

if (!activeSeason) {
  redirect("/onboarding/welcome");
}

if (today > activeSeason.endDate) {
  markSeasonEnded();
  redirect("/season-end");
}

redirect("/today");
```

---

# 6. TypeScript Model

Use strict types based on `data_model.md`.

Example:

```ts
export type SeasonStatus = "draft" | "active" | "ended" | "archived";

export type Season = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  status: SeasonStatus;
  mode: "planning" | "flow";
  goalIds: string[];
  badHabitIds: string[];
  createdAt: string;
  updatedAt: string;
};
```

All IDs should be strings.

Use:

```ts
crypto.randomUUID()
```

for generated IDs.

---

# 7. Date Handling

Recommended library:

```text
date-fns
```

Use date-only strings for:

```text
startDate
endDate
dayPlan.date
timelineDay.date
journalEntry.date
```

Format:

```text
YYYY-MM-DD
```

Use full ISO timestamp for:

```text
createdAt
updatedAt
focusSession.startTime
focusSession.endTime
```

Format:

```text
2026-06-28T10:00:00.000Z
```

## Date Utility Functions

Create:

```ts
getTodayDateString()
addDaysToDate(date, days)
getDaysPassed(startDate, today)
getDaysLeft(endDate, today)
getSeasonProgress(startDate, endDate, today)
getCurrentWeekNumber(startDate, today)
isDatePast(date)
isSeasonEnded(season)
```

---

# 8. Global Store

Use Zustand.

File:

```text
src/store/useMonkStore.ts
```

Store shape:

```ts
type MonkStore = {
  userProfile: UserProfile | null;
  appSettings: AppSettings;
  activeSeason: Season | null;
  goals: Goal[];
  badHabits: BadHabit[];
  weeklyPlans: WeeklyPlan[];
  dayPlans: DayPlan[];
  focusSessions: FocusSession[];
  learningEntries: LearningEntry[];
  journalEntries: JournalEntry[];
  relapseLogs: RelapseLog[];
  timelineDays: TimelineDay[];

  hydrate: () => void;
  persist: () => void;

  completeOnboarding: () => void;
  createSeason: (input: CreateSeasonInput) => void;
  endSeason: () => void;
  archiveSeason: () => void;

  addGoal: (goal: Goal) => void;
  updateGoal: (goalId: string, patch: Partial<Goal>) => void;

  createWeeklyPlan: (input: CreateWeeklyPlanInput) => void;
  updateWeeklyPlan: (weeklyPlanId: string, patch: Partial<WeeklyPlan>) => void;

  createOrUpdateTodayPlan: (input: DayPlanInput) => void;
  completeTodayMainAction: (dayPlanId: string) => void;

  startFocusSession: (dayPlanId: string) => void;
  pauseFocusSession: (sessionId: string) => void;
  resumeFocusSession: (sessionId: string) => void;
  completeFocusSession: (sessionId: string) => void;

  saveLearningEntry: (input: LearningEntryInput) => void;
  saveJournalEntry: (input: JournalEntryInput) => void;
  saveRelapseLog: (input: RelapseLogInput) => void;

  updateSettings: (patch: Partial<AppSettings>) => void;
};
```

---

# 9. Store Rules

Do:

```text
keep state normalized
use selectors for derived data
persist after every meaningful mutation
keep mutation names clear
```

Avoid:

```text
large nested objects that are hard to update
duplicated derived values
business logic inside components
direct localStorage calls inside UI components
```

---

# 10. Selectors

Create selectors in:

```text
src/store/selectors.ts
```

Important selectors:

```ts
selectActiveSeason()
selectActiveGoals()
selectCurrentWeeklyPlan()
selectTodayPlan()
selectTodayFocus()
selectSeasonProgress()
selectWeeklyQuotaProgress()
selectTimelineDaysForActiveSeason()
selectJournalEntryForToday()
selectLearningEntriesForToday()
selectFocusSessionsForToday()
```

Example:

```ts
export function selectActiveGoals(state: MonkState) {
  if (!state.activeSeason) return [];
  return state.goals.filter(
    goal =>
      goal.seasonId === state.activeSeason?.id &&
      goal.status === "active"
  );
}
```

---

# 11. Persistence Layer

File:

```text
src/lib/storage.ts
```

Key:

```ts
export const STORAGE_KEY = "monk_mode_pwa_state_v1";
```

Functions:

```ts
export function loadState(): MonkMVPState | null;
export function saveState(state: MonkMVPState): void;
export function clearState(): void;
export function exportStateAsJson(): string;
```

## Error Handling

If localStorage parse fails:

```ts
try {
  return JSON.parse(raw);
} catch {
  return null;
}
```

Show recovery screen if data is corrupted.

---

# 12. Validation Layer

File:

```text
src/lib/validation.ts
```

Functions:

```ts
validateHabitAudit(selectedHabits)
validateGoalBrainDump(goals)
validateGoalElimination(goals, releasedGoalIds)
validateFocusGoalSelection(selectedGoalIds)
validateSeasonDuration(duration)
validateKeystoneActions(goals)
validateWeeklyAllocation(allocations, restDayTarget)
validateDayPlan(dayPlan)
validateJournalEntry(entry)
```

Validation should return:

```ts
type ValidationResult = {
  valid: boolean;
  message?: string;
};
```

Use copy from `ux_writing.md`.

---

# 13. Onboarding Implementation

Store temporary onboarding state separately.

```ts
type OnboardingState = {
  currentStep: string;
  selectedHabits: BadHabitDraft[];
  frictionActions: FrictionAction[];
  greyModeConfirmed: boolean;
  goalDrafts: GoalDraft[];
  releasedGoalIds: string[];
  selectedFocusGoalIds: string[];
  seasonDurationDays: number;
  seasonStartDate: string;
  seasonEndDate: string;
  keystoneActions: Record<string, string>;
  weeklyMode: "planning" | "flow";
  weeklyAllocations: GoalAllocation[];
};
```

Save onboarding state after each step.

On final step:

```text
convert drafts into actual entities
create UserProfile
create AppSettings
create Season
create Goal[]
create BadHabit[]
create WeeklyPlan
create DayPlan if needed
set onboardingCompleted = true
route to /today
```

---

# 14. Season Creation Logic

Function:

```ts
createSeason(input: CreateSeasonInput)
```

Should:

```text
create season
create goals
create bad habits
create weekly plan
set activeSeason
set userProfile.onboardingCompleted = true
persist state
```

Rules:

```text
1–3 active goals
season duration valid
each goal has keystoneAction
weekly allocation valid
```

---

# 15. Weekly Plan Logic

Function:

```ts
getOrCreateCurrentWeeklyPlan(seasonId)
```

If current week plan exists:

```text
return existing
```

If not:

```text
create from default allocation
```

Default allocation:

```text
1 goal: 6
2 goals: 3 / 3
3 goals: 3 / 2 / 1
rest: 1
```

For planning mode:

```text
create 7 DayPlans upfront
```

For flow mode:

```text
create DayPlan only when user chooses today's theme
```

---

# 16. Today Logic

Function:

```ts
getTodayPlan()
```

Logic:

```text
if today DayPlan exists:
  return it

else if mode is planning:
  create today DayPlan from weekly plan

else if mode is flow:
  return null and ask user to pick today
```

Today screen must never show more than one focus theme.

---

# 17. Focus Timer Implementation

Recommended:

```text
use setInterval with timestamp correction
```

Do not rely only on decrementing every second.

Use:

```ts
startTimestamp
pausedDuration
targetDuration
```

This prevents timer drift.

Focus session should persist:

```text
on start
on pause
on complete
on abandon
```

If app refreshes during active session:

```text
recover active session if possible
or mark as abandoned with recovery prompt
```

---

# 18. Learning Implementation

Learning entry should link to:

```text
seasonId
weeklyPlanId
dayPlanId
goalId if goal day
```

Minimum required fields:

```text
type
title
```

Recommended fields:

```text
durationMinutes
keyInsight
actionTakeaway
```

Learning should not create multiple tasks.

It should support the daily focus.

---

# 19. Journal Implementation

One journal per day.

Function:

```ts
saveJournalEntry(input)
```

Logic:

```text
if entry for date exists:
  update existing
else:
  create new
```

Autosave draft:

```text
while user is typing
```

Save final:

```text
on Save Reflection
```

---

# 20. Timeline Implementation

For MVP, store TimelineDay directly.

Update TimelineDay whenever:

```text
DayPlan changes
FocusSession completes
LearningEntry saved
JournalEntry saved
RelapseLog saved
```

Function:

```ts
updateTimelineDay(date)
```

Status priority:

```text
relapse
rest
completed
partial
missed
not_started
```

---

# 21. Notifications Implementation

PWA notifications are optional in MVP.

Implement:

```text
permission request
settings toggle
in-app reminder fallback
```

Do not depend on notification for core app logic.

Ask permission only after onboarding.

Never ask on first screen.

---

# 22. PWA Setup

Install:

```bash
npm install vite-plugin-pwa
```

Vite config:

```ts
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "icons/icon-192.png",
        "icons/icon-512.png"
      ],
      manifest: {
        name: "Monk",
        short_name: "Monk",
        description: "A quiet space for deep focus and intentional progress.",
        theme_color: "#FAF8F2",
        background_color: "#FAF8F2",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/icons/maskable-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      }
    })
  ]
});
```

---

# 23. Styling Implementation

Use Tailwind CSS.

Create CSS variables in:

```text
src/styles/globals.css
```

Example:

```css
:root {
  --color-bg: #FAF8F2;
  --color-surface: #FFFFFF;
  --color-surface-soft: #F4EFE7;
  --color-text: #151515;
  --color-text-muted: #77736B;
  --color-border: #E7E0D6;
  --color-accent: #A98C6D;
}
```

Use Tailwind config to map tokens.

Do not hardcode random colors in components.

---

# 24. Accessibility Implementation

All buttons must have:

```text
minimum 44px height
clear label
visible focus state
```

Inputs:

```text
label or aria-label required
error message linked to field
```

Motion:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# 25. Error Handling

Use calm errors.

Do not show raw technical errors to user.

Examples:

```text
Something interrupted your local data.
Try again.
Your reflection could not be saved.
```

For dev console, log actual error.

---

# 26. Testing Scope

For MVP, test manually:

```text
onboarding complete
state persists after refresh
season does not restart after refresh
active season opens Today screen
season end redirects to reflection
weekly allocation validation works
flow mode pick today works
planning mode day plan works
focus timer starts / pauses / completes
journal saves
timeline updates
PWA installs
offline mode works
```

---

# 27. Build Order

Recommended implementation order:

```text
1. Project setup
2. Tailwind + design tokens
3. Routing
4. AppShell + OnboardingShell
5. Zustand store
6. Storage layer
7. Type definitions
8. Onboarding screens
9. Season creation logic
10. Weekly setup logic
11. Today screen
12. Focus session
13. Journal
14. Week screen
15. Timeline
16. Settings
17. PWA manifest + service worker
18. QA polish
```

Do not build advanced features before core loop works.

---

# 28. MVP Technical Scope

P0 must include:

```text
React + Vite + TypeScript
Tailwind design system
localStorage persistence
Zustand state
onboarding flow
season logic
goal logic
weekly allocation
today highlight
focus timer
journal
timeline basic
settings basic
PWA installable
offline app shell
```

P1 can include:

```text
IndexedDB migration
export journal
advanced notifications
relapse insights
learning analytics
backup
```

P2 can include:

```text
cloud sync
native wrapper
app blocker integration
multi-device account
```

---

# 29. Anti-Complexity Rules

Do not add in MVP:

```text
backend
login
AI coach
social features
leaderboard
complex calendar integration
full analytics dashboard
project management features
multi-user support
```

Reason:

```text
The product must stay quiet.
```

---

# 30. Final Technical Rule

Every technical decision should support this user experience:

```text
Open app.
See the season.
See today’s one focus.
Do the action.
Reflect.
Return tomorrow.
```

If a technical feature makes this slower, noisier, or harder to maintain, do not build it yet.
