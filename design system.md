# Design System — Zendo Zen Dark Minimalism PWA

## V2 Redesign Direction

Zendo uses Zen Dark Minimalism:

```text
dark
quiet
premium
focused
low-stimulation
season-based
one-focus-per-day
```

Core palette:

```css
--color-bg: #0F100F;
--color-bg-deep: #090A09;
--color-surface: #171917;
--color-surface-soft: #1F221F;
--color-surface-raised: #252922;
--color-text: #F4F1EA;
--color-text-muted: #A7A197;
--color-text-soft: #716D66;
--color-border: #2D312B;
--color-border-strong: #3B4038;
--color-accent: #BFA16A;
--color-accent-soft: #2C261B;
--color-success: #7C9A72;
--color-success-soft: #1E2A1D;
--color-warning: #B88A44;
--color-warning-soft: #2A2115;
--color-danger: #B86A5E;
--color-danger-soft: #2A1B19;
--color-rest: #6F7E8C;
--color-rest-soft: #1B2228;
```

Primary CTA:

```css
height: 60px;
border-radius: 24px;
background: #BFA16A;
color: #0F100F;
font-weight: 700;
```

Bottom nav:

```css
position: fixed;
bottom: 18px;
left: 24px;
right: 24px;
height: 72px;
border-radius: 999px;
background: #171917;
border: 1px solid #3B4038;
```

Avoid pastel/cute style, dopamine streak pressure, emoji-heavy habit grids, trophy/rocket/confetti UI, neon colors, and generic habit-tracker language.

## 1. Product Design Principle

Aplikasi ini bukan productivity app yang ramai. Aplikasi ini adalah ruang sunyi untuk membantu user memilih sedikit hal, fokus lebih dalam, dan menjaga progres selama satu season.

Core feeling:

```text
Calm
Minimal
Intentional
Low-stimulation
Focused
Honest
```

Design rule utama:

```text
One screen = one clear intention.
One day = one theme.
One action = one meaningful progress.
```

Hindari:

```text
Terlalu banyak warna
Terlalu banyak ikon
Terlalu banyak card
Gamification berlebihan
Gradient mencolok
Shadow berat
Copy yang menghakimi user
```

---

# 2. Visual Direction

Style utama:

```text
Japanese zen
Warm minimalism
Soft brutalism
Clean mobile-first layout
```

Inspirasi rasa:

```text
quiet journal
monk mode dashboard
minimal calendar
wabi-sabi space
```

UI harus terasa seperti:

```text
membuka ruang tenang, bukan membuka aplikasi produktivitas yang ramai.
```

---

# 3. Color System

## 3.1 Core Palette

```css
--color-bg: #FAF8F2;
--color-surface: #FFFFFF;
--color-surface-soft: #F4EFE7;

--color-text: #151515;
--color-text-muted: #77736B;
--color-text-soft: #9A948A;

--color-border: #E7E0D6;
--color-border-strong: #D5CABC;

--color-accent: #A98C6D;
--color-accent-soft: #E8DCCF;

--color-success: #6F8F72;
--color-success-soft: #E4EDE2;

--color-warning: #B88A44;
--color-warning-soft: #F1E5D0;

--color-danger: #A75D4E;
--color-danger-soft: #EAD8D4;
```

## 3.2 Usage Rules

Background utama:

```css
#FAF8F2
```

Card utama:

```css
#FFFFFF
```

Card sekunder:

```css
#F4EFE7
```

Accent hanya dipakai untuk:

```text
Primary button
Selected state
Progress indicator
Important active goal
```

Danger hanya dipakai untuk:

```text
Relapse
Bad habit
Remove goal
Warning besar
```

Success hanya dipakai untuk:

```text
Completed day
Finished focus
Learning completed
Reflection done
```

---

# 4. Typography

## 4.1 Font

Primary font:

```text
Inter
```

Alternative:

```text
IBM Plex Sans
```

Monospace untuk angka, timer, dan countdown:

```text
IBM Plex Mono
```

## 4.2 Type Scale

```css
--font-xs: 12px;
--font-sm: 14px;
--font-base: 16px;
--font-md: 18px;
--font-lg: 22px;
--font-xl: 28px;
--font-2xl: 36px;
```

## 4.3 Typography Usage

### Page Title

```css
font-size: 28px;
line-height: 36px;
font-weight: 600;
letter-spacing: -0.02em;
```

### Section Title

```css
font-size: 18px;
line-height: 26px;
font-weight: 600;
```

### Body Text

```css
font-size: 16px;
line-height: 24px;
font-weight: 400;
```

### Muted Text

```css
font-size: 14px;
line-height: 22px;
font-weight: 400;
color: #77736B;
```

### Timer / Countdown

```css
font-family: IBM Plex Mono;
font-size: 36px;
line-height: 44px;
font-weight: 500;
```

---

# 5. Spacing System

Gunakan 8px spacing system.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

## Layout Spacing Rules

Page horizontal padding:

```css
16px mobile kecil
20px mobile normal
24px mobile besar
```

Section gap:

```css
24px - 32px
```

Card internal padding:

```css
16px minimum
20px recommended
24px for important card
```

Element gap dalam card:

```css
8px - 16px
```

---

# 6. Radius System

```css
--radius-sm: 10px;
--radius-md: 16px;
--radius-lg: 20px;
--radius-xl: 28px;
--radius-pill: 999px;
```

Usage:

```text
Button: 999px
Small chip: 999px
Card: 20px
Important card: 28px
Input: 16px
Modal: 28px
Bottom sheet: 28px top radius
```

---

# 7. Border & Shadow

## Border

Default:

```css
1px solid #E7E0D6
```

Strong:

```css
1px solid #D5CABC
```

## Shadow

Gunakan shadow seminimal mungkin.

Default card:

```css
no shadow
```

Floating element:

```css
box-shadow: 0 8px 24px rgba(21, 21, 21, 0.06);
```

Rule:

```text
Prioritaskan border dan whitespace daripada shadow.
```

---

# 8. Icon Rules

Gunakan:

```text
Lucide React
```

Icon style:

```css
size: 20px - 24px;
stroke-width: 1.5px;
stroke-linecap: round;
stroke-linejoin: round;
```

Rules:

```text
Maksimal 1 ikon per card
Ikon harus outline
Tidak pakai filled icon
Tidak pakai ikon dekoratif berlebihan
Ikon hanya muncul jika membantu pemahaman
```

Recommended icons:

```text
Target
Calendar
BookOpen
Clock
Leaf
Circle
Check
X
Minus
Plus
Flame
Moon
Sun
Timer
PenLine
```

Avoid:

```text
Trophy
Confetti
Medal
Rocket
Lightning
Star berlebihan
```

Karena app ini bukan gamified dopamine app.

---

# 9. Component System

## 9.1 Button

### Primary Button

Usage:
CTA utama.

```css
height: 52px;
padding: 0 24px;
border-radius: 999px;
background: #A98C6D;
color: #FFFFFF;
font-size: 16px;
font-weight: 500;
```

Copy examples:

```text
Begin
Enter Season
Start Focus
Reflect Today
Save
```

### Secondary Button

```css
height: 52px;
padding: 0 24px;
border-radius: 999px;
background: #F4EFE7;
color: #151515;
border: 1px solid #E7E0D6;
```

### Ghost Button

```css
height: 44px;
padding: 0 16px;
border-radius: 999px;
background: transparent;
color: #77736B;
```

---

## 9.2 Card

### Default Card

```css
background: #FFFFFF;
border: 1px solid #E7E0D6;
border-radius: 20px;
padding: 20px;
```

### Focus Card

Untuk today highlight.

```css
background: #FFFFFF;
border: 1px solid #D5CABC;
border-radius: 28px;
padding: 24px;
```

### Soft Card

```css
background: #F4EFE7;
border: 1px solid #E7E0D6;
border-radius: 20px;
padding: 20px;
```

---

## 9.3 Input

### Text Input

```css
height: 52px;
border-radius: 16px;
border: 1px solid #E7E0D6;
background: #FFFFFF;
padding: 0 16px;
font-size: 16px;
color: #151515;
```

Focus state:

```css
border-color: #A98C6D;
outline: none;
```

Placeholder:

```css
color: #9A948A;
```

---

## 9.4 Textarea

Untuk journal dan learning notes.

```css
min-height: 120px;
border-radius: 20px;
border: 1px solid #E7E0D6;
background: #FFFFFF;
padding: 16px;
font-size: 16px;
line-height: 24px;
resize: none;
```

---

## 9.5 Chip

Untuk pilihan goal, habit, mode, dan filter.

```css
height: 40px;
padding: 0 14px;
border-radius: 999px;
border: 1px solid #E7E0D6;
background: #FFFFFF;
color: #151515;
font-size: 14px;
```

Selected:

```css
background: #E8DCCF;
border-color: #A98C6D;
color: #151515;
```

---

## 9.6 Bottom Navigation

Tabs:

```text
Today
Week
Timeline
Journal
```

Style:

```css
height: 72px;
background: rgba(250, 248, 242, 0.92);
backdrop-filter: blur(16px);
border-top: 1px solid #E7E0D6;
```

Item:

```css
icon: 22px;
label: 12px;
inactive: #9A948A;
active: #151515;
```

Rule:

```text
Tidak lebih dari 4 tab.
Tidak pakai floating nav yang ramai.
```

---

# 10. Mobile-First Layout

## 10.1 Canvas

Target utama:

```text
Mobile portrait
360px - 430px width
```

Recommended design frame:

```text
393 × 852 px
```

## 10.2 Page Container

```css
min-height: 100dvh;
background: #FAF8F2;
padding: 20px;
padding-bottom: 96px;
```

## 10.3 Safe Area

Untuk PWA mobile:

```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

## 10.4 Layout Rule

Setiap screen harus punya:

```text
Top breathing space
Clear title
Short explanation
One main interaction
One primary CTA
```

Hindari screen dengan terlalu banyak pilihan.

---

# 11. Screen Layout Pattern

## 11.1 Onboarding Screen Pattern

```text
Top:
small step indicator

Middle:
title
subcopy

Content:
main input / selection

Bottom:
primary CTA
optional secondary text
```

Spacing:

```css
title margin-top: 48px;
title to subcopy: 12px;
subcopy to content: 32px;
content to button: 32px;
```

---

## 11.2 Today Screen Pattern

```text
Header:
date + season day

Pinned:
today theme card

Content:
main action
learning block
energy check
start focus

Bottom:
reflect today
```

Today screen must never show long task lists.

---

## 11.3 Week Screen Pattern

```text
Header:
week number

Summary:
weekly allocation

Main:
7-day planner or flow quota

Footer:
adjust week / pick today
```

---

## 11.4 Timeline Screen Pattern

```text
Header:
season progress

Main:
calendar / heatmap

Secondary:
milestones
```

---

## 11.5 Journal Screen Pattern

```text
Header:
today reflection

Main:
guided questions

History:
past entries
```

---

# 12. Motion Design

Motion harus pelan, ringan, dan tidak membuat user terdistraksi.

Use:

```text
fade
slide up small
scale 0.98 to 1
```

Duration:

```css
150ms - 250ms
```

Avoid:

```text
bounce animation
confetti
flashy transition
reward animation berlebihan
```

Recommended motion:

```text
Card muncul perlahan
Button subtle press
Checklist fade-in
Goal dicoret dengan line-through animation
```

---

# 13. Copywriting Rules

Voice:

```text
calm
clear
kind
direct
encouraging
```

Avoid:

```text
You failed
You are distracted
You wasted time
Kill your goals
Crush it
Hustle harder
```

Use:

```text
Make space
Return to your path
Choose what matters
Stay with one thing
Release what can wait
Move with intention
```

Examples:

```text
Make space for what matters.
What deserves your energy this season?
What can you release for now?
Stay with one thing.
Return to your path.
Today has one focus.
```

---

# 14. Component Priority for MVP

Build these first:

```text
AppShell
BottomNav
PageHeader
StepIndicator
PrimaryButton
SecondaryButton
TextInput
Textarea
ChoiceChip
GoalCard
FocusCard
SeasonProgressCard
WeeklyAllocationCard
CalendarDayCell
HeatmapCell
JournalQuestionCard
LearningEntryCard
FocusTimer
```

---

# 15. Accessibility Rules

Minimum text size:

```text
12px only for labels
14px for supporting text
16px for main body
```

Touch target minimum:

```css
44px × 44px
```

Contrast:

```text
Text must be readable on cream background.
Muted text cannot be too light.
```

Reduce motion:

```text
Respect prefers-reduced-motion.
```

---

# 16. PWA-Specific Design Rules

App should feel installable and native-like.

Rules:

```text
No browser-like clutter
No unnecessary top navbar
Bottom nav fixed
Offline-first mindset
Save automatically
Short interactions
Large touch targets
```

PWA display mode:

```json
"display": "standalone"
```

Theme color:

```json
"theme_color": "#FAF8F2"
```

Background color:

```json
"background_color": "#FAF8F2"
```

App icon direction:

```text
simple circle / zen mark / single leaf / minimal gate
no mascot
no complex illustration
```

---

# 17. Design QA Checklist

Before shipping each screen, check:

```text
Does this screen have only one main intention?
Is the CTA obvious?
Are there too many cards?
Are there too many icons?
Is whitespace enough?
Is the copy calm and encouraging?
Can user understand it in 3 seconds?
Does it avoid dopamine-heavy design?
Does it work on 360px mobile width?
Does it still look clean in PWA standalone mode?
```

---

# 18. Final Design Principle

The app should not motivate user with noise.

It should create silence.

The best design is the one that makes the user feel:

```text
I know what matters today.
I know what to remove.
I know what to do next.
I can return to my path.
```
