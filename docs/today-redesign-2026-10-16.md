# Today page visual redesign — 2026-10-16

Visual and UX refinement of `src/screens/TodayScreen.tsx` and its Today-only
children. **No capability was removed.** Every module, control, handler and
persisted field that existed before still exists, in the same place, wired to the
same store actions.

## Feature inventory (what had to survive)

Audited before touching anything. All of it is still on the page:

| Module | Controls / data | Where it lives now |
| --- | --- | --- |
| Header | Title, season-day + days-left metadata, Support/Donate, Settings | `PageHeader` + `SettingsLink` — unchanged |
| Why / Start With Why | Reason, outcome, anti-why, protected values, edit, disclosure | `WhyStrip` — restyled, same behaviour |
| Main goal context | Goal title, `Menjadi…` identity line, status pill, day type | Top of the hero card |
| Daily Highlight | Highlight text, editable + persisted | Its own labelled block |
| Today Action | Main action text, keystone suggestion, Edit form (time / when / I will), Save, Cancel, plan-B badge | Action block |
| Completion | Primary CTA (complete / mark incomplete), `derivePrimaryCTA` state machine, chime + haptics | Primary CTA |
| Tiny start | 5-minute quick start | Secondary row under the CTA |
| Details disclosure | Blueprint button, desired outcome, next-action prompt, Plan B switcher, task list, change-theme, undo | `#today-card-details` |
| Focus (goal context) | "FOKUS HARI INI" label + status pill | Hero card header |
| Focus (action) | Start / resume / return, last-used preset, quick 10, choose length, low-energy branch, navigation | Primary zone card |
| Focus (live) | `FocusSessionPanel` compact | Primary zone, `primaryKind === "resume"` |
| Energy | 3 choices, current readout, 7-day trend, save | `EnergyCheck` |
| Daily activities | Morning pages, learning, reflection, drift log | "Lainnya untuk hari ini" |
| Guardrails | Anti-goals + obstacles chips | `DefenseChips` |
| Practices | List, add practice, weekly history, per-practice streak | `PracticesCard` |
| Agenda | Date, block count, planned hours, Agenda/Grid view, `.ics` export, edit, category chips, time ranges, durations, titles, checkboxes, free-text agenda list | Collapsible + `DayTimeBlockVisualizer` |
| Banners | nmt2, re-entry, six-days, rest suggestion, unclarified goal, coach | Unchanged, same priority order |
| Rest day | `FeelGoodRestCanvas`, close-day held/skipped | Unchanged |
| Shell | Bottom nav, undo toast, all modals | Unchanged |

**The two Focus presentations are distinct and both kept.** The hero card's
"FOKUS HARI INI" is *context* — which goal today is and the day's status. The
separate primary-zone card is the *action* — it starts, resumes or returns to a
timer. Neither is a duplicate of the other; the redesign makes the relationship
readable rather than merging them.

## Visual decisions

**1. Hero card flattened.** It stacked three decorative layers: a per-state
`bg-gradient-to-b`, a raised `shadow-[inset_0_1px_0_…]`, and an accent wash
painted over both. Status is now a single hairline at the top edge plus the
border tone, on a flat `bg-monk-surface`. The gold CTA is again the loudest
element on the page. `Card important` was dropped in favour of an explicit div —
`rounded-monk` now matches every other card on the page.

**2. Why demoted.** `WhyStrip` used `border-monk-accent/20 bg-monk-accent-soft/30`
for both variants, which put an accent-tinted panel above the hero. It is now a
neutral bordered panel with the accent confined to the badge, and the expanded
outcome / anti-why / values blocks are hairline-separated rows instead of a box
inside a box inside a box.

**3. Three disclosure shells unified.** "Lainnya untuk hari ini", "Latihan" and
"Agenda" are the same affordance but had drifted into three different paddings,
hover colours, chevron sizes and dividers. They now share `CollapsibleSection`:
icon · label · meta chip · chevron, one divider.

**4. Agenda summary carries date + count.** Collapsed, it previously showed only
"Agenda" — nothing about which day or how much. It now shows
`Jum, 16 Okt · 6`, via the new `formatShortDate` helper in `src/lib/date.ts`
(shared with the block header so the two cannot drift).

**5. Energy is calmer and the trend is no longer conditional.** The selector was
three independently coloured buttons — high green, medium amber, low red — so a
single answer painted three competing status colours. It is now one segmented
control with one accent selected state; the words carry the meaning. The 7-day
trend used to be dropped in `compact` mode, which is exactly the mode the focus
state renders, so the history vanished on the days it was most useful. It now
always renders.

**6. Rows, not boxes.** Task steps were each their own bordered, rounded box
(five steps → five nested outlines inside the goal card); the four activity rows
were each a filled, rounded box inside the section's own box. Both are now
hairline-separated flat rows.

**7. Agenda blocks lost their full-colour frames.** Each block carried a coloured
border on every side, a 3px coloured left edge, and a raised surface, so a
six-block day drew six competing coloured frames. The category colour is still
stated twice — a thin left marker and the chip — but on a flat surface with a
hairline border.

**8. Spacing normalised.** The page alternated `space-y-5` wrappers with ad-hoc
`mt-5` on individual children, doubling some gaps. Those are gone; the secondary
group relies on its parent's rhythm.

Nothing added: no new dependency, no new route, no schema or persistence change,
no hard-coded data, no removed key or prop.

## Two changes worth flagging

- **`DefenseChips` gained an optional `bare` prop** (additive). Today uses it to
  embed the chips inside a section that is already a bordered box, instead of
  nesting a card in a card. Week keeps the default wrapped form.
- **`EnergyCheck`'s `compact` prop now only affects padding.** It used to suppress
  the trend. The brief requires the trend to be kept, and the mode that dropped
  it was the one most users see.

## Files changed

| File | Change |
| --- | --- |
| `src/screens/TodayScreen.tsx` | Hero flattened; `CollapsibleSection` added and used for two sections; agenda summary gains date + count; `agendaBlockCount` derived; activity rows flattened; `DefenseChips` gains `bare` |
| `src/screens/TodayScreen.components.tsx` | `WhyStrip` demoted and de-nested; `EnergyCheck` unified, calmer, trend always on; `GoalTasksCard` rows flattened |
| `src/components/PracticesCard.tsx` | Shell aligned to `CollapsibleSection` (chevron, hover, divider, border tone) |
| `src/components/DayTimeBlockVisualizer.tsx` | Agenda rows: hairline border + thin left category marker on a flat surface |
| `src/lib/date.ts` | New `formatShortDate(date, lang)` |
| `tools/audit/fullshot.mjs` | `SEED=<name>` support; reports the seed in its log |
| `tools/audit/seed-today-normal.mjs` | New: a "day in progress, nothing done, no review" state |

## Verification

- `npx tsc -b --noEmit` — clean.
- `npm test` — **892 passed / 84 files**, unchanged from before the redesign.
- `npm run build` — succeeds; PWA service worker regenerated.
- Screenshots at three widths (all full-length, 2x, agenda sections expanded so
  every block is visible):
  - `audit/today-redesign-390/today-full@2x.png` — 390 × 5276 px
  - `audit/today-redesign-320/today-full@2x.png` — 320 × 5530 px
- 390px page height 2673px → **2638px**.

## Known limitations (pre-existing, not introduced here)

1. **`DayTimeBlockVisualizer` is shared with the Timeline screen.** The agenda-row
   restyling therefore applies there too. It is a pure style change and Timeline
   passes no `compact`, so the grid-view height is unaffected.
2. **Desktop is a 480px column.** The app shell caps `main` at `max-w-[480px]`, so
   at 1440px Today is a centred mobile column. That is the shared PWA shell, not
   a decision this page can make alone.
3. **The energy module renders in one of two places depending on state** — inline
   in the primary zone while `primaryKind` is `focus`/`intention`, otherwise inside
   a collapsed `<details>`. Both are now visually identical, but which one appears
   is still state-dependent, as before.
4. **The collapsed agenda is a native `<details>`**, so its state is not
   persisted across reloads. Unchanged from before.
