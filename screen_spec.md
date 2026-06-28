# screen_spec.md — Monk Mode PWA

Version: v0.1
Platform: Mobile-first PWA
Design System Reference: design_system.md

---

# Global Screen Rules

Semua screen harus mengikuti:

```text
One screen = one intention
One main CTA only
Minimal visual noise
Large whitespace
Calm copywriting
```

Global layout:

```text
Canvas: 393 × 852 px
Padding horizontal: 20px
Padding bottom: 96px (if bottom nav)
Section gap: 24px
Card radius: 20px
Important card radius: 28px
```

---

# ONBOARDING FLOW

---

# Screen 01 — Splash

Purpose:
Create emotional entry.

Route:

```text
/
```

Layout:

```text
Top:
safe area

Center:
App mark
App name
Mantra

Bottom:
subtle loading
```

Content:

Title:

```text
Monk
```

Subcopy:

```text
Less noise. Deeper life.
```

Interaction:

* auto transition (1.5s)
* fade only

State:

```text
loading
loaded
```

---

# Screen 02 — Welcome

Purpose:
Introduce philosophy.

Route:

```text
/onboarding/welcome
```

Layout:

```text
Top:
empty breathing space

Middle:
headline
subcopy

Bottom:
Begin button
```

Content:

Headline:

```text
Make space for what matters.
```

Subcopy:

```text
Choose fewer things. Focus deeper. Move with intention.
```

CTA:

```text
Begin
```

Interaction:

Next → Habit Audit

---

# Screen 03 — Habit Audit

Purpose:
Identify distractions.

Route:

```text
/onboarding/habits
```

Layout:

```text
Top:
step indicator

Middle:
title
description

Content:
habit chips
```

Question:

```text
What usually pulls you away?
```

Options:

```text
Doom scrolling
Gaming
PMO
Random YouTube
Late-night content
Too much chatting
Shopping impulse
Other
```

Components:

* StepIndicator
* ChoiceChip
* PrimaryButton

Rules:

* multiple select allowed
* minimum 1

CTA:

```text
Continue
```

---

# Screen 04 — Remove Distractions

Purpose:
Increase friction.

Route:

```text
/onboarding/remove
```

Dynamic based on habits.

Example:

If doom scrolling selected.

Content:

Title:

```text
Make distractions harder to reach.
```

Actions:

```text
Uninstall Instagram
Uninstall TikTok
Logout from X
Remove shortcuts
```

Components:

* checklist card
* action rows

CTA:

```text
I made it harder
```

State:

```text
checked
unchecked
```

---

# Screen 05 — Grey Mode Guide

Purpose:
Reduce stimulation.

Route:

```text
/onboarding/grey-mode
```

Content:

Headline:

```text
Reduce stimulation. Increase awareness.
```

Subcopy:

```text
Grey mode makes impulsive scrolling less attractive.
```

Components:

* instructional card
* toggle confirmation

CTA:

```text
Grey mode activated
```

---

# Screen 06 — Goal Brain Dump

Purpose:
Capture all goals.

Route:

```text
/onboarding/goals
```

Rules:

```text
Min: 5
Max: 10
```

Question:

```text
What feels important in this season?
```

Layout:

```text
Title
Subcopy
Goal input list
Add button
Continue button
```

Input:

single-line

State:

```text
empty
typing
filled
max reached
```

---

# Screen 07 — Goal Elimination

Purpose:
Reduce noise.

Route:

```text
/onboarding/eliminate
```

Question:

```text
What can you release for now?
```

Rules:

```text
Remove at least 2
```

Interaction:

Swipe left or tap X.

Visual:

removed goal = strike-through.

CTA:

```text
Continue
```

---

# Screen 08 — Choose Focus Goals

Purpose:
Lock main goals.

Route:

```text
/onboarding/focus-goals
```

Question:

```text
What deserves your energy this season?
```

Rules:

```text
Min: 1
Max: 3
```

Visual:

selected = accent background.

CTA:

```text
Choose Season
```

---

# Screen 09 — Choose Season

Purpose:
Set commitment.

Route:

```text
/onboarding/season
```

Question:

```text
How long will this season last?
```

Options:

```text
7 days
30 days
90 days
Custom
```

Components:

* duration chips
* date picker (custom)

Output:

```text
start date
end date
total days
```

CTA:

```text
Continue
```

---

# Screen 10 — Keystone Action

Purpose:
One action per goal.

Route:

```text
/onboarding/keystone
```

For each selected goal:

Question:

```text
What is the one action that moves this forward?
```

Layout:

Goal card
Input field

Example:

Goal:

```text
Build 1000 subscribers
```

Input:

```text
Record one video
```

CTA:

```text
Continue
```

---

# Screen 11 — Weekly Mode

Purpose:
Choose operating system.

Route:

```text
/onboarding/weekly-mode
```

Options:

## Planning Mode

Copy:

```text
Plan your week in advance.
```

## Flow Mode

Copy:

```text
Decide each day based on energy and urgency.
```

Rules:

user chooses one.

CTA:

```text
Continue
```

---

# Screen 12 — Weekly Setup

Purpose:
Setup weekly system.

Route:

```text
/onboarding/week-setup
```

Rules:

```text
6 active days
1 rest day
every goal minimum once
```

Planning mode:

drag and drop.

Flow mode:

set target frequency.

Example:

```text
Goal A → 3x
Goal B → 2x
Goal C → 1x
Rest → 1x
```

Validation:

must total 7.

CTA:

```text
Enter Season
```

---

# MAIN APP

---

# Screen 13 — Today

Purpose:
Main home.

Route:

```text
/today
```

Sections:

---

## A. Header

Content:

Date
Season day

Example:

```text
Day 12 of 90
78 days left
```

---

## B. Today Focus Card

Most important component.

Content:

```text
Today has one focus.
```

Goal:

```text
Build 1000 subscribers
```

Action:

```text
Record one long-form video
```

Large card.

---

## C. Learning Companion

Content:

Learning source:

```text
Book
Podcast
Course
Video
```

Example:

```text
Read 20 pages of Atomic Habits
```

---

## D. Energy Check

Options:

```text
Low
Medium
High
```

---

## E. Focus CTA

Button:

```text
Begin Focus
```

---

## F. Reflect Shortcut

Button:

```text
Reflect Today
```

States:

```text
pending
active
completed
skipped
```

---

# Screen 14 — Week

Purpose:
Weekly planning / quota.

Route:

```text
/week
```

Planning mode:

show 7-day planner.

Flow mode:

show quota tracker.

Layout:

Week title
Allocation cards
Remaining quota

Example:

```text
Goal A → 2/3
Goal B → 1/2
Goal C → 0/1
Rest → 0/1
```

CTA:

```text
Adjust Week
```

---

# Screen 15 — Timeline

Purpose:
Visual history.

Route:

```text
/timeline
```

Sections:

Season progress
Calendar
Heatmap
Milestones

States:

```text
completed day
missed day
relapse day
rest day
```

---

# Screen 16 — Journal

Purpose:
Daily reflection.

Route:

```text
/journal
```

Questions:

```text
What moved today?
What distracted me?
What did I learn?
What should be easier tomorrow?
What should be harder tomorrow?
```

Components:

* question cards
* textarea
* save button

CTA:

```text
Save Reflection
```

---

# FOCUS FLOW

---

# Screen 17 — Focus Session

Purpose:
Deep work.

Route:

```text
/focus
```

Layout:

Top:
goal

Middle:
timer

Bottom:
pause
complete

Copy:

```text
Stay with one thing.
```

Timer:

Pomodoro style or free timer.

States:

```text
idle
running
paused
completed
```

---

# Screen 18 — Learning Note

Purpose:
Capture insight.

Route:

```text
/learn
```

Fields:

Type
Title
Duration
Key insight
Action takeaway

CTA:

```text
Save Learning
```

---

# Screen 19 — Relapse Log

Purpose:
Capture failure honestly.

Route:

```text
/relapse
```

Question:

```text
What pulled you away?
```

Options:

```text
Boredom
Stress
Fatigue
Loneliness
Trigger app
No clear plan
```

CTA:

```text
Learn From It
```

---

# Screen 20 — Season Reflection

Purpose:
Close season.

Route:

```text
/season-end
```

Questions:

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
```

---

# Screen 21 — Settings

Purpose:
Minimal controls.

Route:

```text
/settings
```

Items:

```text
Notifications
Grey mode guide
Reset season
Export journal
Theme
About
```

Minimal only.

---

# Bottom Navigation

Tabs:

```text
Today
Week
Timeline
Journal
```

Fixed bottom.

No floating action button.

---

# MVP Priority

P0:

```text
01–17
20
21
```

P1:

```text
18
19
```

Reason:

Learning notes and relapse logs can be simplified first.

---

# Final UX Rule

At any point in the app, user should always know:

```text
What season am I in?
What matters now?
What should I do today?
How much time is left?
What did I learn?
```
