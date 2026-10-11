# Zendo — UI/UX Audit, Product Simplification & Design System Refinement

**Date:** 2026-10-11
**Branch:** `feat/onboarding-mental-model`
**Method:** code inspection (line-level), live runtime measurement via Playwright against the dev server, and the existing test suite. Every claim below is tagged **[tested]** (observed directly) or **[assumed]** (inferred, not executed).

---

## A. Phase One — What the product actually is

| Dimension | Finding |
|---|---|
| Routes | 23, declared in `src/constants/routes.ts`; onboarding is a separate 7-step order |
| Persistent navigation | **4 tabs** — `BottomNav` at `src/components/ui.tsx:674` (`grid-cols-4`, `h-[58px]`, `aria-current="page"`) |
| Screens | 15 in `src/screens/` |
| Components | 28 in `src/components/` |
| Source files | 176 |
| State | One Zustand store, `src/store/useMonkStore.ts` — **3367 lines** |
| Tests | 836 passing / 79 files |
| i18n | `src/i18n/messages/{en,id}.ts` — 1604 keys each, **parity 1604/1604 [tested]** |
| Stack | React 18 + TS + Vite + Zustand 5 + Tailwind + react-router 7 + framer-motion + lucide-react + date-fns + Supabase |

**The product is already disciplined.** This is the single most important audit finding, and it changes what "improvement" means here.

Already correct, verified:

- **No emoji in the shipped UI. [tested — grep of `src/screens/` and `src/components/`: zero hits; the one match is a test fixture]**
- **No guilt vocabulary.** No "failed", no "streak broken", no "you missed" as an accusation. **[tested]**
- **No horizontal overflow** at 320 px and 390 px on `/today`, `/week`, `/timeline`, `/journal`, `/settings`, `/focus`. **[tested]**
- **Zero console errors** across those screens. **[tested]**
- **Zero unlabeled buttons** on `/settings` and `/timeline`; every icon-only control carries `aria-label`. **[tested]**
- **One name per concept** — `src/i18n/catalog.test.ts` passes on all 15 tracked concepts. **[tested]**
- **Evidence outranks the schedule.** `resolveDayOutcome` (`src/lib/dailyActivity.ts:98-116`) already encodes exactly the precedence the spec asks for: relapse → session evidence → plan. A day planned as Rest that produced a focus session resolves to a focus outcome. **[tested — unit-covered]**
- **The focus timer cannot drift.** Elapsed time is derived from timestamps inside a dedicated Web Worker (`focusTicker.worker.ts`), immune to hidden-tab throttling. **[tested]**

So the correct move is **not** a redesign. It is a small number of targeted corrections where the code contradicts its own stated rules, plus removal of surface duplicated across screens.

---

## B. Prioritized findings

### P0 — correctness and trust

**P0-1 · A Focus session can be classified as Rest via a stale plan status. [tested]**

`src/lib/dailyActivity.ts:53-87`. The order in `getDailyStatusForDate` is correct — resolver first, `day?.status` only as a fallback. But two real holes remain:

1. `resolveDayOutcome` (line 111) checks `plan?.dayType === "rest" || plan?.status === "rest"` **before** `plan?.status === "completed"`. A `DayPlan` can legitimately carry `dayType: "goal"` with `status: "rest"` after a rest toggle, while real focus evidence exists. The evidence branch above it covers this — *if* a session record exists.
2. `src/screens/TimelineScreen.tsx:875-878` re-derives `isRest` locally instead of calling the shared resolver. WeekScreen was already converted (`src/screens/WeekScreen.tsx:72-79`); Timeline was not. **This is the concrete form of the spec's warning**: the same date can be Rest on one screen and completed on another.

**P0-2 · A day can be marked completed on a 15-minute threshold that exists nowhere else. [tested]**

`src/store/useMonkStore.ts:2273`:

```ts
status: (summary.focusDurationMinutes >= 15 || timelineStatus === "completed") ? ("completed" as const) : plan.status,
```

Beyond the threshold, this **writes a schedule-derived verdict back into the plan**, so the plan silently becomes the evidence for every later read. The threshold is duplicated as the literal `15 * 60` at `WeekScreen.tsx:89`. Two independent numbers, one meaning.

**P0-3 · The day's Main Action can silently revert to a Goal-level keystone. [tested]**

`src/store/useMonkStore.ts:1408` falls back to `goal?.keystoneAction` when `input.mainAction` is undefined. `setDayMainAction` at `:1550-1568` carries an explicit comment forbidding exactly that fallback. **The store states the rule in one action and breaks it in another.** This is the spec's Section 6 complaint ("must not remain tied to an outdated Goal-level Main Action"), verbatim, in code.

**P0-4 · Persistence is not atomic. [tested]**

`useMonkStore.ts:3347-3356` writes the main key then three satellite keys with no transaction. `storage.ts:115-133` lets a satellite key **unconditionally override** the main blob on read. A write interrupted between line 3352 and 3355 leaves the satellites holding the *previous* snapshot, and on next load they win — the newest sessions disappear. This is the same loss class commit `6a45ce4` fixed for planning; the satellite keys reintroduce it for sessions.

### P1 — core experience

**P1-1 · Week rhythm: "4 terlewat · 4 belum ditangani" overstates failure. [tested]**

`WeekScreen.tsx:79-80`:

```ts
const missed = statuses.filter((s) => s === "missed" || s === "relapse").length;
const unhandled = plans.filter((p, i) => !p && weekDates[i] < today).length;
```

`missed` counts only **elapsed** days — correct. But `unhandled` counts days with no plan that are earlier than today, which includes days the user never intended to plan. Rendering both adjacently reads as eight failures. Also, `statuses` are computed over the **whole week** while `missed` is compared against `today`, so the label and the number are computed from different populations.

**P1-2 · The rhythm card is a bare `0/0` on a young season. [tested]**

`WeekScreen.tsx:157-162` renders `{stats.focusDone}/{stats.targetFocus}` where `targetFocus = rhythm.focusAllocated`. With no allocation, this is literally **`0/0`** with the caption `week.focusComplete` — a divide-by-zero rendered as a grade. Per Section 10, Focus completion and days accounted for must be separate ideas; today they are one number with no denominator guard.

**P1-3 · The weekly review can silently drop reflection and energy. [tested]**

`WeekScreen.tsx:598-599` submits `reviewWeek(weeklyPlan.id, decisions)` inline, while the review modal collects reflection and energy. The inline path writes a review with those fields empty and `useMonkStore.ts:2808-2821` stores `weeklyReviews[weekId]` **before** the `if (sameDecisions) return;` guard at `:2823`.

**P1-4 · Settings and Timeline fail WCAG 2.2 target size. [tested — measured live]**

24 of 27 interactive controls on `/settings` render below 44 px; the worst is `MonkToggle` at `h-6` (**24 px**), affecting 3 instances (`SettingsScreen.tsx:406`, `:455`, `:465`). Also `!min-h-7` (28 px) at `:424`, `:429`, `:448`; `!min-h-8` (32 px) at `:586`, `:592`. Seven failures on `/timeline`. WCAG 2.2 SC 2.5.8 requires 24 px *minimum* with 44 px recommended; these are below even the floor for the toggle.

**P1-5 · One instruction repeated three times in the Focus empty state. [tested]**

The same "start" instruction renders three times in the `/focus` empty state. Repetition reads as pressure, which is the opposite of the stated tone.

**P1-6 · Timeline renders the same statistics twice. [tested]**

`TimelineScreen.tsx:1314-1315` renders both `TimelineStats` (71-147) and `DayCountsCard` (156-217), which overlap in what they count.

**P1-7 · Copy leaks hardcoded English and hardcoded Indonesian. [tested — 13 non-`t()` user-visible strings across 6 files]**

| File:line | Literal | Severity |
|---|---|---|
| `src/screens/OnboardingSteps.tsx:769` | `Tomorrow's Focus` | P1 |
| `src/screens/WeekScreen.tsx:643` | `Wins: ` | P1 |
| `src/components/DayTimeBlockVisualizer.tsx:233,246` | `Agenda`, `Ruler` | P1 |
| `src/components/FocusPrepModal.tsx:361` | `placeholder="Define your single priority task..."` | P1 |
| `src/components/FocusPrepModal.tsx:176` | `aria-label="Close"` | P1 |
| `src/components/FocusPrepModal.tsx:219` | `title="Reset 5m"` | P2 |
| `src/components/DayTimeBlockVisualizer.tsx:230,243` | `title="Tampilan Agenda"`, `title="Tampilan Grid Jam"` | P2 |
| `src/components/GoalBlueprintModal.tsx:500` | `aria-label="Close"` | P2 |
| `src/components/ZendoProModal.tsx:193` | `alt="QRIS Resmi Ardi Wiryawan - Zendo"` | P2 |
| `src/components/ZendoProModal.tsx:149,299` | `aria-label` / `placeholder` | P2 |
| `src/screens/SettingsScreen.tsx:423` | `aria-label="Uji Pengingat"` | P2 |

`OnboardingSteps.tsx:769` and `WeekScreen.tsx:643` are the worst: they are **body copy**, not accessibility attributes, so an Indonesian user reads English mid-sentence. Note the inverse leak too — `DayTimeBlockVisualizer` and `SettingsScreen` are English-first screens carrying hardcoded Indonesian.

### P2 — refinement

- **154 of 1604 i18n keys are unreferenced [tested]** — including the entire `blueprint` namespace (38 keys) and `drawing` (3). Method: read every key from `en.ts`, search all non-message `src/**/*.{ts,tsx}` for it, then re-add those reached only through a template literal (`t(\`rest.energy.${x}\`)` — 90 keys). The first pass reported 244 and a still-cruder pass reported 219; both were wrong, and the corrected number is 154.
- The `CUSTOM_CATEGORY_TOKENS` comment at `JournalNotebook.tsx:341-343` describes a set that does not match the array beside it.
- `docs/` holds phase-specific audit files; there was no single current product-audit document. This file is it.
- The 154 unreferenced i18n keys are **not** deleted in this pass. Deleting copy is a one-way door and several sit beside keys that are live; the count is reported so the decision is made deliberately rather than by a tool.

---

## C. Deliberately not changed

- **The palette.** Phase A already resolved this: the spec's proposed hexes (`#D97757` etc.) are *cosmetically* close to the existing `--color-cat-*` tokens but replacing them would flatten the 6-theme system, which is a genuine product asset. Existing tokens retained. **[tested — the 6 themes still re-tint correctly]**
- **Gold usage.** Audited; gold is not applied to every button, heading, border, badge and selected state. No change justified.
- **The 15-minute rule as a concept.** Only its duplication and its write-back are fixed — a rest day toggled on and off again should not be permanently poisoned by it.
- **No new scores, no new streaks.** Section 14 forbids them and nothing in this audit demonstrates a need.
- **The focus timer.** Already correct, in a worker, timestamp-derived. Untouched.

---

## D. Assumptions, stated plainly

- **[assumed]** The 15-minute threshold is not a documented product commitment — no constant, no i18n key, no test names it. Treated as an accidental literal.
- **[assumed]** `unhandled` in WeekScreen is intended to count unplanned past days; the fix preserves that meaning while stopping it from reading as failure.
- **[assumed]** `JournalNotebook` categories are user-authored free-form data, **not** `TimeBlockCategory` values — so their hash-bucket fallback is a different mechanism from `resolveActivityCategory` and is **not** a defect. The earlier audit flagged this as a mismatch; that flag is **withdrawn** after reading `CATEGORY_TOKEN` (`JournalNotebook.tsx:237-247`).
- **Not verified:** any external calendar application's rendering of the exported `.ics`. See `docs/ics-color-audit.md` §D.
