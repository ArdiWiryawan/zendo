# component_library.md — Monk Mode PWA

Version: v0.1
Platform: Mobile-first Progressive Web App
Related Docs: design_system.md, screen_spec.md, data_model.md, app_logic.md

---

# 1. Component Philosophy

Komponen dalam aplikasi ini harus mendukung rasa:

```text
calm
minimal
focused
zen
low-stimulation
```

Komponen tidak boleh terasa seperti aplikasi task manager yang ramai.

Core component rule:

```text
Every component should reduce cognitive load.
```

Hindari:

```text
terlalu banyak ikon
terlalu banyak warna
terlalu banyak border
card terlalu padat
state terlalu rumit
animasi berlebihan
```

Gunakan:

```text
whitespace
typography hierarchy
soft border
calm copy
clear CTA
```

---

# 2. Component Categories

Komponen dibagi menjadi:

```text
1. App Shell Components
2. Navigation Components
3. Layout Components
4. Form Components
5. Choice Components
6. Season Components
7. Goal Components
8. Weekly Components
9. Today Components
10. Focus Components
11. Learning Components
12. Journal Components
13. Timeline Components
14. Feedback Components
15. Settings Components
```

---

# 3. App Shell Components

---

## 3.1 AppShell

Purpose:
Wrapper utama untuk seluruh aplikasi.

Used in:

```text
Main app screens
Today
Week
Timeline
Journal
Settings
```

Layout:

```text
background
safe area
page container
bottom navigation
```

Props:

```ts
type AppShellProps = {
  children: React.ReactNode;
  showBottomNav?: boolean;
};
```

Rules:

```text
Use background #FAF8F2.
Respect mobile safe area.
Bottom nav only appears after onboarding.
```

---

## 3.2 OnboardingShell

Purpose:
Wrapper khusus onboarding.

Used in:

```text
Welcome
Habit Audit
Goal Brain Dump
Choose Season
Weekly Setup
```

Props:

```ts
type OnboardingShellProps = {
  children: React.ReactNode;
  currentStep?: number;
  totalSteps?: number;
  showStepIndicator?: boolean;
};
```

Rules:

```text
No bottom nav.
Use large whitespace.
Primary CTA should be near bottom.
```

---

# 4. Navigation Components

---

## 4.1 BottomNav

Purpose:
Navigasi utama setelah onboarding.

Tabs:

```text
Today
Week
Timeline
Journal
```

Props:

```ts
type BottomNavProps = {
  activeTab: "today" | "week" | "timeline" | "journal";
};
```

Visual:

```text
fixed bottom
height 72px
cream translucent background
border top
minimal line icons
```

Rules:

```text
Maximum 4 tabs.
No floating action button.
No badge unless truly needed.
```

---

## 4.2 BackButton

Purpose:
Kembali ke screen sebelumnya.

Props:

```ts
type BackButtonProps = {
  onClick: () => void;
  label?: string;
};
```

Default label:

```text
Back
```

Rules:

```text
Use only when needed.
Avoid clutter in onboarding.
```

---

## 4.3 SettingsButton

Purpose:
Masuk ke Settings.

Icon:

```text
Settings
```

Rules:

```text
Only show on main screens.
Keep subtle.
```

---

# 5. Layout Components

---

## 5.1 PageHeader

Purpose:
Header untuk halaman utama.

Props:

```ts
type PageHeaderProps = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
};
```

Example:

```text
Today
Day 12 of 90
```

Rules:

```text
Title should be short.
Subtitle should explain status, not motivation spam.
```

---

## 5.2 SectionHeader

Purpose:
Judul section kecil.

Props:

```ts
type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};
```

Example:

```text
Your Focus
Three things for this season.
```

---

## 5.3 Stack

Purpose:
Vertical layout helper.

Props:

```ts
type StackProps = {
  gap?: 8 | 12 | 16 | 20 | 24 | 32;
  children: React.ReactNode;
};
```

---

## 5.4 ScreenContainer

Purpose:
Container mobile-first.

Props:

```ts
type ScreenContainerProps = {
  children: React.ReactNode;
  withBottomNavPadding?: boolean;
};
```

Default:

```css
padding: 20px;
max-width: 430px;
margin: 0 auto;
```

---

# 6. Form Components

---

## 6.1 PrimaryButton

Purpose:
CTA utama.

Props:

```ts
type PrimaryButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
};
```

Examples:

```text
Begin
Continue
Enter Season
Start Focus
Save Reflection
```

Rules:

```text
Only one primary button per screen.
Disabled state must be clear but calm.
```

---

## 6.2 SecondaryButton

Purpose:
Aksi sekunder.

Props:

```ts
type SecondaryButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};
```

Examples:

```text
I'll do this later
Adjust Week
Edit
```

---

## 6.3 GhostButton

Purpose:
Aksi kecil atau low priority.

Examples:

```text
Skip for now
Remove
Change
```

Rules:

```text
Use muted text.
Avoid making destructive action too loud.
```

---

## 6.4 TextInput

Purpose:
Input pendek.

Props:

```ts
type TextInputProps = {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  maxLength?: number;
  error?: string;
};
```

Used for:

```text
goal title
keystone action
custom habit
learning title
```

---

## 6.5 Textarea

Purpose:
Input refleksi panjang.

Props:

```ts
type TextareaProps = {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  minRows?: number;
  error?: string;
};
```

Used for:

```text
journal
learning insight
relapse note
season reflection
```

---

# 7. Choice Components

---

## 7.1 ChoiceChip

Purpose:
Pilihan single atau multiple.

Props:

```ts
type ChoiceChipProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
};
```

Used for:

```text
habit audit
season duration
energy level
learning type
relapse trigger
```

Rules:

```text
Icon optional.
Do not use icon for every chip.
```

---

## 7.2 ChoiceCard

Purpose:
Pilihan yang lebih besar.

Props:

```ts
type ChoiceCardProps = {
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
};
```

Used for:

```text
Planning Mode
Flow Mode
Season duration
Rest day activity
```

---

## 7.3 StepIndicator

Purpose:
Menunjukkan progress onboarding.

Props:

```ts
type StepIndicatorProps = {
  currentStep: number;
  totalSteps: number;
};
```

Visual:

```text
thin progress bar
no numbered circles
```

Rules:

```text
Keep subtle.
Do not make onboarding feel like a long form.
```

---

# 8. Season Components

---

## 8.1 SeasonProgressCard

Purpose:
Menampilkan progress season.

Used in:

```text
Today
Timeline
Season Reflection
```

Props:

```ts
type SeasonProgressCardProps = {
  seasonName: string;
  dayNumber: number;
  durationDays: number;
  daysLeft: number;
  endDate: string;
  progressPercent: number;
};
```

Content example:

```text
Monk Season I
Day 12 of 90
78 days left
Ends on September 24
```

Rules:

```text
This card should feel grounding.
Do not use aggressive countdown copy.
```

---

## 8.2 SeasonCountdown

Purpose:
Small countdown display.

Props:

```ts
type SeasonCountdownProps = {
  daysLeft: number;
  endDate: string;
};
```

Copy:

```text
78 days left
Ends on September 24
```

---

## 8.3 SeasonStatusBadge

Purpose:
Menampilkan status season.

Props:

```ts
type SeasonStatusBadgeProps = {
  status: "draft" | "active" | "ended" | "archived";
};
```

Labels:

```text
Draft
Active
Ended
Archived
```

---

# 9. Goal Components

---

## 9.1 GoalCard

Purpose:
Menampilkan goal.

Props:

```ts
type GoalCardProps = {
  title: string;
  keystoneAction?: string;
  priority?: 1 | 2 | 3;
  selected?: boolean;
  status?: "active" | "paused" | "completed" | "released";
  onClick?: () => void;
};
```

Used in:

```text
Choose Focus Goals
Today
Week
Season Reflection
```

Visual:

```text
simple card
title
small keystone action
optional priority label
```

Rules:

```text
Goal should always look important.
Avoid making goal card too colorful.
```

---

## 9.2 GoalBrainDumpList

Purpose:
List input untuk 5–10 goal.

Props:

```ts
type GoalBrainDumpListProps = {
  goals: string[];
  onAddGoal: (goal: string) => void;
  onUpdateGoal: (index: number, value: string) => void;
  onRemoveGoal: (index: number) => void;
};
```

Rules:

```text
Minimum 5.
Maximum 10.
Show calm validation.
```

---

## 9.3 ReleasableGoalItem

Purpose:
Goal yang bisa dicoret saat elimination.

Props:

```ts
type ReleasableGoalItemProps = {
  title: string;
  released: boolean;
  onToggleRelease: () => void;
};
```

Visual:

```text
released = line-through
opacity lower
```

Copy:

```text
Release for now
```

---

## 9.4 KeystoneActionInput

Purpose:
Input satu aksi utama untuk goal.

Props:

```ts
type KeystoneActionInputProps = {
  goalTitle: string;
  value: string;
  onChange: (value: string) => void;
};
```

Placeholder:

```text
Record one video
Study for 60 minutes
Publish one offer
```

---

# 10. Weekly Components

---

## 10.1 WeeklyAllocationCard

Purpose:
Menampilkan target mingguan per goal.

Props:

```ts
type WeeklyAllocationCardProps = {
  goalTitle: string;
  targetCount: number;
  completedCount: number;
};
```

Example:

```text
Build 1000 subscribers
2 / 3 days
```

---

## 10.2 WeeklyQuotaList

Purpose:
List quota untuk Flow Mode.

Props:

```ts
type WeeklyQuotaListProps = {
  allocations: {
    goalId: string;
    goalTitle: string;
    targetCount: number;
    completedCount: number;
  }[];
  restTarget: number;
  restCompleted: number;
};
```

Rules:

```text
Show remaining count clearly.
Do not turn it into leaderboard.
```

---

## 10.3 WeekPlannerGrid

Purpose:
Planning mode untuk 7 hari.

Props:

```ts
type WeekPlannerGridProps = {
  days: DayPlan[];
  goals: Goal[];
  onAssignDay: (date: string, goalId: string | "rest") => void;
};
```

Visual:

```text
7 simple day cards
one label per day
```

Rules:

```text
Each day has one theme only.
One rest day required.
```

---

## 10.4 DayThemeCell

Purpose:
Satu cell hari dalam weekly planner.

Props:

```ts
type DayThemeCellProps = {
  date: string;
  dayLabel: string;
  themeLabel?: string;
  type: "goal" | "rest" | "empty";
  active?: boolean;
  completed?: boolean;
  onClick?: () => void;
};
```

---

## 10.5 FlowPickTodayCard

Purpose:
User Flow Mode memilih tema hari ini.

Props:

```ts
type FlowPickTodayCardProps = {
  recommendedGoalId?: string;
  options: {
    id: string;
    label: string;
    remainingCount: number;
  }[];
  onPick: (id: string | "rest") => void;
};
```

Question:

```text
What deserves today?
```

---

# 11. Today Components

---

## 11.1 TodayFocusCard

Purpose:
Komponen utama Today screen.

Props:

```ts
type TodayFocusCardProps = {
  date: string;
  goalTitle?: string;
  mainAction?: string;
  dayType: "goal" | "rest";
  status: "pending" | "active" | "completed" | "skipped" | "missed";
};
```

Goal day copy:

```text
Today has one focus.
```

Rest day copy:

```text
Rest is part of the path.
```

Rules:

```text
This is the most visually important card.
Only show one focus.
```

---

## 11.2 EnergyCheck

Purpose:
User memilih energi hari ini.

Props:

```ts
type EnergyCheckProps = {
  value?: "low" | "medium" | "high";
  onChange: (value: "low" | "medium" | "high") => void;
};
```

Copy:

```text
How is your energy today?
```

---

## 11.3 MainActionCard

Purpose:
Menampilkan atau edit main action.

Props:

```ts
type MainActionCardProps = {
  action: string;
  editable?: boolean;
  completed?: boolean;
  onEdit?: (value: string) => void;
  onComplete?: () => void;
};
```

Rules:

```text
Only one main action allowed.
If editing, keep it aligned with selected goal.
```

---

## 11.4 LearningCompanionCard

Purpose:
Menampilkan rencana belajar hari ini.

Props:

```ts
type LearningCompanionCardProps = {
  type?: "book" | "course" | "podcast" | "long_video" | "other";
  title?: string;
  targetMinutes?: number;
  targetPages?: number;
  completed?: boolean;
  onAdd?: () => void;
  onComplete?: () => void;
};
```

Copy:

```text
What will support today’s focus?
```

---

# 12. Focus Components

---

## 12.1 FocusTimer

Purpose:
Timer sesi fokus.

Props:

```ts
type FocusTimerProps = {
  initialMinutes: number;
  status: "idle" | "running" | "paused" | "completed";
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onComplete: () => void;
  onAbandon: () => void;
};
```

Visual:

```text
large monospace number
minimal controls
no flashy animation
```

Copy:

```text
Stay with one thing.
```

---

## 12.2 FocusSessionSummary

Purpose:
Summary setelah sesi selesai.

Props:

```ts
type FocusSessionSummaryProps = {
  durationMinutes: number;
  goalTitle?: string;
  mainAction: string;
  completed: boolean;
  note?: string;
};
```

CTA:

```text
Mark Action Complete
Save Note
```

---

## 12.3 FocusControlButtonGroup

Purpose:
Kontrol timer.

Buttons:

```text
Start
Pause
Resume
Complete
```

Rules:

```text
Never show too many controls at once.
```

---

# 13. Learning Components

---

## 13.1 LearningTypeSelector

Purpose:
Pilih tipe learning.

Options:

```text
Book
Course
Podcast
Long Video
Other
```

Props:

```ts
type LearningTypeSelectorProps = {
  value?: LearningType;
  onChange: (value: LearningType) => void;
};
```

---

## 13.2 LearningEntryCard

Purpose:
Menampilkan entry learning.

Props:

```ts
type LearningEntryCardProps = {
  type: LearningType;
  title: string;
  durationMinutes?: number;
  pagesRead?: number;
  keyInsight?: string;
  actionTakeaway?: string;
};
```

Rules:

```text
Highlight action takeaway over consumption.
```

---

## 13.3 LearningNoteForm

Purpose:
Form catatan belajar.

Fields:

```text
type
title
duration/pages
key insight
action takeaway
```

Props:

```ts
type LearningNoteFormProps = {
  initialValue?: LearningEntry;
  onSave: (entry: LearningEntryInput) => void;
};
```

---

# 14. Journal Components

---

## 14.1 JournalQuestionCard

Purpose:
Satu pertanyaan refleksi.

Props:

```ts
type JournalQuestionCardProps = {
  question: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};
```

Questions:

```text
What moved today?
What distracted me?
What did I learn?
What should be easier tomorrow?
What should be harder tomorrow?
```

---

## 14.2 JournalForm

Purpose:
Form refleksi harian.

Props:

```ts
type JournalFormProps = {
  date: string;
  values: JournalAnswers;
  onChange: (values: JournalAnswers) => void;
  onSave: () => void;
};
```

---

## 14.3 JournalHistoryItem

Purpose:
Item journal sebelumnya.

Props:

```ts
type JournalHistoryItemProps = {
  date: string;
  summary?: string;
  mood?: "calm" | "clear" | "tired" | "restless" | "focused";
  onClick?: () => void;
};
```

---

# 15. Timeline Components

---

## 15.1 TimelineCalendar

Purpose:
Calendar sederhana untuk season.

Props:

```ts
type TimelineCalendarProps = {
  days: TimelineDay[];
  onSelectDay?: (date: string) => void;
};
```

Rules:

```text
Small cells.
Minimal color.
Clear legend.
```

---

## 15.2 CalendarDayCell

Purpose:
Satu cell di calendar.

Props:

```ts
type CalendarDayCellProps = {
  date: string;
  status:
    | "not_started"
    | "completed"
    | "partial"
    | "missed"
    | "relapse"
    | "rest";
  active?: boolean;
};
```

Visual status:

```text
not_started = border only
completed = success soft
partial = accent soft
missed = muted
relapse = danger soft
rest = surface soft
```

---

## 15.3 HeatmapGrid

Purpose:
Visualisasi progress seperti contribution map.

Props:

```ts
type HeatmapGridProps = {
  days: TimelineDay[];
};
```

Rules:

```text
Do not use neon colors.
Do not make it feel like social media streak pressure.
```

---

## 15.4 TimelineLegend

Purpose:
Menjelaskan warna status.

Items:

```text
Completed
Partial
Missed
Relapse
Rest
```

---

## 15.5 MilestoneList

Purpose:
Menampilkan milestone season.

Props:

```ts
type MilestoneListProps = {
  milestones: {
    label: string;
    date: string;
    completed: boolean;
  }[];
};
```

Examples:

```text
Day 7 review
Day 30 checkpoint
Season end
```

---

# 16. Relapse Components

---

## 16.1 RelapseTriggerSelector

Purpose:
Pilih penyebab relapse.

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

Props:

```ts
type RelapseTriggerSelectorProps = {
  value?: RelapseTrigger;
  onChange: (value: RelapseTrigger) => void;
};
```

---

## 16.2 RelapseReflectionCard

Purpose:
Membingkai relapse sebagai data.

Copy:

```text
You drifted. Learn from it.
```

Props:

```ts
type RelapseReflectionCardProps = {
  trigger?: RelapseTrigger;
  note?: string;
  recoveryAction?: string;
};
```

---

# 17. Feedback Components

---

## 17.1 EmptyState

Purpose:
State kosong.

Props:

```ts
type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};
```

Examples:

```text
Your path will appear here as you move.
Choose what deserves today.
Close the day with one honest note.
```

---

## 17.2 CalmAlert

Purpose:
Peringatan lembut.

Props:

```ts
type CalmAlertProps = {
  type: "info" | "warning" | "danger" | "success";
  title: string;
  description?: string;
};
```

Rules:

```text
Never sound harsh.
Use calm copy.
```

Example:

```text
Every goal needs at least one day this week.
```

---

## 17.3 ConfirmationSheet

Purpose:
Konfirmasi untuk aksi penting.

Props:

```ts
type ConfirmationSheetProps = {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
};
```

Used for:

```text
reset season
archive season
release goal
```

---

## 17.4 Toast

Purpose:
Feedback ringan.

Props:

```ts
type ToastProps = {
  message: string;
  type?: "success" | "info" | "warning";
};
```

Examples:

```text
Saved.
Reflection saved.
Focus session completed.
```

Rules:

```text
No exaggerated celebration.
No confetti.
```

---

# 18. Settings Components

---

## 18.1 SettingsListItem

Purpose:
Item menu settings.

Props:

```ts
type SettingsListItemProps = {
  title: string;
  description?: string;
  onClick?: () => void;
  rightSlot?: React.ReactNode;
};
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

---

## 18.2 ToggleRow

Purpose:
Setting toggle.

Props:

```ts
type ToggleRowProps = {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};
```

---

# 19. Component State Rules

Every interactive component should define:

```text
default
selected
disabled
loading
completed
error
```

## Visual State Rules

Default:

```text
white surface
soft border
dark text
```

Selected:

```text
accent soft background
accent border
```

Disabled:

```text
low opacity
not clickable
```

Completed:

```text
success soft background
check icon optional
```

Error:

```text
danger soft
calm copy
```

---

# 20. Icon Rules Per Component

Use Lucide React.

Recommended mapping:

```text
Today = Circle
Week = Calendar
Timeline = Clock
Journal = PenLine
Goal = Target
Learning = BookOpen
Focus = Timer
Rest = Moon
Grey Mode = EyeOff
Habit = MinusCircle
Settings = Settings
```

Rules:

```text
Icon size: 20–24px
Stroke width: 1.5px
Maximum 1 icon per card
No filled icons
No emoji icons in final UI
```

---

# 21. Animation Rules Per Component

Allowed:

```text
fade in
subtle slide up
button press scale
strike-through goal release
timer transition
```

Avoid:

```text
bounce
confetti
shake
glow
reward burst
fast transitions
```

Default duration:

```text
150–250ms
```

---

# 22. MVP Component Build Order

Build in this order:

```text
1. AppShell
2. OnboardingShell
3. ScreenContainer
4. PageHeader
5. PrimaryButton
6. SecondaryButton
7. TextInput
8. Textarea
9. ChoiceChip
10. ChoiceCard
11. StepIndicator
12. GoalCard
13. GoalBrainDumpList
14. KeystoneActionInput
15. SeasonProgressCard
16. WeeklyAllocationCard
17. WeekPlannerGrid
18. FlowPickTodayCard
19. TodayFocusCard
20. EnergyCheck
21. LearningCompanionCard
22. FocusTimer
23. JournalForm
24. TimelineCalendar
25. CalendarDayCell
26. EmptyState
27. CalmAlert
28. ConfirmationSheet
29. BottomNav
```

---

# 23. Component QA Checklist

Before accepting a component, check:

```text
Is it visually calm?
Does it follow the color system?
Does it use minimal icons?
Is the touch target at least 44px?
Does it work on 360px width?
Does it have clear empty state?
Does it have disabled state?
Does it avoid unnecessary animation?
Does the copy feel kind and direct?
Can it be reused across screens?
```

---

# 24. Final Component Rule

A component is good if it helps the user answer one of these:

```text
What matters this season?
What matters this week?
What matters today?
What should I remove?
What did I learn?
How do I return to my path?
```

If a component does not support these questions, do not build it in MVP.
