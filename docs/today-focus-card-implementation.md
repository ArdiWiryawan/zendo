# Today Focus Card — Implementation Brief (locked)

Synthesis of 3 independent design directions (RHYTHM / SIGNAL / REST-FIRST) scored by a
2-judge panel (product-law lens + engineering-risk lens) against 21 hard constraints.

**Base direction: RHYTHM** (spacing + type scale; no new visual devices).
**Grafts:** 4 hunks from SIGNAL, 3 from REST-FIRST, per the table in §11.
**Rejected:** SIGNAL's rail + kurogane theme override + `scroll-mt-24`; REST-FIRST's
interactive rest button + `primaryKind` state table.

Scope: **polish visual + fix findings**. Theme scope: **all 6 must render correctly**.
Indonesian is the default language — every string change lands in BOTH `id.ts` and `en.ts`.

---

## 0. Hard constraints — do not break

Each has a rationale comment in the code. Read the comment before touching the line.

| Line | Constraint |
|---|---|
| 794-795 | The ⋯ popover stays OUTSIDE the `overflow-hidden` card box. |
| 1060-1062 | `#today-card-details` stays in the DOM when closed (`hidden`, never conditional render) or `aria-controls` dangles. |
| 410-412 / 748-749 | `cardDetailsOpen` is deliberately NOT persisted. |
| 839-840 | The identity line stays ONE line (`truncate`). |
| 848-850 | The action block is flat — NOT a card-in-card. |
| 873 / 981-986 | (§22) The action edit form prefills from the DAY's action only; the keystone is a labelled *suggestion*, never auto-applied. |
| 1028-1029 | Exactly ONE dominant control on the card. |
| 1069 | (§24) The next-action prompt must not create anything on its own. |
| 1149-1151 | The checklist stays visible after completion. |
| globals.css 313-330 | The doubled-pseudo `focus-visible` outline must not be removed. |
| — | Keep every `aria-*` and every `t()` call. |

**Product law:** no streaks/XP/points/badges/leaderboards/confetti/trophies/rockets; no
guilt/shame/urgency/exclamation marks; feedback signals **competence, never score**; rest
days are first-class (protection, not pressure); motion 150-250ms only.

---

## 1. T1 — define the phantom easing

**`tailwind.config.ts`**, inside `theme.extend`, after the `boxShadow` key.

Before: no `transitionTimingFunction` key exists.

After:
```ts
      transitionTimingFunction: {
        monk: "cubic-bezier(0.22, 1, 0.36, 1)"
      }
```

`ease-monk` is referenced **11 times across 4 files** (`ui.tsx` ×5, `TodayScreen.tsx` ×3,
`FocusScreen.tsx`, `PracticesCard.tsx`) but was never defined, so every one of those
transitions silently used Tailwind's default `cubic-bezier(0.4, 0, 0.2, 1)`. This is the
curve `.page-enter` already animates with (globals.css:346). Existing `duration-*` values
already sit inside the 150-250ms law; this fixes only the shape of the handoff.

---

## 2. T2 — kill the hardcoded brass

Three literals are brass while 5 of 6 themes have a different accent hue.

Token truth (accent triplet per theme):

| theme | accent | reads as |
|---|---|---|
| `dark` (:root) | `164 139 94` | brass |
| `sumi_ink` | `125 155 178` | slate blue |
| `kyoto_moss` | `110 155 123` | moss |
| `wabi_sabi` | `194 155 104` | warm ochre |
| `kurogane` | `176 176 176` | neutral silver |
| `temple_gold` | `212 175 55` | gold |

**`color-mix()` requires TWO colour arguments.** An incomplete `color-mix()` drops the
entire declaration silently — on a `box-shadow` that removes the whole shadow, with no
build error. Every replacement below carries an explicit `transparent` stop.

### 2a — card inset sheen, `TodayScreen.tsx:743`

Before: `shadow-[inset_0_1px_0_rgba(212,163,89,0.12)]`
After: `shadow-[inset_0_1px_0_rgb(var(--color-accent)/0.12)]`

Inside a Tailwind *arbitrary* value this is raw CSS, so the triplet `var()` resolves
natively — the "must wrap in `rgb(... / <alpha>)`" rule applies to the `monk-*` colour
*utilities*, not here. Re-hues per theme. 0.12 matches today's alpha, so `dark` is
visually unchanged.

### 2b — `.monk-depth-raised` sheen, `globals.css:388`

Before:
```css
  background-image: linear-gradient(180deg, rgba(164, 139, 94, 0.05), transparent 46%);
```
After:
```css
  background-image: linear-gradient(180deg, color-mix(in srgb, rgb(var(--color-accent)) 5%, transparent), transparent 46%);
```

### 2c — `.monk-btn-primary` glow, `globals.css:400`, `:405`, `:410`

Before:
```css
    0 6px 18px -6px rgba(164, 139, 94, 0.45);   /* :400 */
    0 8px 22px -6px rgba(164, 139, 94, 0.6);    /* :405 */
    0 3px 10px -6px rgba(164, 139, 94, 0.4);    /* :410 */
```
After:
```css
    0 6px 18px -6px color-mix(in srgb, rgb(var(--color-accent)) 45%, transparent);
    0 8px 22px -6px color-mix(in srgb, rgb(var(--color-accent)) 60%, transparent);
    0 3px 10px -6px color-mix(in srgb, rgb(var(--color-accent)) 40%, transparent);
```

The primary CTA is `bg-monk-accent`; its glow must be the same hue as its fill. Today a
`sumi_ink` user gets a slate button with a brass halo. Precedent for the syntax already
ships at `globals.css:368` (`.monk-glass`) and `:397` (`.monk-btn-primary` background).

### 2d — `ui.tsx:461` (ProgressBar glow)

Before: `shadow-[0_0_8px_rgba(164,139,94,0.45)]`
After: `shadow-[0_0_8px_rgb(var(--color-accent)/0.45)]`

Same brass leak, one line, arbitrary-value form (no `color-mix` needed — a plain alpha
suffix carries the intent).

---

## 3. T3 — take the count off the hero

`TodayScreen.tsx:1186-1189`. The hero renders `{done}/{target} hari…` whenever `allocation`
is truthy — a **score** on the card whose job is competence, and it can read `6/5` (120%).

Before:
```jsx
                  {allocation ? (
                    <span className="font-medium text-monk-text-soft">
                      {t("today.daysOnGoal", { done: allocation.completedCount, target: allocation.targetCount })}
                    </span>
                  ) : (
                    <span>{isRest ? t("today.protectRecovery") : t("today.stayWithOne")}</span>
                  )}
```
After:
```jsx
                  <span>{isRest ? t("today.protectRecovery") : t("today.stayWithOne")}</span>
```

**Then delete the now-unused singular `allocation`** at `TodayScreen.tsx:492-494`:
```ts
  const allocation = todayPlan?.goalId && weeklyPlan
    ? allocations.find((a) => a.goalId === todayPlan.goalId)
    : undefined;
```
`allocations` (plural, line 432) is still consumed at 446-447, so it stays. But `allocation`
(singular) had exactly one consumer — line 1186. **`tsconfig.app.json` has no
`noUnusedLocals`, so `vite build` will pass with the dead variable** — it must be deleted
deliberately, not left for the compiler to catch.

`today.daysOnGoal` becomes unused: **keep the key in both catalogs** (do not delete — the
repo's i18n parity tests are explicit, and a future surface may re-home it).

---

## 4. T10 — the ⋯ menu, and the Release it silences

`TodayScreen.tsx:775-792` (trigger) + `796-827` (popover) + the rationale comment `794-795`.

**Delete all three.** The menu carries goal/season-level verbs (Blueprint, Release) into a
*day* card. With it deleted, the card's controls reduce to: the one CTA, the details
toggle, and a soft "add intention" link.

Also removed: `cardMenuOpen` state (~line 414), `setCardMenuOpen` (786, 806, 818), the
`MoreHorizontal` import (line 4 — verify it has no other use in this file before removing),
`aria-label={t("today.cardMenuLabel")}`, `aria-expanded`, `aria-controls="today-card-menu"`,
`aria-haspopup="menu"`. The ARIA triple goes as a matched set — no dangling reference.

### The mandatory graft

`releaseOpen` / `releaseNote` / `setReleaseOpen` / `releaseGoalFromSeason` and the
`CalmDialog` at `1565-1590` stay mounted. **`setReleaseOpen(true)` at line 820 is the ONLY
trigger in the entire app** — `WeeklyReviewModal`'s release is a different, separately-gated
flow (`isOpen && targetWeeklyPlan`). Deleting the menu without a replacement silently removes
a destructive-but-legitimate ritual.

So **relocate** both actions into `#today-card-details`, after the details region opens
(insert near `TodayScreen.tsx:1063`):

```jsx
                {goal ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-monk-text-soft transition duration-150 ease-monk hover:bg-monk-soft hover:text-monk-accent"
                      onClick={() => {
                        hapticPress("light");
                        setBlueprintGoalId(goal.id);
                      }}
                    >
                      <Sparkles size={14} className="shrink-0 text-monk-accent" />
                      <span>{t("blueprint.openButton")}</span>
                    </button>
                    <button
                      type="button"
                      className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-monk-text-soft transition duration-150 ease-monk hover:bg-monk-soft hover:text-monk-text"
                      onClick={() => {
                        hapticPress("light");
                        setReleaseNote("");
                        setReleaseOpen(true);
                      }}
                    >
                      <Moon size={14} className="shrink-0 text-monk-muted" />
                      <span>{t("release.triggerLabel")}</span>
                    </button>
                  </div>
                ) : null}
```

`hidden` (not conditional render) already removes these from the tab order and a11y tree
correctly when the region is collapsed.

---

## 5. T11 — the rest day must not offer a completion

`TodayScreen.tsx:1030`. The CTA has no `isRest` guard, so a rest day renders a
task-completion button — a direct product-law break.

Before:
```jsx
                {!editingAction ? (
```
After:
```jsx
                {!editingAction && !isRest ? (
```

**Rest renders NO control.** Not a panel, not a recovery button. Rest already has its own
body copy — `today.plan.highlight` via `today.restRenewal.chosenRest`, else
`today.rechargeNote` ("Isi ulang tanpa meninggalkan arahmu") — and its own meta line
(`today.protectRecovery`). Protection is *shown and worded*, not operated: any control in
that slot re-teaches the card as "press the button", and a full-width soft-coloured panel
is the most button-shaped object on the card.

Do **not** wire a rest CTA to `setWeeklyReviewModalOpen(true)`: `FeelGoodRestCanvas`
already renders `rest.reviewCta` on the same screen (`TodayScreen.tsx:1279`), and
`WeeklyReviewModal` early-returns without `targetWeeklyPlan` — a button that can silently
do nothing, which `seasonGoalReachability.test.ts:26-28` exists to prevent.

---

## 6. T7 (graft) — close the partial-state colour gap

`TodayScreen.tsx:542-548`. `statusLabel` already handles `partial` (line 538-539) and the
pill icon already branches on it (770-771), but the pill *colour* falls through to the
generic idle grey.

Before:
```ts
    : isRest
    ? "border-monk-rest/30 bg-monk-rest-soft text-monk-rest"
    : "border-monk-border bg-monk-soft text-monk-muted";
```
After:
```ts
    : isRest
    ? "border-monk-rest/30 bg-monk-rest-soft text-monk-rest"
    : todayPlan?.status === "partial"
    ? "border-monk-rest/40 bg-monk-rest-soft text-monk-rest"
    : "border-monk-border bg-monk-soft text-monk-muted";
```

**Use `--color-rest`, NOT `--color-warning`.** In `wabi_sabi` accent `194 155 104` and
warning `194 155 104` are byte-identical, and in `temple_gold` accent `212 175 55` and
warning `212 175 55` are byte-identical — a warning pill would be indistinguishable from
the Plan B badge at line 862. `--color-rest` is distinct from accent and warning in all six
themes (dark `90 103 114`, kurogane `85 96 110`, temple_gold `98 109 120`, …) and pairs
with the neutral `CircleDashed` icon already used for this state.

---

## 7. Rhythm + type scale

Unit: 4px. Regions group into three blocks separated by 16-20px; within a block the step is
6-12px. Card padding stays 24px (`p-5 sm:p-6`) — it is already the right inset for a 342px
card.

| Line | Before | After | Reason |
|---|---|---|---|
| 833 | `relative mt-3 min-w-0` | `relative mt-2 min-w-0` | nav 32 + title 25 + identity 20 + 8 reads as one unit; 12 made the header float |
| 835 | `text-lg font-semibold leading-snug tracking-tight` | `text-lg font-semibold leading-tight tracking-tight` | `leading-tight` (25px) tightens the title block without inflating it |
| 842 | `mt-1.5 truncate text-sm font-medium italic` | `mt-1 truncate text-sm leading-5 font-medium italic` | half-step kills the 6px orphan; `leading-5` pins the line box so the one-line rule (839-840) stays measurable |
| 851 | `relative mt-5 border-t border-monk-border/50 pt-4` | `relative mt-4 border-t border-monk-border/50 pt-4` | identity is now 20px; 16px keeps the rule reading as a divider, not a gap |
| 1035 | `mt-3 flex min-h-12 …` | `mt-2 flex min-h-12 … transition-colors duration-150 ease-monk` | binds the CTA to the action it commits; `transition-colors` replaces `transition` (which animates `all`, including the `brightness-105` hover) and lands on the 150ms floor |
| 1062 | `className="mt-4"` | unchanged | 16px is the right block gap; `hidden` preserved |
| 1184 | `mt-4 border-t border-monk-border/40 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs` | `mt-4 border-t border-monk-border/40 pt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-xs leading-4` | restores divider clearance once the row is one line; `leading-4` pins the row to 16px; `gap-y-1.5` caps the wrap cost at 360px |

**Title stays `text-lg`.** Do NOT bump to `text-xl`: a long `goal.title` would wrap to 2-3
lines inside the 320-480px clamp, spending back the vertical budget the spacing work just
reclaimed and making the hero a *slower* read — the opposite of "understood in 3 seconds".

### The 360px reflow bug (graft)

`TodayScreen.tsx:759-763`. With `flex-wrap`, a long eyebrow + status pill pushes the
trailing element to its own line, which is exactly the "card grew" complaint.

Before:
```jsx
              <div className="relative flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-monk-muted">
```
After:
```jsx
              <div className="relative flex items-center gap-2">
                <p className="min-w-0 truncate text-xs font-bold uppercase tracking-widest text-monk-muted">
```
and add `shrink-0` to the status pill span at line 763.

### Touch floor (graft)

`TodayScreen.tsx:1216` — the details toggle is ~16px tall, a live WCAG 2.5.5 failure, on
the one control that reveals 176px of content.

Before:
```
                    className="flex items-center gap-1 rounded-md text-xs font-bold uppercase tracking-wider text-monk-muted transition hover:text-monk-accent"
```
After:
```
                    className="flex min-h-11 items-center gap-1 rounded-md px-1 text-xs font-bold uppercase tracking-wider text-monk-muted transition duration-150 ease-monk hover:text-monk-accent"
```

`min-h-11` = 44px, precedented at `TodayScreen.tsx:181`, `:325`, `FocusScreen.tsx:248`.
The row becomes `max(16, 44)` and the card pays back ~28px — accepted, because a 44px
target on the disclosure outweighs 28px of card height, and the 360px fold is solved by §3
regardless. **If the measured 390px height exceeds ~370px, drop this hunk.**

### Expected result

Collapsed height at 390×844: **386.8px → ~355-370px** (the 44px toggle spends part of the
saving). At 360px the nav no longer wraps and the meta row no longer wraps, so the CTA stays
above the fold. **These are estimates — re-measure with `tools/audit/measure-focus-card.mjs`
after implementing; do not ship the numbers, ship the measurement.**

---

## 8. T8 — the toast copy

`en.ts:1274` / `id.ts:1276`. The current strings break BOTH the no-exclamation and the
no-streak rules.

id: `"Mode Plan B diaktifkan. Jaga rantai konsistensi!"` → `"Mode Plan B aktif. Tetap di satu hal."`
en: `"Switched to 2-minute Plan B. Protect your streak!"` → `"Plan B is on. Stay with one thing."`

The replacement deliberately echoes `today.stayWithOne` — the maxim already on the card's
own bottom line — so the toast confirms a state change instead of introducing a new sentence
the user must parse.

---

## 9. T12 — the ambiguous label

`en.ts:1254` / `id.ts:1256`. `"Blueprint"` is an English loanword sitting as a bare label in
the Indonesian-default catalog with no verb and no object.

id: `"Blueprint"` → `"Rencana tujuan"`
en: `"Blueprint"` → `"Goal blueprint"`

---

## 10. New i18n keys

None required by this plan — the relocated actions reuse `blueprint.openButton` and
`release.triggerLabel`, and the rest state reuses `today.rechargeNote` /
`today.restRenewal.chosenRest` / `today.protectRecovery`.

If any string is added for any reason: **add to `en.ts` FIRST** — `id.ts:3` is typed
`Record<MessageKey, string>` where `MessageKey = keyof typeof en`.

---

## 11. Graft provenance

| From | Hunk | Why |
|---|---|---|
| SIGNAL | Relocate Blueprint + Release into `#today-card-details` (§4) | Only thing preventing a silent deletion of the sole Release trigger |
| SIGNAL | `aria-hidden` on decorative dots/icons (`1208` success dot; the pill icons at 764-772) | Cheap existing a11y defect |
| REST-FIRST | `partial` → semantic branch on `statusClass` (§6) | Real state-colour gap; themed with `--color-rest`, not `--color-warning` |
| REST-FIRST | nav `flex-wrap` → `flex` + `truncate` + `shrink-0` (§7) | Fixes a real latent reflow bug at the root |
| REST-FIRST | `duration-300` → keep the card's `transition-all` but confirm no transition exceeds 250ms (§7) | 300ms exceeds the motion law |

## 12. Rejected, with reason

| Rejected | Reason |
|---|---|
| SIGNAL's 2px accent rail | Decoration wearing signal's clothes: duplicates the status pill an inch to its left, contradicts itself on rest (accent spine beside a rest pill), and vanishes in `kurogane` (accent `176 176 176` on a `10 10 10` surface). |
| SIGNAL's `[data-theme="kurogane"] .signal-rail { --tw-gradient-from: … }` | Overrides a Tailwind v3 internal gradient variable; inherited, unowned, dies on any Tailwind internals change. |
| SIGNAL's `scroll-mt-24` on the card | There are **two** `today-primary-anchor` elements (729, 743) and three `scrollIntoView` sites (589, 594, 620). Applying it to one makes the coach's two scrolls diverge. Apply to both or neither. |
| REST-FIRST's interactive rest button | Duplicates `FeelGoodRestCanvas`'s `rest.reviewCta` on the same screen and can silently no-op. See §5. |
| REST-FIRST's full `primaryKind` state table | `primaryKind` has 9 values; one missing row renders `undefined` *theme-independently*, so dark-mode QA cannot catch it. Out of scope for a polish pass. |
| `text-xl` title | Wraps 2-3 lines inside the 480px clamp. See §7. |
| Deleting `today.daysOnGoal` | Keep the key; only its hero call site is removed. |
| Deleting the card's arbitrary inset shadow | Would restore `.monk-depth-raised`'s full ambient box-shadow (a heavier black lift), a bigger visual change than advertised. Re-hue it instead (§2a). |

---

## 13. Verification protocol (mandatory)

1. `npx tsc -b --noEmit` — must be clean.
2. `npm test` — 30+ vitest files. Watch `src/i18n/catalog.test.ts`,
   `src/components/desktopResponsive.test.ts`, `src/components/modalA11y.test.ts`,
   `src/components/seasonGoalReachability.test.ts`, `src/store/useReviewWeek*.test.ts`
   (they source-grep `TodayScreen.tsx`, `ui.tsx`, `globals.css`).
3. `node tools/audit/measure-focus-card.mjs 5200` — record before/after collapsed +
   expanded heights at 390×844; confirm no horizontal overflow.
4. Playwright screenshots at **360 / 390 / 768** widths across every state:
   focus-not-started, focus-active, session-running, done, rest, partial, planB-active,
   editingAction, cardDetailsOpen, and the first-run `!todayPlan` pick card (line 729 — the
   *second* `today-primary-anchor`; all spacing changes must look right there too).
5. **All 6 themes**: `dark`, `sumi_ink`, `kyoto_moss`, `wabi_sabi`, `kurogane`,
   `temple_gold`. Set `data-theme` per run. `kurogane` is the edge case (accent and border
   are both near-neutral — verify the card sheen at §2a still reads as a hairline and has
   not become a seam).
6. Reduced-motion pass: confirm nothing animates.
7. Contrast spot-check on the `partial` pill (§6) in `wabi_sabi` and `temple_gold`.

## 14. Cleanup before commit

Untracked artifacts at repo root must be removed or gitignored:
`today-before.png`, `card-close.png`, `today-card-before-collapsed.png`, plus
`tools/audit/today-state.json`, `tools/audit/today-storage.json`,
`audit/measure.focus-card.json`.
