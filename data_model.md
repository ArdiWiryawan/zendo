# data_model.md — Monk Mode PWA

Version: v0.1
Platform: Mobile-first Progressive Web App
Storage Approach: Local-first
Recommended Storage: IndexedDB / localStorage for MVP

---

# 1. Data Model Philosophy

Aplikasi ini bukan task manager biasa.

Data model harus mendukung sistem utama:

```text
Season
→ Goals
→ Weekly Allocation
→ Daily Highlight
→ Focus Session
→ Learning
→ Journal
→ Timeline
```

Core principle:

```text
One season contains 1–3 goals.
One week contains 6 active days and 1 rest day.
One day contains only one focus theme.
One focus theme has one main action.
```

---

# 2. Entity Overview

Core entities:

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

Optional later:

```text
Achievement
ExportRecord
BackupRecord
```

---

# 3. Entity Relationship

```text
UserProfile
 ├── AppSettings
 ├── Season[]
 │    ├── Goal[]
 │    ├── BadHabit[]
 │    ├── WeeklyPlan[]
 │    │    └── DayPlan[]
 │    ├── FocusSession[]
 │    ├── LearningEntry[]
 │    ├── JournalEntry[]
 │    ├── RelapseLog[]
 │    └── TimelineDay[]
 └── NotificationReminder[]
```

---

# 4. UserProfile

Purpose:
Store basic user state and onboarding status.

```ts
type UserProfile = {
  id: string;
  name?: string;
  onboardingCompleted: boolean;
  activeSeasonId?: string;
  createdAt: string;
  updatedAt: string;
};
```

## Field Notes

```text
id:
unique user id generated locally

onboardingCompleted:
true after Commitment Summary / Enter Season

activeSeasonId:
current active season

createdAt / updatedAt:
ISO string
```

---

# 5. AppSettings

Purpose:
Store app-level preference.

```ts
type AppSettings = {
  id: string;
  theme: "light" | "dark" | "system";
  reducedMotion: boolean;
  notificationEnabled: boolean;
  greyModeGuideCompleted: boolean;
  weeklyMode: "planning" | "flow";
  defaultFocusDuration: number;
  createdAt: string;
  updatedAt: string;
};
```

## Defaults

```ts
const defaultAppSettings = {
  theme: "light",
  reducedMotion: false,
  notificationEnabled: false,
  greyModeGuideCompleted: false,
  weeklyMode: "flow",
  defaultFocusDuration: 50
};
```

---

# 6. Season

Purpose:
Represent one commitment cycle.

Examples:

```text
7-day reset
30-day monk mode
90-day season
```

```ts
type Season = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  status: "draft" | "active" | "ended" | "archived";
  mode: "planning" | "flow";
  goalIds: string[];
  badHabitIds: string[];
  createdAt: string;
  updatedAt: string;
};
```

## Rules

```text
Only one active season at a time.
A season must have 1–3 focus goals.
A season must have startDate and endDate.
If today > endDate, season status becomes ended.
```

## Example

```json
{
  "id": "season_001",
  "name": "Monk Season I",
  "startDate": "2026-06-28",
  "endDate": "2026-09-26",
  "durationDays": 90,
  "status": "active",
  "mode": "flow",
  "goalIds": ["goal_001", "goal_002", "goal_003"],
  "badHabitIds": ["habit_001", "habit_002"],
  "createdAt": "2026-06-28T10:00:00.000Z",
  "updatedAt": "2026-06-28T10:00:00.000Z"
}
```

---

# 7. Goal

Purpose:
Store user’s chosen focus goal.

```ts
type Goal = {
  id: string;
  seasonId: string;
  title: string;
  description?: string;
  keystoneAction: string;
  priority: 1 | 2 | 3;
  weeklyTargetCount: number;
  status: "active" | "paused" | "completed" | "released";
  createdAt: string;
  updatedAt: string;
};
```

## Rules

```text
Minimum 1 goal per active season.
Maximum 3 goals per active season.
Each goal must have one keystoneAction.
Each goal must be touched at least once per week.
weeklyTargetCount minimum is 1.
Total weeklyTargetCount across goals should equal 6.
Rest day count equals 1.
```

## Example

```json
{
  "id": "goal_001",
  "seasonId": "season_001",
  "title": "Build 1000 subscribers",
  "description": "Grow YouTube channel with useful AI content.",
  "keystoneAction": "Record one long-form video",
  "priority": 1,
  "weeklyTargetCount": 3,
  "status": "active",
  "createdAt": "2026-06-28T10:05:00.000Z",
  "updatedAt": "2026-06-28T10:05:00.000Z"
}
```

---

# 8. BadHabit

Purpose:
Store distractions user wants to remove or make harder.

```ts
type BadHabit = {
  id: string;
  seasonId: string;
  name: string;
  category:
    | "doom_scrolling"
    | "gaming"
    | "pmo"
    | "random_youtube"
    | "late_night_content"
    | "too_much_chatting"
    | "shopping_impulse"
    | "other";
  frictionActions: FrictionAction[];
  status: "active" | "reduced" | "relapsed" | "removed";
  createdAt: string;
  updatedAt: string;
};
```

## FrictionAction

```ts
type FrictionAction = {
  id: string;
  label: string;
  completed: boolean;
};
```

## Example

```json
{
  "id": "habit_001",
  "seasonId": "season_001",
  "name": "Doom scrolling",
  "category": "doom_scrolling",
  "frictionActions": [
    {
      "id": "action_001",
      "label": "Uninstall Instagram",
      "completed": true
    },
    {
      "id": "action_002",
      "label": "Remove TikTok shortcut",
      "completed": true
    }
  ],
  "status": "active",
  "createdAt": "2026-06-28T10:10:00.000Z",
  "updatedAt": "2026-06-28T10:10:00.000Z"
}
```

---

# 9. WeeklyPlan

Purpose:
Represent one week inside a season.

```ts
type WeeklyPlan = {
  id: string;
  seasonId: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  mode: "planning" | "flow";
  goalAllocations: GoalAllocation[];
  restDayTarget: number;
  status: "draft" | "active" | "completed" | "missed";
  createdAt: string;
  updatedAt: string;
};
```

## GoalAllocation

```ts
type GoalAllocation = {
  goalId: string;
  targetCount: number;
  completedCount: number;
};
```

## Rules

```text
Each week has 7 days.
Each week has 6 active goal days.
Each week has 1 rest day.
Every active goal must have targetCount >= 1.
Sum of goal targetCount must be 6.
restDayTarget must be 1.
```

## Example

```json
{
  "id": "week_001",
  "seasonId": "season_001",
  "weekNumber": 1,
  "startDate": "2026-06-28",
  "endDate": "2026-07-04",
  "mode": "flow",
  "goalAllocations": [
    {
      "goalId": "goal_001",
      "targetCount": 3,
      "completedCount": 0
    },
    {
      "goalId": "goal_002",
      "targetCount": 2,
      "completedCount": 0
    },
    {
      "goalId": "goal_003",
      "targetCount": 1,
      "completedCount": 0
    }
  ],
  "restDayTarget": 1,
  "status": "active",
  "createdAt": "2026-06-28T10:20:00.000Z",
  "updatedAt": "2026-06-28T10:20:00.000Z"
}
```

---

# 10. DayPlan

Purpose:
Store one daily theme.

```ts
type DayPlan = {
  id: string;
  seasonId: string;
  weeklyPlanId: string;
  date: string;
  dayType: "goal" | "rest";
  goalId?: string;
  mainAction?: string;
  learningPlan?: LearningPlan;
  energyLevel?: "low" | "medium" | "high";
  status: "planned" | "active" | "completed" | "skipped" | "missed";
  createdAt: string;
  updatedAt: string;
};
```

## LearningPlan

```ts
type LearningPlan = {
  type: "book" | "course" | "podcast" | "long_video" | "other";
  title?: string;
  targetMinutes?: number;
  targetPages?: number;
};
```

## Rules

```text
One day can only have one dayType.
If dayType is goal, goalId is required.
If dayType is rest, goalId should be empty.
One day should only have one mainAction.
```

## Example

```json
{
  "id": "day_001",
  "seasonId": "season_001",
  "weeklyPlanId": "week_001",
  "date": "2026-06-28",
  "dayType": "goal",
  "goalId": "goal_001",
  "mainAction": "Record one long-form video",
  "learningPlan": {
    "type": "course",
    "title": "AI Content Creation Course",
    "targetMinutes": 60
  },
  "energyLevel": "medium",
  "status": "active",
  "createdAt": "2026-06-28T10:25:00.000Z",
  "updatedAt": "2026-06-28T10:25:00.000Z"
}
```

---

# 11. FocusSession

Purpose:
Track focused work for the day’s main action.

```ts
type FocusSession = {
  id: string;
  seasonId: string;
  weeklyPlanId: string;
  dayPlanId: string;
  goalId?: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  status: "running" | "paused" | "completed" | "abandoned";
  note?: string;
  createdAt: string;
  updatedAt: string;
};
```

## Rules

```text
FocusSession should link to DayPlan.
If DayPlan is goal day, goalId should exist.
A day can have multiple focus sessions, but only one main action.
MVP can show total focus minutes per day.
```

---

# 12. LearningEntry

Purpose:
Track learning connected to the day’s theme.

```ts
type LearningEntry = {
  id: string;
  seasonId: string;
  weeklyPlanId: string;
  dayPlanId: string;
  goalId?: string;
  type: "book" | "course" | "podcast" | "long_video" | "other";
  title: string;
  durationMinutes?: number;
  pagesRead?: number;
  keyInsight?: string;
  actionTakeaway?: string;
  createdAt: string;
  updatedAt: string;
};
```

## Rules

```text
Learning should be linked to a goal when possible.
Learning should not become infinite consumption.
Every LearningEntry should encourage actionTakeaway.
```

---

# 13. JournalEntry

Purpose:
Store daily reflection.

```ts
type JournalEntry = {
  id: string;
  seasonId: string;
  weeklyPlanId: string;
  dayPlanId: string;
  date: string;
  answers: {
    whatMovedToday?: string;
    whatDistractedMe?: string;
    whatDidILearn?: string;
    whatShouldBeEasierTomorrow?: string;
    whatShouldBeHarderTomorrow?: string;
  };
  mood?: "calm" | "clear" | "tired" | "restless" | "focused";
  createdAt: string;
  updatedAt: string;
};
```

## Rules

```text
One JournalEntry per day.
User can edit same-day journal.
Journal should be optional but encouraged.
```

---

# 14. RelapseLog

Purpose:
Track when user returns to a bad habit.

```ts
type RelapseLog = {
  id: string;
  seasonId: string;
  weeklyPlanId?: string;
  dayPlanId?: string;
  badHabitId?: string;
  date: string;
  trigger:
    | "boredom"
    | "stress"
    | "fatigue"
    | "loneliness"
    | "trigger_app"
    | "no_clear_plan"
    | "other";
  note?: string;
  recoveryAction?: string;
  createdAt: string;
  updatedAt: string;
};
```

## Copy Rule

Never show relapse as moral failure.

Use:

```text
You drifted. Learn from it.
```

Avoid:

```text
You failed.
```

---

# 15. TimelineDay

Purpose:
Generate calendar and heatmap UI.

```ts
type TimelineDay = {
  id: string;
  seasonId: string;
  date: string;
  dayType: "goal" | "rest";
  goalId?: string;
  status:
    | "not_started"
    | "completed"
    | "partial"
    | "missed"
    | "relapse"
    | "rest";
  focusMinutes: number;
  learningMinutes: number;
  journalCompleted: boolean;
  relapseCount: number;
  createdAt: string;
  updatedAt: string;
};
```

## Rules

```text
TimelineDay can be derived from DayPlan, FocusSession, LearningEntry, JournalEntry, and RelapseLog.
For MVP, it can also be stored directly for simpler rendering.
```

---

# 16. NotificationReminder

Purpose:
Store reminder preferences.

```ts
type NotificationReminder = {
  id: string;
  type:
    | "daily_start"
    | "daily_reflection"
    | "weekly_review"
    | "season_countdown"
    | "season_end";
  enabled: boolean;
  time?: string;
  daysBeforeSeasonEnd?: number;
  message: string;
  createdAt: string;
  updatedAt: string;
};
```

## Reminder Examples

```text
Daily start:
Return to your path.

Daily reflection:
What moved today?

Season countdown:
21 days left in this season.

Season end:
Your season has ended. Reflect before you continue.
```

---

# 17. Storage Structure

Recommended local structure:

```ts
type MonkAppDatabase = {
  userProfile: UserProfile;
  appSettings: AppSettings;
  seasons: Season[];
  goals: Goal[];
  badHabits: BadHabit[];
  weeklyPlans: WeeklyPlan[];
  dayPlans: DayPlan[];
  focusSessions: FocusSession[];
  learningEntries: LearningEntry[];
  journalEntries: JournalEntry[];
  relapseLogs: RelapseLog[];
  timelineDays: TimelineDay[];
  notificationReminders: NotificationReminder[];
};
```

---

# 18. MVP localStorage Shape

For simplest MVP, use one root object.

```ts
type MonkMVPState = {
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
};
```

localStorage key:

```ts
const STORAGE_KEY = "monk_mode_pwa_state_v1";
```

---

# 19. Derived Values

These values should be calculated, not manually stored.

## Season Progress

```ts
daysPassed = today - season.startDate + 1
daysLeft = season.endDate - today
progressPercent = daysPassed / durationDays * 100
```

## Current Week Number

```ts
weekNumber = Math.ceil(daysPassed / 7)
```

## Weekly Completion

```ts
goalCompletion = completedGoalDays / targetGoalDays
restCompletion = completedRestDays / targetRestDays
```

## Today Status

```ts
if dayPlan.status === "completed":
  todayStatus = "completed"
else if relapse exists:
  todayStatus = "relapse"
else if focus session exists:
  todayStatus = "partial"
else:
  todayStatus = "not_started"
```

---

# 20. Validation Rules

## Onboarding Validation

```text
Habit Audit:
minimum 1 bad habit selected

Goal Brain Dump:
minimum 5 goals
maximum 10 goals

Goal Elimination:
minimum 2 goals released

Focus Goals:
minimum 1
maximum 3

Season:
duration must be 7, 30, 90, or custom valid range

Keystone Action:
each goal must have one action

Weekly Setup:
6 active days
1 rest day
each goal minimum once
```

---

# 21. State Transitions

## Season

```text
draft → active → ended → archived
```

## DayPlan

```text
planned → active → completed
planned → skipped
active → completed
active → missed
active → relapse
```

## FocusSession

```text
running → paused → running
running → completed
running → abandoned
```

## Goal

```text
active → completed
active → paused
active → released
```

---

# 22. Example Full MVP State

```json
{
  "userProfile": {
    "id": "user_001",
    "name": "Ardi",
    "onboardingCompleted": true,
    "activeSeasonId": "season_001",
    "createdAt": "2026-06-28T10:00:00.000Z",
    "updatedAt": "2026-06-28T10:00:00.000Z"
  },
  "appSettings": {
    "id": "settings_001",
    "theme": "light",
    "reducedMotion": false,
    "notificationEnabled": true,
    "greyModeGuideCompleted": true,
    "weeklyMode": "flow",
    "defaultFocusDuration": 50,
    "createdAt": "2026-06-28T10:00:00.000Z",
    "updatedAt": "2026-06-28T10:00:00.000Z"
  },
  "activeSeason": {
    "id": "season_001",
    "name": "Monk Season I",
    "startDate": "2026-06-28",
    "endDate": "2026-09-26",
    "durationDays": 90,
    "status": "active",
    "mode": "flow",
    "goalIds": ["goal_001", "goal_002", "goal_003"],
    "badHabitIds": ["habit_001"],
    "createdAt": "2026-06-28T10:00:00.000Z",
    "updatedAt": "2026-06-28T10:00:00.000Z"
  },
  "goals": [
    {
      "id": "goal_001",
      "seasonId": "season_001",
      "title": "Build 1000 subscribers",
      "keystoneAction": "Record one long-form video",
      "priority": 1,
      "weeklyTargetCount": 3,
      "status": "active",
      "createdAt": "2026-06-28T10:05:00.000Z",
      "updatedAt": "2026-06-28T10:05:00.000Z"
    }
  ],
  "badHabits": [
    {
      "id": "habit_001",
      "seasonId": "season_001",
      "name": "Doom scrolling",
      "category": "doom_scrolling",
      "frictionActions": [
        {
          "id": "action_001",
          "label": "Uninstall Instagram",
          "completed": true
        }
      ],
      "status": "active",
      "createdAt": "2026-06-28T10:10:00.000Z",
      "updatedAt": "2026-06-28T10:10:00.000Z"
    }
  ],
  "weeklyPlans": [],
  "dayPlans": [],
  "focusSessions": [],
  "learningEntries": [],
  "journalEntries": [],
  "relapseLogs": [],
  "timelineDays": []
}
```

---

# 23. Implementation Notes

For MVP:

```text
Use localStorage first if speed matters.
Use IndexedDB if journal and learning entries grow larger.
Use Zustand for global state.
Generate IDs with crypto.randomUUID().
Use ISO date strings for all dates.
Keep date-only fields as YYYY-MM-DD.
Keep timestamp fields as full ISO strings.
```

Recommended:

```text
Date-only:
2026-06-28

Timestamp:
2026-06-28T10:00:00.000Z
```

---

# 24. Final Data Rule

Never let the data model turn this app into a complicated task manager.

The system exists to support:

```text
one season
few goals
one day theme
one meaningful action
daily reflection
```
