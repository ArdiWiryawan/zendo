# ux_writing.md — Monk Mode PWA

Version: v0.1
Platform: Mobile-first Progressive Web App
Related Docs: design_system.md, screen_spec.md, data_model.md, app_logic.md, component_library.md

---

# 1. UX Writing Philosophy

Aplikasi ini bukan aplikasi produktivitas yang mendorong user untuk melakukan lebih banyak hal.

Aplikasi ini membantu user:

```text
mengurangi distraksi
memilih sedikit hal
bergerak dengan tenang
melakukan satu hal penting per hari
belajar dengan sadar
refleksi tanpa menghakimi diri
```

Core writing principle:

```text
Calm clarity over motivational noise.
```

App harus terasa seperti ruang yang tenang, bukan coach yang berteriak.

---

# 2. Brand Voice

Voice utama:

```text
calm
clear
kind
direct
minimal
honest
grounded
```

App berbicara seperti:

```text
teman yang tenang
mentor yang lembut
journal pribadi
ruang sunyi
```

App tidak berbicara seperti:

```text
motivator hustle
military bootcamp
game dopamine
guru yang menghakimi
task manager korporat
```

---

# 3. Tone Rules

## 3.1 Always Use

Gunakan bahasa yang:

```text
encouraging
gentle
simple
reflective
intentional
non-judgmental
```

Contoh:

```text
Make space for what matters.
Return to your path.
Stay with one thing.
Release what can wait.
Move with intention.
Today has one focus.
```

## 3.2 Avoid

Hindari bahasa yang:

```text
terlalu keras
terlalu hustle
terlalu gamified
terlalu dramatis
terlalu menyalahkan user
terlalu panjang
```

Jangan gunakan:

```text
You failed.
Crush your goals.
Destroy your weakness.
No excuses.
You wasted your day.
Hustle harder.
Kill your bad habits.
Dominate your day.
```

---

# 4. Copy Length Rules

Karena UI minimalis, copy harus pendek.

## Headline

```text
3–7 words ideal.
Maximum 10 words.
```

## Subcopy

```text
1–2 sentences.
Maximum 18 words per sentence.
```

## Button

```text
1–3 words.
```

## Card Title

```text
2–5 words.
```

## Empty State

```text
1 short title + 1 short explanation.
```

---

# 5. Core Vocabulary

Gunakan kata-kata berikut secara konsisten:

```text
season
path
focus
release
return
space
stillness
one thing
today
reflection
learning
rest
```

## Preferred Terms

Use:

```text
season
focus goal
main action
learning companion
reflection
rest day
release
drift
return
```

Avoid:

```text
deadline
task dump
failure
punishment
streak obsession
kill
destroy
grind
```

---

# 6. Product Language

## Season

Use:

```text
season
this season
your season
season ends
days left
```

Examples:

```text
Your season ends on September 24.
78 days left in this season.
This season has one direction.
```

Avoid:

```text
deadline pressure
countdown panic
time is running out
```

---

## Goals

Use:

```text
focus goals
what matters
what deserves your energy
```

Examples:

```text
What deserves your energy this season?
Choose up to three focus goals.
Keep what matters. Release what can wait.
```

Avoid:

```text
targets you must crush
life-changing objectives
massive goals
```

---

## Bad Habits

Use:

```text
what pulls you away
distractions
make it harder
remove frictionless temptation
```

Examples:

```text
What usually pulls you away?
Make distractions harder to reach.
You do not need perfection. Just make the habit harder.
```

Avoid:

```text
your weakness
your addiction
your failure
bad self-control
```

---

## Relapse

Use:

```text
drift
return
learn from it
pattern
trigger
```

Examples:

```text
You drifted. Learn from it.
What pulled you away?
What can you make harder tomorrow?
Return gently.
```

Avoid:

```text
You failed.
You broke your streak.
You ruined your progress.
Start over from zero.
```

---

## Rest

Use:

```text
rest
recharge
recover
quiet day
part of the path
```

Examples:

```text
Rest is part of the path.
Recharge without leaving your direction.
A quiet day still belongs to the season.
```

Avoid:

```text
lazy day
off day
cheat day
unproductive day
```

---

# 7. Onboarding Copy

## Screen 01 — Splash

App name:

```text
Monk
```

Mantra:

```text
Less noise. Deeper life.
```

Alternative:

```text
A quiet space for deep progress.
```

---

## Screen 02 — Welcome

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

---

## Screen 03 — Habit Audit

Headline:

```text
What usually pulls you away?
```

Subcopy:

```text
Notice the patterns that make focus harder.
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

CTA:

```text
Continue
```

Validation:

```text
Choose at least one pattern.
```

---

## Screen 04 — Remove Distractions

Headline:

```text
Make distractions harder to reach.
```

Subcopy:

```text
You do not need perfection. Just add friction.
```

Checklist examples:

```text
Uninstall Instagram
Remove TikTok shortcut
Logout from X
Mute non-essential groups
Charge phone outside bed
```

CTA:

```text
I made it harder
```

Secondary:

```text
I’ll do this later
```

---

## Screen 05 — Grey Mode Guide

Headline:

```text
Reduce stimulation. Increase awareness.
```

Subcopy:

```text
Grey mode makes impulsive scrolling less attractive.
```

CTA:

```text
Grey mode activated
```

Secondary:

```text
I’ll do this later
```

---

## Screen 06 — Goal Brain Dump

Headline:

```text
What feels important in this season?
```

Subcopy:

```text
Write five to ten goals. We will narrow them next.
```

Placeholder:

```text
Write a goal
```

CTA:

```text
Continue
```

Validation:

```text
Add at least five goals.
```

Max warning:

```text
Ten is enough. The next step is to simplify.
```

---

## Screen 07 — Goal Elimination

Headline:

```text
What can you release for now?
```

Subcopy:

```text
Not everything needs your energy this season.
```

Action label:

```text
Release
```

CTA:

```text
Continue
```

Validation:

```text
Release at least two goals.
```

---

## Screen 08 — Choose Focus Goals

Headline:

```text
What deserves your energy this season?
```

Subcopy:

```text
Choose one to three. Fewer is stronger.
```

CTA:

```text
Choose Season
```

Validation:

```text
Choose at least one focus goal.
```

Max warning:

```text
Three is the limit for this season.
```

---

## Screen 09 — Choose Season

Headline:

```text
How long will this season last?
```

Subcopy:

```text
Your goals will stay fixed until the season ends.
```

Options:

```text
7 days
30 days
90 days
Custom
```

CTA:

```text
Continue
```

End date copy:

```text
This season ends on {date}.
```

---

## Screen 10 — Keystone Action

Headline:

```text
What moves this forward?
```

Subcopy:

```text
Choose one action for each goal. Keep it simple and repeatable.
```

Placeholder examples:

```text
Record one video
Study for 60 minutes
Write one offer
Read 20 pages
```

CTA:

```text
Continue
```

Validation:

```text
Each goal needs one main action.
```

---

## Screen 11 — Weekly Mode

Headline:

```text
How do you want to move each week?
```

Subcopy:

```text
You can plan ahead or choose daily based on energy.
```

Planning Mode title:

```text
Planning Mode
```

Planning Mode description:

```text
Plan your week in advance.
```

Flow Mode title:

```text
Flow Mode
```

Flow Mode description:

```text
Choose each day based on energy and urgency.
```

CTA:

```text
Continue
```

---

## Screen 12 — Weekly Setup

Headline:

```text
Shape your quiet week.
```

Subcopy:

```text
Six focus days. One rest day. Every goal touched at least once.
```

Validation:

```text
Every goal needs at least one day this week.
```

Rest validation:

```text
Keep one day for rest.
```

CTA:

```text
Enter Season
```

---

# 8. Main App Copy

## Today Screen

Page title:

```text
Today
```

Subtitle examples:

```text
Day {dayNumber} of {durationDays}
{daysLeft} days left
```

Focus card title:

```text
Today has one focus.
```

Rest card title:

```text
Rest is part of the path.
```

Main action title:

```text
One action
```

Learning title:

```text
Learning companion
```

Energy title:

```text
How is your energy today?
```

CTA:

```text
Begin Focus
```

Secondary CTA:

```text
Reflect Today
```

Completed state:

```text
Today moved.
```

Partial state:

```text
You started. Close the loop when ready.
```

Missed state:

```text
The day passed. Notice, then return.
```

---

## Week Screen

Page title:

```text
Week {weekNumber}
```

Subtitle:

```text
Six focus days. One rest day.
```

Planning mode title:

```text
This week’s path
```

Flow mode title:

```text
This week’s rhythm
```

Quota copy:

```text
{completed} / {target} days
```

CTA:

```text
Adjust Week
```

Empty state:

```text
Shape this week before you begin.
```

---

## Timeline Screen

Page title:

```text
Timeline
```

Subtitle:

```text
Your season, one day at a time.
```

Season progress:

```text
{daysPassed} days passed
{daysLeft} days left
```

Empty state:

```text
Your path will appear here as you move.
```

Legend:

```text
Completed
Partial
Missed
Relapse
Rest
```

---

## Journal Screen

Page title:

```text
Journal
```

Subtitle:

```text
Close the day with one honest note.
```

Questions:

```text
What moved today?
What distracted me?
What did I learn?
What should be easier tomorrow?
What should be harder tomorrow?
```

CTA:

```text
Save Reflection
```

Saved state:

```text
Reflection saved.
```

Empty state:

```text
No reflection yet. Start with one sentence.
```

---

# 9. Focus Flow Copy

## Focus Session

Headline:

```text
Stay with one thing.
```

Subcopy:

```text
No switching. No noise. Just this.
```

Buttons:

```text
Start
Pause
Resume
Complete
End Session
```

Completion question:

```text
Did you complete the main action?
```

Options:

```text
Yes, completed
Not yet
```

Completion toast:

```text
Focus session saved.
```

Action completed toast:

```text
Main action completed.
```

Abandon confirmation:

```text
End this session?
```

Abandon subcopy:

```text
Your time will be saved as partial progress.
```

---

# 10. Learning Copy

Learning form headline:

```text
What supported today’s focus?
```

Subcopy:

```text
Learning matters when it becomes action.
```

Fields:

```text
Type
Title
Duration
Key insight
Action takeaway
```

Placeholders:

```text
What did you study?
What stood out?
How will you use this?
```

CTA:

```text
Save Learning
```

Validation:

```text
Add a title before saving.
```

Anti-consumption prompt:

```text
What will you do with this insight?
```

---

# 11. Relapse Copy

Headline:

```text
You drifted. Learn from it.
```

Subcopy:

```text
This is data, not a verdict.
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
Other
```

Recovery prompt:

```text
What can you make harder tomorrow?
```

CTA:

```text
Save Insight
```

Toast:

```text
Pattern saved.
```

---

# 12. Season Reflection Copy

Headline:

```text
Your season has ended.
```

Subcopy:

```text
Reflect before you continue.
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
Archive Season
```

Gentle warning:

```text
Do not rush into a new season. Notice what this one taught you.
```

---

# 13. Settings Copy

Settings items:

```text
Notifications
Grey Mode Guide
Reset Season
Export Journal
Theme
About
```

Reset confirmation title:

```text
Archive this season?
```

Reset confirmation subcopy:

```text
Your progress will be kept, but this season will no longer be active.
```

Confirm:

```text
Archive and Reset
```

Cancel:

```text
Keep Season
```

---

# 14. Empty State Library

## No Active Season

```text
Start a quiet season.
Choose fewer goals and move with intention.
```

CTA:

```text
Start Season
```

## No Today Plan

```text
Choose what deserves today.
One theme is enough.
```

CTA:

```text
Pick Today
```

## No Learning

```text
Add one thing that supports today’s focus.
Keep learning connected to action.
```

CTA:

```text
Add Learning
```

## No Journal

```text
No reflection yet.
Start with one honest sentence.
```

CTA:

```text
Write Reflection
```

## No Timeline

```text
Your path will appear here as you move.
One day at a time.
```

## No Weekly Plan

```text
Shape this week.
Six focus days. One rest day.
```

CTA:

```text
Plan Week
```

---

# 15. Validation Message Library

## Goal Brain Dump

```text
Add at least five goals.
Ten is enough. The next step is to simplify.
This goal already exists.
```

## Goal Selection

```text
Choose at least one focus goal.
Three is the limit for this season.
```

## Goal Elimination

```text
Release at least two goals.
```

## Keystone Action

```text
Each goal needs one main action.
Keep it action-based and repeatable.
```

## Weekly Setup

```text
Every goal needs at least one day this week.
Keep one day for rest.
Six focus days are enough.
```

## Journal

```text
Write at least one reflection before saving.
```

## Learning

```text
Add a title before saving.
Add one takeaway if you can.
```

---

# 16. Notification Copy

## Daily Start

```text
Return to your path.
```

Alternative:

```text
Today has one focus.
```

## Midday Reminder

```text
What matters now?
```

Alternative:

```text
Stay with one thing.
```

## Daily Reflection

```text
What moved today?
```

Alternative:

```text
Close the day with one honest note.
```

## Weekly Review

```text
Shape the next quiet week.
```

Alternative:

```text
Six focus days. One rest day.
```

## Season Countdown

```text
{daysLeft} days left in this season.
```

Alternative:

```text
Your season ends on {date}.
```

## Season End

```text
Your season has ended. Reflect before you continue.
```

---

# 17. Button Copy Rules

Use short button labels.

Preferred:

```text
Begin
Continue
Enter Season
Start Focus
Reflect Today
Save
Save Reflection
Pick Today
Plan Week
Archive
```

Avoid:

```text
Let’s crush it
I am ready to dominate
Complete this amazing transformation
Yes I promise to never fail
```

---

# 18. Microcopy Patterns

## Encouragement

```text
Fewer is stronger.
One step is enough.
Stay with one thing.
You can return gently.
```

## Constraint

```text
Three is the limit.
One focus for today.
Six focus days are enough.
Keep one day for rest.
```

## Reflection

```text
What did this teach you?
What needs to be easier?
What needs to be harder?
```

## Progress

```text
You moved today.
Your path is forming.
This season is taking shape.
```

---

# 19. Before / After Copy Improvements

## Bad Habit

Bad:

```text
What are your bad habits?
```

Better:

```text
What usually pulls you away?
```

## Failure

Bad:

```text
You failed today.
```

Better:

```text
The day passed. Notice, then return.
```

## Goal Deletion

Bad:

```text
Kill two goals.
```

Better:

```text
Release what can wait.
```

## Reminder

Bad:

```text
Don’t waste your day.
```

Better:

```text
Return to your path.
```

## Productivity

Bad:

```text
Crush your tasks.
```

Better:

```text
Stay with one thing.
```

---

# 20. Writing QA Checklist

Before adding any copy, check:

```text
Is it calm?
Is it short?
Is it clear?
Is it encouraging?
Does it avoid shame?
Does it avoid hustle language?
Does it reduce cognitive load?
Does it support one clear action?
Does it fit the zen minimal product feel?
```

---

# 21. Final UX Writing Rule

The app should not make user feel:

```text
I am behind.
I failed.
I must do more.
```

The app should make user feel:

```text
I know what matters.
I can remove what pulls me away.
I can do one meaningful thing today.
I can return to my path.
```
