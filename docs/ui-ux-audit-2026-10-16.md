# Zendo — UI/UX Audit & Brand-Consistency Pass

**Date:** 2026-10-16
**Method:** live runtime measurement (Playwright against the dev server at 390 × 844 and 1440 × 900), line-level code inspection, and the existing test suite (894 tests).
**Scope:** whole app — onboarding, Today, Focus, Week, Timeline, Journal, Notebook, Library, Packs, Seasons, Settings.

Every claim is tagged **[measured]** (observed at runtime), **[code]** (read in source), or **[assumed]** (inferred, not executed).

---

## A. What was already right (so "improvement" means the right thing)

The product is disciplined, and the previous audits had already fixed the load-bearing issues. Verified again in this pass:

- **Zero console errors** across all 12 captured routes. **[measured]**
- **Zero horizontal overflow** at 390 px and 1440 px. **[measured]**
- **Design tokens are consistent** — one `monk-*` token set, 6 themes, no stray hexes in screens. **[code]**
- **The palette, the anti-gamification stance, the 4-tab nav, and the focus timer** are all intact and were deliberately left alone. **[code]**
- **`MonkToggle` already carries a 44 × 44 hit area** with `-my-2.5` (a previous audit's fix). **[code]**

So this pass is a targeted correction pass, not a redesign. Two classes of defect were found: **localization gaps** (the app defaults to Indonesian, but several surfaces ignored that) and **touch targets** (a mobile-first PWA with controls below the WCAG 2.2 floor).

---

## B. Findings

### P0 — brand/UX: the app defaulted to Indonesian, but three surfaces were hardcoded English

**P0-1 · The Welcome screen was 100% hardcoded English. [code]**

`src/screens/WelcomeScreen.tsx` contained **no `useT()` call at all**. Every string was a literal: the headline ("Make space for what matters."), the subhead, the time estimate, "Begin", the auto-save note, "Already have a season?", "Sign in", "Restore a backup", the restore hint, the file-input `aria-label`, and both restore error messages.

`defaultData.ts` sets `language: "id"`, so a brand-new Indonesian user saw **an English first screen followed by Indonesian step 2**. The single most important screen for brand first-impression was the only one that ignored the language setting.

**P0-2 · The onboarding phase labels were hardcoded English. [code]**

`src/app/App.tsx:412-415` returned the literals `"Clear"`, `"Plan"`, `"Focus"`, `"Review"`. These render in the step progress header on **every** onboarding step — e.g. `Plan · Langkah 3 dari 6`. Notably the app *does* translate this vocabulary elsewhere (`onboarding.preview.step1Label` is "Plan"/"Rencanakan"), so the header was inconsistent with the app's own convention.

**P0-3 · `<html lang>` was never synced to the selected language. [code]**

`index.html` shipped `lang="en"` and nothing ever updated it — the theme was applied to `documentElement` (`App.tsx:61-67`) but the language was not. A screen reader on an Indonesian page was told the page was English; so were browser translation prompts and hyphenation.

### P1 — accessibility: controls below the WCAG 2.2 target minimum

**P1-1 · 14 interactive controls rendered below the 24 × 24 px minimum (SC 2.5.8), and 105 below the 44 px recommendation. [measured]**

Measured live on 10 routes at 390 px. The hard failures (< 24 px):

| Route | Control | Measured |
|---|---|---|
| /today | "Ubah Why" (WhyStrip) | 47 × 16 |
| /today | "Ubah" (Main Action edit) | 34 × 20 |
| /notebook | category filter chip label | 82 × 16 |
| /notebook | category options (⋯) | 20 × 20 |
| /notebook | category picker chip label | 99 × 16 |
| /notebook | category picker options (⋯) | 16 × 16 |
| /timeline | delete activity (×2) | 20 × 20 |
| /focus | ambient volume slider | 173 × 6 |
| /timeline | `.ICS` export | 34 × 22 |

This is the app's single largest remaining accessibility gap, and it matters more here than in most products because Zendo is explicitly **mobile-first**.

### P2 — copy and semantics

**P2-1 · The weekly rhythm headline said "days" but the number was sessions. [code]**

`WeekScreen.tsx:198` renders `stats.focusDone` / `stats.targetFocus` under the label `week.focusComplete` = "hari fokus selesai" / "focus days complete". But `targetFocus` comes from `computeWeeklyRhythm().focusAllocated`, which is the sum of `GoalAllocation.targetCount` — i.e. planned **sessions**, not days. A live screenshot read `15/15 hari fokus selesai` on a week with only 5 elapsed days. The label now matches the number's unit.

**P2-2 · A goal past its target rendered an improper fraction. [measured]**

`WeekScreen.tsx:533` printed the raw `completedCount/targetCount`, so a goal with 3 planned and 5 done read **`5/3`** beside a full bar and "Target Tercapai" — it reads like a data error. Doing more than planned is a bonus, not a malformed ratio.

**P2-3 · IBM Plex Mono was named in the design system but never loaded. [code]**

`design system.md` specifies IBM Plex Mono for "timer, countdown, and tabular data", and `tailwind.config.{js,ts}` map `font-mono` to it. `index.html` loaded Outfit, Caveat and Inter — **not IBM Plex Mono**. All **65** `font-mono` call sites fell back to a generic `monospace`, so timers and tabular figures rendered differently on every OS (Consolas on Windows, Menlo on macOS, DejaVu on Linux). **[measured — the network request list had no IBM Plex Mono]**

---

## C. Changes made

| # | Change | Files |
|---|---|---|
| 1 | Localized the Welcome screen: added 12 `welcome.*` keys to both catalogs and switched the component to `useT()` | `src/i18n/messages/{en,id}.ts`, `src/screens/WelcomeScreen.tsx` |
| 2 | Localized the onboarding phase labels: added `onboarding.phase.{clear,plan,focus,review}` and used them in `phaseForStep` | `src/i18n/messages/{en,id}.ts`, `src/app/App.tsx` |
| 3 | Synced `<html lang>` to the UI language; `index.html` now ships `lang="id"` (the app default) | `src/app/App.tsx`, `index.html` |
| 4 | Loaded IBM Plex Mono (400/500/600) so `font-mono` renders as designed | `index.html` |
| 5 | Corrected the rhythm label to `target fokus tercapai` / `focus target met` | `src/i18n/messages/{en,id}.ts` |
| 6 | Capped the goal fraction at target and surfaced the surplus as a `+N` bonus | `src/screens/WeekScreen.tsx` |
| 7 | Raised sub-44 px targets to a real hit area (see below) | 7 files |
| 8 | Global rule: `input[type="range"] { min-height: 44px }` — enlarges the whole clickable track without touching the browser's own thumb rendering | `src/styles/globals.css` |

Touch-target fixes (#7), all using the established `min-h-11` + negative-margin pattern so the visual rhythm is preserved:

- `WeekScreen.tsx` — "Ubah/Tambah why tujuan" (×2) and "Revisit why" links
- `TodayScreen.components.tsx` — `WhyStrip` edit links (×2) and the shared `focusLinkClass` / `focusLinkMutedClass`
- `SeasonWidgets.tsx` — `WhyStrip` edit link
- `JournalNotebook.tsx` — category filter chip label, category picker chip label, both `⋯` option buttons
- `TimelineScreen.tsx` — delete-activity button, the 4 view tabs
- `JournalPacks.tsx` — the "Mulai" primary CTA
- `SettingsScreen.tsx` — the 6 theme swatches, the ID/EN segmented control
- `DayTimeBlockVisualizer.tsx` — the `.ICS` export button

**Result [measured]:** controls below the WCAG 2.2 24 px minimum went **14 → 0**; controls below the 44 px recommendation went **105 → 63**. The remaining 63 are all ≥ 24 px and are concentrated in dense toolbars (the `Agenda`/`Grid Jam` toggle at 24 px, 32 × 40 px icon-only download buttons) where growing them would cost more in layout than it returns.

---

## D. Verification

- **Type-check:** `tsc -b --noEmit` clean. **[measured]**
- **Tests:** 894 passing / 84 files. **[measured]**
  - `src/screens/welcomeRecovery.test.tsx` was pinned to the literals `"Sign in"` / `"Restore a backup"`. It now reads the copy through `t()`, so it can never again lock in a hardcoded-English surface.
- **Runtime:** `lang` correctly reports `id` by default and `en` after switching; the onboarding header reads `Rencanakan · Langkah 3 dari 6`; no console errors; no horizontal overflow at 390 px or 1440 px. **[measured]**
- **Screenshots:** `audit/uiux-before/` (baseline) vs `audit/uiux-after/` (post-change), plus high-DPI crops in `audit/zoom/`. **[measured]**

---

## E. Deliberately not changed

- **The palette, the 6 themes, the 4-tab nav, the focus timer, the anti-gamification stance.** Nothing in this pass justified touching them.
- **The 63 remaining sub-44 px controls.** They meet the 24 px floor; the ones left are dense-toolbar and icon-only controls where the fix would cost more layout than it returns. Listed here so the decision is explicit rather than accidental.
- **The rhythm card's numerator.** `focusDone` is `Math.max(completedDays, completedSessions, focusDays)` while `targetFocus` is planned sessions — the two can be different units. Only the *label* was corrected; changing the number is a product decision with real data implications, so it is flagged rather than changed.
- **Desktop framing.** The app is a 480 px column on wide screens. That is a documented, intentional mobile-first choice, not a defect.

---

## F. Reproduce

```bash
node tools/audit/capture-fresh.mjs uiux-after   # screenshots, today-anchored seed
node tools/audit/touch-audit.mjs                # WCAG 2.2 target-size sweep
node tools/audit/slice.mjs settings slices       # viewport slices of a tall page
node tools/audit/zoom.mjs week zoom 120 620      # 2x crop of a region
```
