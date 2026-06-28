# pwa_spec.md — Monk Mode PWA

Version: v0.1
Platform: Mobile-first Progressive Web App
Related Docs: design_system.md, screen_spec.md, data_model.md, app_logic.md, component_library.md, ux_writing.md

---

# 1. PWA Philosophy

Aplikasi ini harus terasa seperti aplikasi mobile sederhana, bukan website biasa.

PWA ini harus:

```text
installable
mobile-first
offline-first
fast to open
low-distraction
local-first
calm and minimal
```

PWA ini tidak boleh terasa seperti:

```text
website marketing
dashboard desktop
task manager kompleks
app dengan banyak notifikasi
```

Core principle:

```text
The app should open quickly and return user to one clear focus.
```

---

# 2. Platform Target

## Primary Target

```text
Mobile browser
Installed PWA on Android
Installed PWA on desktop as secondary
```

## Screen Target

```text
360px - 430px mobile width
393 × 852 px design reference
```

## Browser Priority

```text
Chrome Android
Edge Android
Safari iOS as best effort
Chrome Desktop
```

---

# 3. Tech Recommendation

Recommended stack:

```text
React
Vite
TypeScript
Tailwind CSS
vite-plugin-pwa
Zustand
localStorage for MVP
IndexedDB later
Lucide React
```

PWA plugin:

```text
vite-plugin-pwa
```

Recommended mode:

```text
generateSW
```

Reason:

```text
simpler for MVP
less service worker complexity
fast to implement
```

---

# 4. Manifest Specification

File:

```text
public/manifest.webmanifest
```

Recommended manifest:

```json
{
  "name": "Monk",
  "short_name": "Monk",
  "description": "A quiet space for deep focus and intentional progress.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FAF8F2",
  "theme_color": "#FAF8F2",
  "categories": ["productivity", "lifestyle"],
  "lang": "en",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

---

# 5. App Icon Direction

Icon harus minimal.

Allowed directions:

```text
simple zen circle
minimal gate
single leaf
quiet dot
thin ensō-inspired circle
```

Avoid:

```text
mascot
complex illustration
gradient icon
many symbols
neon colors
trophy
rocket
fire
```

Icon style:

```text
cream background
dark charcoal mark
soft brown accent optional
large breathing space
recognizable at small size
```

Icon colors:

```text
background: #FAF8F2
mark: #151515
accent optional: #A98C6D
```

---

# 6. PWA Display Behavior

Manifest display:

```json
"display": "standalone"
```

The app should hide browser UI when installed.

Layout rules:

```text
No browser-like top navigation
No unnecessary address-bar-dependent spacing
Use safe-area insets
Fixed bottom navigation after onboarding
```

CSS:

```css
html,
body,
#root {
  min-height: 100%;
  background: #FAF8F2;
}

body {
  margin: 0;
  overscroll-behavior: none;
}

.app-shell {
  min-height: 100dvh;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

# 7. Offline Strategy

The app should work without internet.

## MVP Offline Requirements

User must be able to:

```text
open app
view active season
view today focus
start and complete focus session
write journal
add learning note
view timeline
edit local data
```

## Not Required in MVP

```text
cloud sync
multi-device sync
online account
server backup
```

---

# 8. Caching Strategy

## App Shell Caching

Cache:

```text
HTML
CSS
JS
manifest
icons
local static assets
```

Strategy:

```text
Cache-first for app shell
Network-first not required for MVP
```

## Data Caching

User data is stored locally.

```text
localStorage for MVP
IndexedDB later
```

Do not depend on external APIs for core functionality.

---

# 9. Service Worker Behavior

Recommended via vite-plugin-pwa:

```ts
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
    scope: "/"
  }
})
```

---

# 10. Update Behavior

PWA update harus tidak mengganggu.

When update available:

```text
Do not interrupt focus session.
Do not show aggressive modal.
Show subtle toast after session or on app idle.
```

Copy:

```text
A calmer version is ready.
```

CTA:

```text
Update
```

Secondary:

```text
Later
```

Rules:

```text
Never reload during active focus session.
Never lose unsaved journal text.
Autosave before update.
```

---

# 11. Install Prompt Logic

Do not show install prompt too early.

## When to Suggest Install

Show install prompt after:

```text
onboarding completed
active season created
user returns to app at least once
```

Suggested condition:

```pseudo
if onboardingCompleted
and activeSeason exists
and app not installed
and userOpenedAppCount >= 2:
    show install suggestion
```

Copy:

```text
Keep this space close.
Install Monk for quieter access.
```

CTA:

```text
Install
```

Secondary:

```text
Not now
```

## Do Not Show Install Prompt

```text
during onboarding
during focus session
while writing journal
immediately on first visit
```

---

# 12. Local Storage Specification

MVP storage:

```text
localStorage
```

Key:

```ts
const STORAGE_KEY = "monk_mode_pwa_state_v1";
```

Data shape:

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

## Autosave Rules

Autosave on:

```text
onboarding step complete
goal input update
season created
weekly plan update
today plan chosen
focus session complete
journal change
learning entry save
relapse log save
settings update
```

## Journal Autosave

Journal should autosave draft.

Recommended key:

```ts
const JOURNAL_DRAFT_KEY = "monk_journal_draft_v1";
```

Reason:

```text
User should not lose reflection text.
```

---

# 13. IndexedDB Upgrade Path

Use IndexedDB later when:

```text
journal history grows
learning notes grow
export feature added
backup feature added
attachments added
```

Recommended library:

```text
Dexie
```

Possible stores:

```text
seasons
goals
badHabits
weeklyPlans
dayPlans
focusSessions
learningEntries
journalEntries
relapseLogs
timelineDays
settings
```

---

# 14. Data Persistence Rules

Data should be:

```text
local-first
private by default
available offline
autosaved
exportable later
```

No account required in MVP.

No analytics required in MVP.

No cloud sync in MVP.

---

# 15. Notification Specification

PWA notification support varies by OS/browser.

## MVP Notification Logic

Ask permission only after onboarding.

Do not request permission on first screen.

Trigger:

```text
after Commitment Summary / Enter Season
or inside Settings
```

Permission copy:

```text
Monk can remind you gently without adding noise.
```

CTA:

```text
Enable Reminders
```

Secondary:

```text
Not now
```

## Notification Types

```text
daily_start
daily_reflection
weekly_review
season_countdown
season_end
```

## Notification Copy

Daily start:

```text
Return to your path.
```

Daily reflection:

```text
What moved today?
```

Weekly review:

```text
Shape the next quiet week.
```

Season countdown:

```text
{daysLeft} days left in this season.
```

Season end:

```text
Your season has ended. Reflect before you continue.
```

## Notification Rules

```text
No motivational spam.
No guilt-based reminders.
No more than 2 reminders per day by default.
User can turn off reminders anytime.
```

---

# 16. Reminder Schedule Defaults

Default reminders:

```text
Daily start: 08:00
Daily reflection: 21:00
Weekly review: Sunday 19:00
Season countdown: 21 days, 7 days, 1 day before end
Season end: end date morning
```

For MVP, reminders can be simulated in-app if push notification support is limited.

---

# 17. Grey Mode Limitation

PWA cannot force phone grayscale mode.

App can only:

```text
show guide
ask user to activate manually
store confirmation
show reminder in settings
```

Copy:

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

# 18. App Blocking Limitation

PWA cannot uninstall or block other apps directly.

App can only:

```text
guide user
create checklist
suggest friction actions
track confirmation
```

Example:

```text
Uninstall Instagram
Remove TikTok shortcut
Logout from YouTube
Mute non-essential groups
```

Important:

```text
Do not claim the PWA can block apps.
Do not claim the PWA can enforce uninstall.
```

---

# 19. Routing Specification

Recommended routes:

```text
/
 /onboarding/welcome
 /onboarding/habits
 /onboarding/remove
 /onboarding/grey-mode
 /onboarding/goals
 /onboarding/eliminate
 /onboarding/focus-goals
 /onboarding/season
 /onboarding/keystone
 /onboarding/weekly-mode
 /onboarding/week-setup
 /today
 /week
 /timeline
 /journal
 /focus
 /learn
 /relapse
 /season-end
 /settings
```

Routing logic:

```text
protected main routes require onboardingCompleted true
onboarding routes redirect to /today if active season exists
/ redirects based on app entry logic
```

---

# 20. App Launch Logic

On launch:

```pseudo
load local state

if no userProfile:
    route "/onboarding/welcome"

else if onboardingCompleted is false:
    route to last onboarding step

else if activeSeason is null:
    route "/onboarding/welcome"

else if today > activeSeason.endDate:
    mark season ended
    route "/season-end"

else:
    route "/today"
```

---

# 21. Performance Requirements

The app must feel instant.

Target:

```text
First load: fast enough for mobile network
Interaction response: under 100ms
Route transition: under 250ms
Focus timer: stable and accurate
```

Avoid:

```text
large animation libraries unless needed
large image assets
heavy background scripts
external fonts blocking render
```

Font loading:

```text
Use system font or self-host font later.
Inter is preferred but system fallback is acceptable.
```

---

# 22. Asset Requirements

MVP should use minimal assets.

Required:

```text
app icon 192
app icon 512
maskable icon 192
maskable icon 512
favicon
apple touch icon
```

Avoid:

```text
large illustrations
mascot files
background images
heavy Lottie animations
```

Reason:

```text
The app should stay quiet and fast.
```

---

# 23. Accessibility Requirements

PWA must support:

```text
large touch targets
readable contrast
keyboard navigation basic
screen reader labels for buttons
reduced motion preference
safe area handling
```

Minimum touch target:

```text
44 × 44 px
```

Reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# 24. Privacy Requirements

MVP privacy stance:

```text
No login
No analytics
No cloud sync
No selling data
No external tracking
All user data stored locally
```

Privacy copy:

```text
Your season stays on this device.
```

Settings note:

```text
Data is stored locally on your device.
```

---

# 25. Export Requirement

Export is P1, not P0.

When implemented:

```text
export journal
export season summary
export all local data as JSON
```

Export formats:

```text
Markdown
JSON
```

MVP can include disabled placeholder:

```text
Export Journal — coming later
```

---

# 26. Backup Requirement

Backup is P1/P2.

Possible future options:

```text
manual JSON backup
Google Drive backup
cloud account
```

Not included in MVP.

---

# 27. Offline Empty / Error State

If app is offline:

```text
No error needed for core usage.
```

If update or external resource fails:

Copy:

```text
You can continue offline.
```

If local data load fails:

Copy:

```text
Something interrupted your local data.
```

Actions:

```text
Try Again
Reset App
Export Raw Data
```

---

# 28. PWA QA Checklist

Before shipping, check:

```text
Can app be installed?
Does manifest load correctly?
Do icons appear correctly?
Does app open in standalone mode?
Does app work offline after first load?
Does Today screen load offline?
Can user write journal offline?
Can user complete focus offline?
Does bottom nav respect safe area?
Does layout work on 360px width?
Does update not interrupt focus session?
Does data persist after refresh?
Does data persist after closing app?
Does app recover if localStorage is empty?
```

---

# 29. MVP PWA Scope

P0 includes:

```text
manifest
installable app
offline app shell
local storage persistence
mobile-first standalone layout
basic notification permission flow
safe area support
simple update behavior
```

P1 includes:

```text
IndexedDB migration
export journal
advanced notifications
backup
install prompt analytics-free tracking
```

P2 includes:

```text
cloud sync
multi-device support
native app wrapper
app blocker integration through native layer
```

---

# 30. Final PWA Rule

The PWA should not compete for attention.

It should behave like:

```text
a quiet tool
a personal journal
a focus anchor
a season tracker
```

If a PWA feature adds noise, delay it.
