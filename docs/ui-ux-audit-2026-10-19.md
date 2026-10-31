# Zendo — Deep UI/UX Audit & Improvement Pass

**Date:** 2026-10-19
**Method:** live runtime probes (Playwright at 390 × 844 and 1440 × 900), 11 routes, all six themes, source inspection, and the test suite (930 tests).
**Scope:** every screen — onboarding, Today, Focus, Week, Timeline, Journal, Notebook, Library, Packs, Seasons, Season end, Settings, Guide.

Every claim is tagged **[measured]** (observed at runtime), **[code]** (read in source), or **[assumed]**.

---

## A. Design read (so "improvement" means the right thing)

Zendo is a **mobile-first, dark-only, single-column** calm-focus PWA. Three constraints were treated as product decisions, not defects:

- **The 480px column is intentional and test-enforced.** `src/components/desktopResponsive.test.ts` fails the build if any `lg:`/`xl:` utility appears in the shell or in Today/Week/Timeline. This pass therefore did **not** add a desktop tier. (The trade-off is real: at 1440px, ~66% of the viewport is empty. That is a product decision to revisit deliberately, not by sneaking in breakpoints.)
- **The floating glass nav overlaps mid-page content by design.** `AppShell` already draws a 186px page-background fade and hides the pill on scroll-down. Full-page screenshots exaggerate this (fixed elements are painted once at the y-offset of the viewport); it is not a layout bug.
- **The palette, 6 themes, anti-gamification stance, and 4-tab IA** were left alone.

---

## B. What was already right (verified, not changed)

- Zero console errors, zero horizontal overflow, zero controls below the 24px WCAG floor on all 11 routes. **[measured]**
- Focus rings exist on every tab stop; modals trap focus and close on Escape. **[measured]**
- One token set, six themes, one icon family, one type pairing. **[code]**
- Disabled/secondary/ghost primitives already shared. **[code]**

So this is a **legibility and hierarchy pass**, not a redesign.

---

## C. Findings

### P0-1 · 47 text/background pairs failed WCAG AA at 390px **[measured]**

Not one bug — a pattern. Opacity was being used as the hierarchy tool on a near-black UI:

| Route | Failing text | Ratio | Cause |
|---|---|---|---|
| /week | off-week day numbers (`29 21 22…`) | **1.78:1** | `text-monk-text-soft/40` |
| /week | "7 hari lagi" | 2.79:1 | `text-monk-muted/60` |
| /week | "Irama minggu", "1 istirahat" | 4.14:1 | `text-monk-muted/80` |
| /settings | section labels, footer | 2.27–4.14:1 | `muted/50`, `muted/80` |
| /library | "( 8 )" counts, "Refleksi" tags | 4.06–4.14:1 | `muted/80`, `success` token |
| /today | "Selesai" badge | **3.68:1** | `--color-success` used as text |
| /week | "istirahat" | **3.23:1** | `--color-rest` used as text |

Two distinct causes: **opacity modifiers on text** (~80 call sites) and **semantic tokens designed as fills but used as foreground**. `--color-success` and `--color-rest` are fills in their soft-badge context; as text they measured 4.06:1 and 3.28:1.

### P0-2 · The primary action on /focus sat behind the bottom nav **[measured]**

`Mulai Deep Work` measured **y 831–879** while the nav pill starts at **y 774** — the app's core action was completely covered at rest. Cause: the ambient-sound mixer (a secondary control, ~200px tall) was rendered first, pushing the session starter below the fold.

### P1-1 · 98 elements rendered below 11px, 10 of them at 9px **[measured]**

315 arbitrary `text-[10px]` / `text-[9px]` declarations across 27 files. Worst offenders were the labels users need most: week-day names, filter chips, status tags, "Ubah Why" links.

### P1-2 · Every onboarding step drew a gold box around its heading **[measured]**

The step heading is focused programmatically for screen readers (`tabIndex={-1}`). The global ring rule (`[tabindex]:focus-visible:focus-visible`, specificity 0-2-1) beat the component's `focus:outline-none` (0-2-0), so plain text rendered inside a gold input-like rectangle on all six steps.

### P1-3 · The first-run screen was half English **[code]**

`patternOptions` in `constants/defaultData.ts` hardcoded `Doom scrolling`, `Gaming`, `Random YouTube`, `Too much chatting`, `Shopping impulse`, `Other` — under an Indonesian title ("Apa yang biasanya menarikmu menjauh?"). Worse: `togglePattern(category, habit.label)` **stores** that label, so the English string propagated into Week, Timeline and the rest of the app.

### P1-4 · The season-ending reflection silently discarded everything **[code]**

`SeasonEndScreen` kept answers in `useState` only — no store write, no draft. Navigating away or closing the tab lost the whole reflection. The screen also opened on **five blank textareas** (no recap of the season), and the decision buttons sat **1,131px** down the page.

### P1-5 · A disabled primary still looked like the primary **[measured]**

`disabled:opacity-40` on a gold gradient left "Simpan refleksi" as the most visually prominent element on /journal while it did nothing.

### P2 — polish

| # | Finding | Evidence |
|---|---|---|
| P2-1 | Archived season with no data printed `Waktu Fokus: 0m · 0 sesi` | [measured] |
| P2-2 | Notebook printed "Notebook" twice within 100px (page title + binder cover), and the binder title was a `<p>` so the page had no `h1` | [measured] |
| P2-3 | Theme picker: six 16px accent-only dots — Dark Monk and Wabi-Sabi were indistinguishable | [measured] |
| P2-4 | "HARI INI" wrapped to two lines in the 43px week column, knocking the energy dot out of alignment | [measured] |
| P2-5 | Notebook cover overflowed 320px viewports by 18px | [measured] |
| P2-6 | Soundscape description truncated mid-sentence (147px hidden) | [measured] |

### Flagged, not changed

- **Packs content is entirely English** (22 packs: titles, descriptions, questions) in an Indonesian-default app, and the list is a 3,887px single column with no grouping or filter. This is editorial work, not a CSS fix.
- **Guide is one undivided document** (~8 sections, no index). A section index/sticky TOC is the right next step.
- **Desktop column** — intentional (see §A).

---

## D. Changes made

| # | Change | Files |
|---|---|---|
| 1 | Raised `--color-success` / `--color-rest` in **all six themes** so they clear 4.5:1 on surface *and* on their own soft fill (min 4.92:1 measured) | `src/styles/globals.css` |
| 2 | Removed every text opacity modifier below 80%: `/80` → token, `/70`–`/40` → `text-monk-text-soft`, `/50`–`/40` on `text-soft` → token | 27 `.tsx` files |
| 3 | Raised the type floor: all `text-[9px]` → 10px, all `text-[10px]` → 11px (10px now exists only on short uppercase badges) | 27 `.tsx` files |
| 4 | Reordered /focus: action card → session starter → **then** the sound mixer, so "Mulai Deep Work" is above the nav; during a live session the compact mixer stays on top | `src/screens/FocusScreen.tsx` |
| 5 | Onboarding focus ring: excluded `tabindex="-1"` targets from the global ring rule | `src/styles/globals.css` |
| 6 | Localized the 8 pattern chips and write the localized label into the habit | `src/i18n/messages/{id,en}.ts`, `src/screens/OnboardingSteps.tsx` |
| 7 | Season end: added a "Yang kamu bangun" recap (days, focus time, sessions, goals), merged 5 question cards into one reflection sheet with 84px fields, and **autosaved the draft per season** to `localStorage` with a "Tersimpan" indicator | `src/screens/SeasonEndScreen.tsx`, both catalogs |
| 8 | Disabled primary buttons now read as unavailable (neutral fill, no gradient, 4.97:1 text) instead of dimmed gold | `src/components/ui.tsx`, `src/styles/globals.css` |
| 9 | Archived season: focus metric only renders when there is data | `src/screens/ArchiveScreen.tsx` |
| 10 | Notebook: single title (binder cover is now the `h1`), one-line description above it, cover header wraps instead of overflowing at 320px | `src/screens/LibraryScreen.tsx`, `src/screens/JournalNotebook.tsx`, `globals.css` |
| 11 | Theme swatches are now two-tone (palette background + accent centre) and 22px | `src/screens/SettingsScreen.tsx` |
| 12 | Week calendar: "HARI INI" only renders where it fits; today's cell exposes `aria-current="date"` | `src/screens/WeekScreen.tsx` |
| 13 | Soundscape description wraps to two lines instead of truncating | `src/screens/FocusScreen.tsx` |
| 14 | New guard: `contrastTokens.test.ts` recomputes AA for success/rest in every theme and fails on any new `text-[9px]` or sub-80% text opacity | `src/styles/contrastTokens.test.ts` |

---

## E. Verification **[measured]**

| Metric | Before | After |
|---|---|---|
| Text/background pairs below WCAG AA (390px, 11 routes) | **47** | **0** |
| Elements below 11px | **98** | **9** (all 10px uppercase badges) |
| Elements below 10px | **10** | **0** |
| Semantic text contrast, worst of 6 themes | 3.23:1 | **4.92:1** |
| `Mulai Deep Work` position vs nav top (774) | 831–879 (hidden) | **685–733** (clear) |
| Horizontal overflow at 320px (/notebook) | 18px | **0px** |
| Controls below 24×24 | 0 | 0 |
| Tests / build | 915 pass | **930 pass**, build clean |

Screenshots: `audit/deep-audit-before/` vs `audit/deep-audit-after/`, onboarding in `audit/deep-onboard/`.
Probes: `node tools/audit/deep-audit.mjs`, `node tools/audit/deep-audit2.mjs`, `node tools/audit/overflow.mjs`.

---

## F. Recommended next (not in this pass)

1. **Translate the 22 packs** and group them by intent (morning / evening / deep work / identity) with a filter — the library is the largest surface with no navigation aid.
2. **Guide TOC** — 8 sections, no index, no deep links.
3. **Season end**: move the decision buttons into a sticky footer once the reflection is scrolled past; they are still ~1,100px down.
4. **Revisit the desktop decision** deliberately: a 480px column at 1440px is a product choice, but a two-pane layout (Today + context) was already prototyped once and reverted — worth deciding with data rather than by test enforcement alone.
