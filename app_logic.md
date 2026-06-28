# app_logic.md — Monk Mode PWA

Version: v0.1
Platform: Mobile-first PWA
Related Docs: design_system.md, screen_spec.md, data_model.md

---

# 1. Product Logic Philosophy

Aplikasi ini tidak dibuat untuk menambah task.

Aplikasi ini dibuat untuk membantu user:

```text
remove distraction
choose fewer goals
commit for a season
focus on one thing per day
learn intentionally
reflect honestly
repeat calmly
```

Core rule:

```text
One season.
One to three goals.
One week = six active days + one rest day.
One day = one focus theme.
One focus theme = one main action.
```

---

# 2. App Entry Logic

Saat user membuka app:

```pseudo
if userProfile does not exist:
    go to Splash
    then Welcome

else if onboardingCompleted is false:
    continue onboarding from last saved step

else if activeSeason does not exist:
    go to Welcome / Start New Season

else if activeSeason.status === "ended":
    go to Season Reflection

else if today > activeSeason.endDate:
    mark activeSeason as ended
    go to Season Reflection

else:
    go to Today
```

## Rules

```text
User tidak boleh ditanya goal lagi jika season masih aktif.
User hanya diminta membuat goal baru setelah season selesai atau reset manual.
Only one active season is allowed.
```

---

# 3. Onboarding Logic

Onboarding terdiri dari:

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

## 3.1 Save Progress

Setiap step harus autosave.

```pseudo
on step completed:
    save onboardingState
    move to next step
```

Jika user keluar app:

```pseudo
on app reopen:
    continue from last incomplete onboarding step
```

---

# 4. Habit Audit Logic

User memilih bad habit.

```text
Minimum selected habit: 1
Multiple selection: allowed
```

Available habits:

```text
doom_scrolling
gaming
pmo
random_youtube
late_night_content
too_much_chatting
shopping_impulse
other
```

## If user selects Other

Require custom text.

```pseudo
if selectedHabit === "other" and customHabitName is empty:
    disable Continue
```

---

# 5. Distraction Removal Logic

App tidak bisa benar-benar menghapus aplikasi lain dari PWA.

Jadi logic-nya adalah:

```text
guide
checklist
commitment confirmation
```

## Generated Friction Actions

If habit is doom_scrolling:

```text
Uninstall Instagram
Uninstall TikTok
Logout from X
Remove social apps from home screen
```

If habit is gaming:

```text
Uninstall mobile games
Remove game shortcuts
Turn off game notifications
Move game accounts away from phone
```

If habit is PMO:

```text
Remove trigger sources
Use safe browsing tools
Avoid private browsing at night
Keep phone outside bedroom
```

If habit is random_youtube:

```text
Logout from YouTube
Remove YouTube from home screen
Use watch later intentionally
Avoid Shorts
```

If habit is late_night_content:

```text
Charge phone outside bed
Set screen downtime
Prepare book near bed
Set night cutoff time
```

If habit is too_much_chatting:

```text
Mute non-essential groups
Set reply windows
Remove chat app from home screen
```

If habit is shopping_impulse:

```text
Remove marketplace apps
Logout from ecommerce accounts
Disable promo notifications
```

## Completion Rule

```pseudo
user can continue if at least one friction action is checked
```

But copy must say:

```text
You do not need perfection. Just make the habit harder.
```

---

# 6. Grey Mode Logic

Because PWA cannot force grayscale mode:

```text
Show guide
Ask user to confirm manually
Store confirmation
```

```pseudo
if user taps "Grey mode activated":
    appSettings.greyModeGuideCompleted = true
```

Optional skip:

```text
Allow "I'll do this later"
```

But app should gently recommend it.

---

# 7. Goal Brain Dump Logic

User writes 5–10 goals.

```pseudo
minGoals = 5
maxGoals = 10

if goals.length < 5:
    disable Continue

if goals.length > 10:
    block adding more goals
```

## Goal Input Rules

```text
Goal title cannot be empty.
Duplicate exact goal title should be prevented.
Whitespace should be trimmed.
```

---

# 8. Goal Elimination Logic

User must release at least 2 goals.

```pseudo
releasedGoalsCount >= 2
remainingGoalsCount >= 3 preferred
```

But because focus goals max is 3:

```pseudo
after elimination:
    user can still choose 1–3 from remaining goals
```

## Interaction

```text
tap X
swipe
strike-through animation
```

## Copy Rule

Use:

```text
Release for now.
```

Avoid:

```text
Kill this goal.
```

---

# 9. Focus Goal Selection Logic

User chooses 1–3 focus goals.

```pseudo
minFocusGoals = 1
maxFocusGoals = 3

if selectedFocusGoals.length < 1:
    disable Continue

if selectedFocusGoals.length > 3:
    block selection
```

## Priority Logic

If user selects goals in sequence:

```pseudo
first selected = priority 1
second selected = priority 2
third selected = priority 3
```

User can reorder priority.

---

# 10. Season Logic

User chooses duration:

```text
7 days
30 days
90 days
custom
```

## Date Logic

```pseudo
season.startDate = today
season.endDate = startDate + durationDays - 1
```

Example:

```text
Start: 2026-06-28
Duration: 7 days
End: 2026-07-04
```

## Active Season Rule

```pseudo
if activeSeason exists and activeSeason.status === "active":
    block creating new season
```

Unless user manually resets.

---

# 11. Keystone Action Logic

Each focus goal must have one keystone action.

```pseudo
for each selectedGoal:
    require keystoneAction.length > 0
```

Examples:

```text
Goal: Build 1000 subscribers
Keystone Action: Record one video

Goal: Earn 5 juta online
Keystone Action: Publish one offer

Goal: Master AI
Keystone Action: Study AI for 60 minutes
```

## Rule

```text
Keystone action should be action-based, not outcome-based.
```

Good:

```text
Record one video
Write one offer
Study for 60 minutes
```

Bad:

```text
Get 100 subscribers today
Make 1 juta today
Become good at AI
```

---

# 12. Weekly Mode Logic

User chooses:

```text
Planning Mode
Flow Mode
```

## Planning Mode

User plans the full week in advance.

Good for:

```text
structured users
fixed schedule
high planning preference
```

## Flow Mode

User chooses daily based on energy and quota.

Good for:

```text
variable energy
flexible schedule
adaptive focus
```

Default recommendation:

```text
Flow Mode
```

---

# 13. Weekly Allocation Logic

Every week has:

```text
6 active goal days
1 rest day
```

Every active goal must be touched at least once per week.

## If 1 Goal

```text
Goal A → 6x
Rest → 1x
```

## If 2 Goals

Default:

```text
Goal A → 3x
Goal B → 3x
Rest → 1x
```

Alternative:

```text
Goal A → 4x
Goal B → 2x
Rest → 1x
```

## If 3 Goals

Default:

```text
Goal A → 3x
Goal B → 2x
Goal C → 1x
Rest → 1x
```

## Validation

```pseudo
sum(goal.weeklyTargetCount) === 6
restDayTarget === 1
each goal.weeklyTargetCount >= 1
```

If invalid:

```text
Show calm warning.
```

Copy:

```text
Every goal needs at least one day this week.
```

---

# 14. WeeklyPlan Creation Logic

At season start:

```pseudo
create WeeklyPlan for current week
```

Option A:

Generate only current week.

Recommended for MVP.

```pseudo
when user enters a new week:
    generate next WeeklyPlan
```

Option B:

Generate all weeks upfront.

Not recommended for MVP.

## Week Boundary

```pseudo
week starts on season.startDate
not necessarily Monday
```

Example:

```text
Season starts Sunday.
Week 1 = Sunday to Saturday.
```

This keeps the season logic simple.

---

# 15. Planning Mode Day Logic

In Planning Mode:

User assigns each day:

```text
Goal A
Goal B
Goal C
Rest
```

Rules:

```pseudo
7 days total
6 goal days
1 rest day
each goal appears at least once
```

## DayPlan Creation

```pseudo
for each day in week:
    create DayPlan
```

If day is goal day:

```pseudo
dayPlan.goalId = selectedGoalId
dayPlan.mainAction = goal.keystoneAction
```

If day is rest day:

```pseudo
dayPlan.dayType = "rest"
```

---

# 16. Flow Mode Day Logic

In Flow Mode:

User does not pre-plan all days.

App shows remaining weekly quota.

Every day, user chooses:

```text
What deserves today?
```

Available options:

```text
active goals with remaining quota
rest if rest day not used
```

## Recommendation Logic

App can recommend today’s goal.

Priority order:

```pseudo
1. goals with lowest completion ratio
2. goals not touched yet this week
3. highest priority goal
4. user's energy level
```

## Completion Ratio

```pseudo
completionRatio = completedCount / targetCount
```

Goal with lowest ratio appears first.

## Energy Adjustment

If energy is low:

```text
recommend easier keystone version
```

If energy is medium:

```text
recommend normal keystone action
```

If energy is high:

```text
recommend deep work version
```

Example:

```text
Low: Outline video idea
Medium: Record video
High: Record + rough edit
```

---

# 17. Today Highlight Logic

Today screen must show exactly one focus theme.

```pseudo
if DayPlan exists for today:
    show DayPlan

else if weeklyMode === "planning":
    create today DayPlan from weekly schedule

else if weeklyMode === "flow":
    ask user to choose today's theme
```

## Today Can Be

```text
goal day
rest day
```

## If Goal Day

Show:

```text
Goal
Keystone action
Learning companion
Focus CTA
Reflection CTA
```

## If Rest Day

Show:

```text
Rest theme
Recharge activity
Light reflection
No focus pressure
```

Rest day copy:

```text
Rest is part of the path.
```

---

# 18. Daily Main Action Logic

Each goal day has one main action.

```pseudo
mainAction = DayPlan.mainAction || Goal.keystoneAction
```

User can edit main action for that day, but it should stay aligned with goal.

## Rule

```text
Do not allow multiple main actions.
```

If user tries to add another:

```text
Ask: Which one matters more today?
```

---

# 19. Learning Companion Logic

Each goal day may include one learning block.

Learning type:

```text
book
course
podcast
long_video
other
```

## Rule

Learning must support today’s goal.

Prompt:

```text
What will support today’s focus?
```

## Anti-Consumption Rule

If user logs learning without action:

```text
Ask for action takeaway.
```

Required for LearningEntry:

```text
title
type
```

Recommended:

```text
keyInsight
actionTakeaway
```

---

# 20. Focus Session Logic

User starts focus session from Today.

```pseudo
on Begin Focus:
    create FocusSession(status = "running")
```

Timer modes:

```text
free timer
default 50 minutes
```

MVP recommendation:

```text
50-minute default timer
allow complete early
```

## State Transitions

```text
running → paused
paused → running
running → completed
running → abandoned
```

When completed:

```pseudo
update FocusSession
update DayPlan status maybe partial/completed
update TimelineDay focusMinutes
```

## Completion Rule

Day is completed when:

```pseudo
mainActionCompleted === true
```

Focus minutes alone are not enough unless user confirms action completion.

---

# 21. Day Completion Logic

For goal day:

```pseudo
if mainActionCompleted:
    DayPlan.status = "completed"
else if focusSession exists or learningEntry exists:
    DayPlan.status = "active" or "partial"
else if date passed:
    DayPlan.status = "missed"
```

For rest day:

```pseudo
if user confirms rest:
    DayPlan.status = "completed"
else if date passed:
    DayPlan.status = "missed"
```

---

# 22. Journal Logic

One journal entry per day.

```pseudo
if JournalEntry exists for date:
    update existing
else:
    create new
```

Questions:

```text
What moved today?
What distracted me?
What did I learn?
What should be easier tomorrow?
What should be harder tomorrow?
```

Journal is optional but strongly encouraged.

If user completed action but has not journaled:

```text
Show gentle prompt:
Close the day with one reflection.
```

---

# 23. Relapse Logic

Relapse means user returned to bad habit.

It must be treated as data, not failure.

```pseudo
on relapse log:
    create RelapseLog
    update TimelineDay.status = "relapse" if severe
    increment relapseCount
```

## Trigger Options

```text
boredom
stress
fatigue
loneliness
trigger_app
no_clear_plan
other
```

## Recovery Prompt

```text
What can you make harder tomorrow?
```

## Copy Rule

Use:

```text
You drifted. Learn from it.
```

Never use:

```text
You failed.
```

---

# 24. Timeline Logic

TimelineDay can be stored or derived.

For MVP:

```text
store TimelineDay directly
```

Update TimelineDay whenever:

```text
DayPlan status changes
FocusSession completes
LearningEntry saved
JournalEntry saved
RelapseLog saved
```

## Timeline Status Priority

If relapse exists:

```pseudo
status = "relapse"
```

Else if day is rest and completed:

```pseudo
status = "rest"
```

Else if main action completed:

```pseudo
status = "completed"
```

Else if focus or learning exists:

```pseudo
status = "partial"
```

Else if date passed:

```pseudo
status = "missed"
```

Else:

```pseudo
status = "not_started"
```

---

# 25. Progress Calculation Logic

## Season Days

```pseudo
daysPassed = differenceInCalendarDays(today, season.startDate) + 1
daysLeft = differenceInCalendarDays(season.endDate, today)
progressPercent = clamp(daysPassed / season.durationDays * 100, 0, 100)
```

## Current Week

```pseudo
currentWeekNumber = ceil(daysPassed / 7)
```

## Weekly Quota Progress

```pseudo
for each goalAllocation:
    completedCount = number of completed DayPlans for goal in current week
```

## Focus Minutes

```pseudo
dailyFocusMinutes = sum(completed focus sessions for date)
weeklyFocusMinutes = sum(completed focus sessions in week)
seasonFocusMinutes = sum(completed focus sessions in season)
```

## Learning Minutes

```pseudo
dailyLearningMinutes = sum learning duration for date
weeklyLearningMinutes = sum learning duration in week
seasonLearningMinutes = sum learning duration in season
```

---

# 26. Season End Logic

At app open or date check:

```pseudo
if today > season.endDate:
    season.status = "ended"
    route to Season Reflection
```

Season Reflection asks:

```text
What changed?
What mattered most?
What should continue?
What should be released?
What comes next?
```

Actions:

```text
Continue Season
Refine Goals
Start New Season
Archive Season
```

## Continue Season

```pseudo
extend endDate
keep goals
keep weekly allocation
```

## Refine Goals

```pseudo
allow edit goals
keep some goals
release some goals
create new active season
archive previous
```

## Start New Season

```pseudo
archive current season
start onboarding from Goal Brain Dump or full onboarding
```

Recommendation:

```text
If bad habits are still relevant, allow keeping them.
```

---

# 27. Notification Logic

PWA notification support is limited depending on browser and device.

MVP logic:

```text
Ask permission only after onboarding.
Never ask on first screen.
```

Reminder types:

```text
daily_start
daily_reflection
weekly_review
season_countdown
season_end
```

## Daily Start

Message:

```text
Return to your path.
```

## Daily Reflection

Message:

```text
What moved today?
```

## Weekly Review

Message:

```text
Plan the next quiet week.
```

## Season Countdown

Examples:

```text
21 days left in this season.
7 days left in this season.
1 day left in this season.
```

## Season End

Message:

```text
Your season has ended. Reflect before you continue.
```

---

# 28. Reset Logic

Reset is dangerous and should be intentional.

If user chooses Reset Season:

```text
Show confirmation screen.
```

Copy:

```text
This will end your current season and archive your progress.
```

Options:

```text
Cancel
Archive and Reset
```

Never delete data by default.

Use archive.

---

# 29. Editing Logic

## User can edit:

```text
Today main action
Learning plan
Weekly allocation before week starts
Notification settings
Journal entry
```

## User should not casually edit:

```text
Season goals
Season duration
Bad habits
```

If they try:

```text
Ask for reflection first.
```

Copy:

```text
Is this still essential, or is this resistance?
```

---

# 30. Empty State Logic

## No Today Plan

```text
Choose what deserves today.
```

## No Learning Entry

```text
Add one thing that supports today’s focus.
```

## No Journal

```text
Close the day with one honest note.
```

## No Timeline Data

```text
Your path will appear here as you move.
```

---

# 31. Error & Edge Case Logic

## If user has no active season but onboardingCompleted true

```pseudo
go to Start New Season
```

## If goals are missing from active season

```pseudo
show recovery screen:
"Your season needs at least one goal."
```

## If weekly plan invalid

```pseudo
show Weekly Setup
```

## If today is outside season range

```pseudo
mark season ended
go to Season Reflection
```

## If localStorage corrupted

```pseudo
show recovery options:
- reset app
- export raw data if possible
```

---

# 32. MVP Scope Logic

P0 must include:

```text
Onboarding
Season creation
Goal selection
Weekly mode
Weekly allocation
Today highlight
Focus session
Journal
Timeline basic
Season reflection
Local persistence
```

P1 can include:

```text
Learning notes advanced
Relapse pattern insights
Export journal
Notification customization
Advanced heatmap
Backup
```

---

# 33. Anti-Feature Logic

Do not add these in MVP:

```text
long task list
social feed
leaderboard
achievement spam
complex project management
calendar integration
AI coach
too many statistics
```

Reason:

```text
They increase noise.
```

---

# 34. Core Product Invariants

These rules must never be broken:

```text
A user can only have one active season.
A season can only have one to three focus goals.
A day can only have one focus theme.
A goal day can only have one main action.
A week must have one rest day.
Each goal must be touched at least once per week.
Relapse is treated as data, not failure.
The app should reduce cognitive load, not increase it.
```

---

# 35. Final Logic Summary

The app logic should always guide user through:

```text
What am I committed to this season?
What matters this week?
What deserves today?
What is the one action?
What did I learn?
What should I adjust?
```

If a feature does not support this flow, do not build it yet.
