# Zendo UI/UX Audit — 2026-09-26

**Design read:** Multi-screen productivity PWA for a solo, intentional user, with a Zen dark-minimalist language, leaning toward the existing CSS-variable token system + Tailwind v3 + shared `src/components/ui.tsx` primitives.

**Dials (redesign-preserve):** DESIGN_VARIANCE 5 · MOTION_INTENSITY 5 · VISUAL_DENSITY 4
**Mode:** Redesign — Preserve. Brand tokens, IA, route slugs, copy voice all preserved.

---

## Already strong (do NOT touch)

- Token system is real: 5 `[data-theme]` palettes, all colors routed through `--color-*`, consumed via `tailwind.config.ts` `monk.*`. No palette drift.
- One icon family (lucide), one font pairing (Outfit + IBM Plex Mono, Caveat for notebook).
- `monk-depth` / `monk-depth-raised` / `monk-glass` give dark surfaces genuine layering.
- Microcopy voice is already non-judgmental and human ("Kamu balik. Itu saja sudah cukup.", "Hari ini bergerak. Jaga ruang ini tetap tenang.").
- Focus phase engine, PWA, notifications, streak, time-blocking all work.

---

## P0 — Critical

### P0-1 · Bottom nav sliced page content in half — FIXED
**Evidence:** measured with `tools/audit/measure-nav.mjs`. The nav band is `y 742–812` at 375×812 and `y 774–844` at 390×844. Interactive elements sitting under it at rest:

| Screen | Viewport | Element | docY | nav top | doc height |
|---|---|---|---|---|---|
| `/week` | 375 | `Lanjutkan`/`Sesuaikan`/`Lepaskan` | 784 | 742 | 1988 |
| `/week` | 390 | same chips | 784 | 774 | 1972 |
| `/learn` | 375 | `CATATAN` textarea | 760 | 742 | 2180 |
| `/focus` | 390 | `Mulai Deep Work` | 803 | 774 | 1146 |

Before: `audit/nav/390-week-rest.png` (chips sliced horizontally in half by the pill).

**Root cause — corrected three times.** Three diagnoses were tried and disproved before the right one:

1. *Bottom padding* (original entry). Raised `+148px` → `+168px`; the blocked elements did not move one pixel. `tools/audit/measure-tail.mjs` shows the contract was already correct: `tailGap = 168px` matching `main`'s computed `paddingBottom`. Padding only extends the scroll range at the *end* of the document, and these elements sit mid-page at `docY=784` in a ~2600px document.
2. *Information hierarchy on `/week`* (prose pushing chips down). Reordering actions above the two prose paragraphs moved the chips **down** 25px, making it worse. Reverted.
3. *Nav translucency* — **correct**. `.monk-glass` (`globals.css:312`) sets the pill to `color-mix(surface 82%, transparent)` + `backdrop-blur(16px)`. At 82% alpha the pill only *partially* occludes what is under it, so a button crossing its edge renders half-visible and reads as broken. No layout change can fix this: the content genuinely cannot fit above the nav at rest.

**Fix:** a full-width bottom fade in `AppShell` (`ui.tsx`). Solid page-background over the pill's own band (`safe-area + 90px`), fading to transparent over the next 96px. Content passing under the nav now reads as deliberate depth instead of being sliced. The pill keeps its floating glass look.

Note the first scrim attempt failed: `pt-8` gave a 32px hard-edged grey band (visible in the old `audit/nav/375-learn-rest.png`). The geometry is what matters — the solid region must cover the pill, and the fade must be long enough not to read as an edge.

**Verified:** `audit/final/390-week.png`, `audit/final/390-learn.png`, `audit/final/390-focus.png` — chips fully readable, form fades cleanly, no grey band. `measure-nav.mjs` still reports geometric overlap for mid-list items (a chip in the 2nd goal group sits under the fade), which is normal floating-nav behaviour, not occlusion: the fade is what makes it legible.

### P0-2 · Timeline screen hard-crashed when an event lacked `occurredAt` — FIXED
**Evidence:** `src/screens/TimelineScreen.tsx:339` — `event.occurredAt.slice(0, 10)` guarded only by a `seasonId` filter. Any event missing `occurredAt` threw `TypeError: Cannot read properties of undefined (reading 'slice')` and React Router dropped the whole route to its default error boundary.
**Fix:** defensive date resolution in the grouping memo (`occurredAt || createdAt || focusSession.startedAt`), matching the fallback chain the focus-session branch already used.

### P0-3 · Focus ring missing on the most prominent interactive elements — FIXED
**Evidence:** `TEXTAREA`, `INPUT`, `PrimaryButton`, `GhostButton` all reported `outline: 2px solid rgba(0,0,0,0)` — the global `*:focus-visible` rule (`globals.css:241`) was being killed by Tailwind's `focus-visible:outline-none` (specificity 0-2-0), which only re-added a `ring` box-shadow flush against the page.
**Fix:** doubled pseudo-class selectors (`button:focus-visible:focus-visible`, specificity 0-2-1) beat the utility. **Verified:** all 14 tab stops on `/today` report `2px solid rgb(164, 139, 94)`; the final QA sweep reports `missingFocusRing=0` across 25 focusable elements at 5 viewports.

### P0-4 · Invalid nested `<button>` inside the goal-pick card — FIXED
**Evidence:** on `/today`, the "pick a goal" card was a `<button>` (`TodayScreen.tsx:1658`) containing a Blueprint `<button>` (`:1688`). Three instances. React logged `validateDOMNesting(...): <button> cannot appear as a descendant of <button>`. A `stopPropagation` masked the double-fire, but nested interactive elements break keyboard focus order and screen-reader semantics.
**Fix:** the card is now a `div` with `role="button"`, `tabIndex={0}`, and an Enter/Space `onKeyDown`, so the inner Blueprint button is valid. **Verified:** `document.querySelectorAll("button button").length === 0`, and the console warning is gone.

---

## P1 — High impact

### P1-1 · Responsive design was absent above the phone breakpoint — FIXED
**Evidence:** 102 total responsive utilities in the whole `src` tree (99 `sm:`, 3 `md:`, **0** `lg:`/`xl:`/`2xl:`). Shell capped: `ScreenContainer` `max-w-[430px]`, `#root > * { max-width: 480px }`. The content column was 430px wide at 768, at 1440, and at 1920.
**Fix:** a real `lg`/`xl` tier — wider shell (`lg:max-w-3xl lg:px-8 xl:max-w-5xl` in `ui.tsx`, matching `@media` caps in `globals.css`) plus genuine two-pane CSS Grid on `/today`, `/week`, `/timeline` (`lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]`). All added utilities are `lg:`/`xl:` only, so phone rendering is unchanged.
**Verified:** zero horizontal overflow at 375/390/768/1440/1920. Content height drops meaningfully — `/today` 1801 → 1274px at 1440, `/week` 2613 → 1471px. 35 new tests in `src/components/desktopResponsive.test.ts`.

### P1-2 · RETRACTED — claimed stray gold toast bar was not reproducible
**Original claim:** a 3px gold bar rendered at `y≈803` while idle, from the `CalmToast` markup in `ui.tsx` / `TodayScreen.tsx:1482`.
**Status: unverified, retracted.** Two checks failed to reproduce it:
- `CalmToast` returns `null` when `!visible || !message` (`ui.tsx:739-740`), so it renders nothing while idle. The `TodayScreen.tsx:1481` undo bar is likewise gated on `undoPlan`.
- An idle-state scan for any `position: fixed` element with `height < 20px` and `width > 40px` below `70%` viewport height returned **zero matches** across all 18 screen/viewport combinations tested.
Whatever produced the artifact in the earlier screenshot pass, it is not a reproducible defect. The claim is removed rather than left in the document dressed as measured fact.
**Kept anyway:** `CalmToast`'s offset was raised from `+88px` to `+168px` to match `BOTTOM_NAV_SAFE_SPACE`. That is a correctness fix on its own merits — at `+88px` a toast would have sat inside the nav band — not a fix for the retracted finding.

### P1-3 · Language inconsistency — English strings in an Indonesian UI — FIXED
**Evidence:** `OnboardingSteps.tsx` (157 "Choose your practical defenses", 227 "Brain dump first. Selection comes next.", 491 "One specific, repeatable action.", 631 "Quiet recovery (Rest)", 648 "Plan Tomorrow", 649 "Decide your focus theme one day before.", 663 "Rest", 685 "This week"); `TodayScreen.components.tsx:31` "How full is the tank today?"; `FocusPrepModal.tsx:341` "Rest".
**Fix:** ten keys added to both `id.ts` and `en.ts` (`onboarding.friction.hint`, `onboarding.goals.hint`, `onboarding.keystone.hint`, `today.planTomorrow.*`, `today.energy.tank`, `focusPrep.breathRest`), all call sites switched to `t()`.
**Also fixed:** the Support button was hardcoded `Dukung` and rendered Indonesian in English mode. Now `support.label` / `support.ariaLabel` in both catalogs (`ui.tsx`, `FocusScreen.tsx`).
**Verified at runtime** (`tools/audit/verify-i18n.mjs`): in both `id` and `en` modes, zero unresolved key strings rendered and zero banned English literals visible.

### P1-4 · Semantic color drift — FIXED
**Evidence (three directions):**
1. Time-block categories used stock Tailwind hues, bypassing the token system: `DayTimeBlockVisualizer.tsx` — `amber-500`/`blue-500`/`purple-500`/`emerald-500`/`rose-500`.
2. Support/Pro used `amber-*` across 10 files while the brand accent is gold `#A48B5E`.
3. `bg-monk-accent` did four unrelated jobs: CTA fill, active nav pill, progress fill, decorative bullet.

**Fix:**
- New `--color-cat-*` tokens as **RGB triplets** (so Tailwind opacity modifiers work: `bg-monk-cat-deep/15`), declared per theme in all six `[data-theme]` blocks and exposed in `tailwind.config.ts`. Values are muted and mutually distinct, and none collides with accent/success/warning/danger.
- All 41 stock-palette uses replaced. `grep` for `amber-|blue-500|purple-500|emerald-500|rose-500` across `src` now returns **0**.
- The "NOW" line marker in the visualizer moved to the danger token (it is an alert-grade signal).

### P1-6 · Modal shell radius — three tokens for one concept — FIXED
**Evidence:** `rounded-3xl` (MorningPlanning, WeeklyReview, ZendoPro) vs `rounded-t-[28px]` (FocusPrep, GoalBlueprint) vs `rounded-monk-lg` (CalmDialog) — all the same modal shell. `rounded-3xl` and `rounded-monk` are both 24px yet were different tokens.
**Fix:** all five modals now use `rounded-monk-lg` (32px), matching `CalmDialog`. `rounded-3xl` and `rounded-[28px]` now return 0 hits in `src`.

### P1-5 · Same concept, different component, across screens — NOT DONE
Still open: section labels (7+ spellings), four progress-bar implementations, card padding (`p-4`/`p-5`/`p-6` mixed), and 217 uses of arbitrary sub-12px text sizes. The radius portion is resolved (P1-6).

### P1-6 · Radius drift is worse than a style preference — it is three tokens for one concept
**Evidence** (`rg -c` line counts across `src/`):

| Token | px | Lines | Notes |
|---|---|---|---|
| `rounded-xl` | 12 | ~92 | 21 files |
| `rounded-lg` | 8 | 52 | 13 files |
| `rounded-2xl` | 16 | ~51 | 14 files |
| `rounded-monk` | 24 | ~43 | 12 files |
| `rounded-md` | 6 | 35 | 8 files |
| `rounded-3xl` | 24 | 3 | MorningPlanningModal:313, WeeklyReviewModal:220, ZendoProModal:142 |
| `rounded-t-[28px]` | 28 | 2 | FocusPrepModal:156, GoalBlueprintModal:137 |
| `rounded-monk-lg` | 32 | 1 | `ui.tsx:162,510` |

The acute problem is not the volume, it is that **the modal shell is spelled three different ways for the same concept**: `rounded-3xl` (MorningPlanning, WeeklyReview, ZendoPro) vs `rounded-t-[28px]` (FocusPrep, GoalBlueprint) vs `rounded-monk-lg` (CalmDialog). And `rounded-3xl` and `rounded-monk` are both 24px yet are different tokens.
Single screens mix 3–4 radii: `JournalNotebook.tsx` (`monk` 9 / `lg` 12 / `xl` 4 / `md` 3), `TimelineScreen.tsx` (`md` 12 / `lg` 8 / `xl` 6 / `2xl` 3).
**Fix:** one documented radius scale, and one modal-shell token used by all five modals.

### P1-7 · Accent buttons put white on gold — 3.27:1, fails WCAG AA — FIXED
**Evidence:** `PrimaryButton` (`ui.tsx:181`) uses `bg-monk-accent text-monk-bg`. The pattern `rounded-lg bg-monk-accent` + `text-white` is repeated locally in 23 files (JournalNotebook 7, JournalPacks 5, TodayScreen 4, GoalBlueprintModal 4, FocusPrepModal 4, MorningPlanningModal 3, SeasonWidgets 3, DayTimeBlockVisualizer 3, 15 files ×1–2) against only 2 uses of the primitive. The two variants differ (`text-monk-bg` vs `text-white`), so the same button is not quite the same color across screens.
Raw `<button>` vs primitives: TodayScreen 24 raw vs 50 primitive refs; LibraryScreen 18 raw vs 10 primitive refs; TimelineScreen 9 raw vs 3 primitive refs.
**Measured, not just inconsistent:** white on the gold accent (`#A48B5E`) is **3.27:1** — below the AA floor of 4.5:1 for body text. `PrimaryButton` already used `text-monk-bg`, which measures **6.11:1**. So the drift was an accessibility defect, not only a consistency one.

**Fix:** all **19** co-occurring `bg-monk-accent` + `text-white` sites swapped to `text-monk-bg` (DayTimeBlockVisualizer, FocusPrepModal ×2, GoalBlueprintModal ×2, MorningPlanningModal ×3, JournalPacks ×4, SettingsScreen, TimelineScreen ×3, TodayScreen ×2, WeekScreen). These are compact pills, so they keep their own geometry rather than being forced onto `PrimaryButton` (which is `w-full min-h-12`); only the foreground token was unified. Re-measured live in-browser: every accent-background button is now 6.11:1, zero below AA.

### P1-8 · No modal trapped focus — WCAG 2.1.2 failure — FIXED
**Evidence:** `focustrap|initialfocus|inert` → **zero matches repo-wide**. `autoFocus` appears in 3 files only (ZendoProModal, LoginScreen, SignupScreen).
Escape handling present in FocusPrepModal, GoalBlueprintModal, WeeklyReviewModal, ZendoProModal, `ui.tsx` CalmDialog. **Absent** in MorningPlanningModal, RetroLogModal, and the `JournalPacks` modal.
`JournalPacks` also hand-rolls a `fixed inset-0` overlay instead of using `CalmDialog`, which is the only overlay in `screens/` — every other modal lives in `components/`.
**Why it matters:** WCAG 2.1.2 (no keyboard trap / escape) and 2.4.3 (focus order). A modal a keyboard user cannot dismiss is a hard failure.
**Fix:** one shared `useModalA11y` hook in `ui.tsx` (open/ref/onClose) now owns the whole contract: Escape closes, Tab and Shift+Tab wrap inside the container, focus parks on the panel when it has no focusable children, and focus returns to the opener on unmount. `CalmDialog` consumes it, so every modal already routing through that shell inherited it for free. The hook was then adopted by all six remaining overlays, each of which had hand-rolled Escape and none of which had a trap: `FocusPrepModal`, `GoalBlueprintModal` (whose Escape keeps backing out of the template picker first), `MorningPlanningModal`, `WeeklyReviewModal`, `ZendoProModal`, `JournalPacks`. `RetroLogModal` needed nothing — it already routes through `CalmDialog`.

**Verified in a real browser** (`tools/audit/modal-a11y.mjs`): 25 forward Tabs and 25 backward Tabs inside `MorningPlanningModal` produced **0 escapes**, focus entered the dialog on open, and Escape closed it. The remaining five are guarded by `src/components/modalA11y.test.ts` (27 assertions), which also fails if any modal reintroduces its own Escape listener.

### P1-9 · Hardcoded hex bypassed the theme system — FIXED
**Evidence:**
- `src/components/DrawingCanvas.tsx:27` `"#1a1714"` fill, `:31` `"#e8dcc8"` stroke — will not follow any of the five themes.
- `src/screens/JournalNotebook.tsx:25-33` nine category colors (`#e07c6b #6b9ac4 #6bb48b #c48bb4 #c4a06b #8b9dc4 #6bc4b4 #c48b6b #a0a0a0`), then `:130-131` re-lists the same hexes in a palette array — a duplicated single source of truth.
- `src/screens/SettingsScreen.tsx:334-339` six theme swatches — defensible, since those *are* the theme definitions.
**Fix:** `JournalNotebook`'s nine built-in categories now resolve to `--color-cat-*` / `--nb-user-*` tokens (all nine map to **distinct** tokens — an initial mapping collided two pairs onto the same hue, which would have made those chips indistinguishable). User-created categories hash onto the themed `--nb-user-1..8` pool, declared once in `:root` as RGB triplets so alpha can still be appended. The alpha suffixes were rewritten to `rgb(var(--token) / 0.09)`. `DrawingCanvas` reads `--notebook-bg` and `--notebook-text` via `getComputedStyle`, because canvas `fillStyle` cannot resolve `var()`.

**Verified across all six themes** (`audit/theme/*.png`): `--notebook-bg` resolves to six distinct values (`#1a1814 #10141A #101712 #1A1511 #080808 #140F08`) and the category chips visibly re-tint — blue in Sumi Ink, monochrome in Kurogane. Before this change the notebook was frozen to the default theme's colors.

---

## P2 — Polish

- **P2-1** `/lib/packs` renders 22 cards in a single undifferentiated column (`scrollHeight` 3847px at 390). Group by intent (morning / evening / deep / identity) or collapse premium behind a disclosure.
- **P2-2** `/season-end` asks four large empty textareas with no prompt context and no "why this matters" — the Season Recap spec calls for highlights first, then reflection. It currently leads with a blank form.
- **P2-3** `/seasons` shows `Waktu Fokus: 0m · 0 sesi` for a past season with no data — an empty metric is worse than no metric.
- **P2-4** `/learn` is a long undivided form (scrollHeight 2164 at 390) with a nav bar floating over its middle; the `CATATAN` textarea is half-hidden (see P0-1).
- **P2-5** Em-dash in visible copy, FIXED. 19 occurrences in `id.ts`, 18 in `en.ts`, replaced with commas which read naturally in both languages. All remaining em-dashes in `src` are code comments.
- **P2-6** `/library` empty-ish state: 4 date rows and a bare "Tulis entri baru" text link — no explanation of what the archive is for.
- **P2-7** FIXED. Deleted `tailwind.config.js` and `tailwind.config.d.ts`. The `.js` was genuinely stale (missing the five `cat-*` tokens the app depends on) and the `.d.ts` was its generated shadow; `tailwind.config.ts` is the single source of truth. No residual references.

### Also observed, not yet prioritised
- **Card padding is arbitrary:** `p-4` in 14 files (TodayScreen 12), `p-5` in 13 files, `p-6` in 5. `ui.tsx` itself mixes `p-4`/`p-5`/`p-6` across Card, Card `large`, Textarea, ChoiceCard, CalmAlert, CalmDialog, SeasonPreviewCard.
- **Only 9 files scale type at a breakpoint.** Zero scale-up in JournalNotebook (17 tiny sizes), FocusSession (15), TodayScreen.components (12), FocusScreen (10), JournalEntryScreen (10), GoalBlueprintModal (10). Combined with P1-1, no text grows on desktop.
- **`ChoiceButton` (`WeekScreen.tsx:665`) duplicates `ChoiceChip` (`ui.tsx`)**, and `Section` (`LibraryScreen.tsx:92`) duplicates `SectionHeader` (`ui.tsx`).
- **`FocusSession.tsx` exports three components** (`FocusSessionPanel:115`, `FocusSessionSummary:360`, `FocusSessionStarter:428`) from a screen file rather than `components/`.
- **Interactive divs without role/tabIndex:** `NotebookImages.tsx:181`, `ZendoProModal.tsx:295` (both `onClick={stopPropagation}`).
- **aria-label coverage is thin where raw buttons are dense:** TodayScreen has 24 raw `<button>` and 5 `aria-label`.

---

## Verification plan

Re-run the same capture matrix after the pass and diff:
`375 / 390 / 768 / 1440 / 1920` × `today, focus, week, timeline, journal, learn, library, notebook, packs, seasons, settings, season-end`
plus the nav-occlusion measurement and the Tab-order focus-ring measurement.

### Harnesses (`tools/audit/`, dev server must be on `http://localhost:5173`)
| Script | Purpose |
|---|---|
| `node tools/audit/seed-demo.mjs` | Regenerates tools/audit/demo-state.json — a realistic mid-season state (active season, 3 goals, 2 bad habits, 32 focus sessions over 12 days, 6 time blocks today, 4 journal entries, 3 notebook entries, 23 timeline events). |
| `node tools/audit/capture-vp.mjs <tag> <screens> <viewports>` | Viewport screenshots → `audit/<tag>/`. Use this (not full-page) whenever a fixed element is in frame. |
| `node tools/audit/capture.mjs` | Full-page captures; reports `OVERFLOW docW>winW`. |
| `node tools/audit/measure-nav.mjs <tag>` | Per viewport/screen: nav top, and every non-nav interactive element sitting inside the nav band at rest. |
| `node tools/audit/shot-nav.mjs` | Screenshots the nav band of `/focus`, `/week`, `/learn` at 375/390 into `audit/nav/`, and prints the DOM ancestry of each blocked element. |
| `node tools/audit/measure-tail.mjs` | Checks the bottom-padding contract: `tailGap` (document height minus last content child) vs `main`'s computed `paddingBottom`. |

The seed serves via `public/_demo-state.json`; `page.evaluate` writes all **four** persist keys (`monk_mode_pwa_state_v1`, `focusSessions`, `learningSessions`, `timelineEvents`). Writing only the main key fails, because the app's persist adapter rewrites all four from in-memory state on boot (`useMonkStore.ts` hydrate / `recordOpen` / `getOrCreateCurrentWeeklyPlan`).

### Cleanup before ship
DONE. `public/_demo-state.json` deleted. Harnesses moved from `tmp/` to `tools/audit/` (still works, off the build path; `tmp/` is gone).
