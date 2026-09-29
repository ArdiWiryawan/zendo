# Zendo Part 2 — Goal, Habit & Season System Audit

Audit performed 2026-09-30 per brief §50 STEP 1-3 (INSPECT → AUDIT → MAP).
Read-only reconnaissance. No code changed to produce this document.

## 1. Current state, verified

Every claim below is verified by reading the cited code unless marked otherwise.

### Entities that EXIST

| Entity | Location | Notes |
|---|---|---|
| `Season` | `src/types/app.ts:66-81` | Has `why?: SeasonWhy`, `goalIds[]`, `badHabitIds[]` |
| `SeasonWhy` | `src/types/app.ts:54-64` | 4-part model: `identity`, `consequenceOfInaction`, `protectValues[]` all **required**; plus optional `why`, `desiredOutcome`, `antiWhy` |
| `Goal` | `src/types/app.ts:90-118` | `keystoneAction` required; optional `why`, `desiredOutcome`, `track`, `tasks[]`, `obstacle`, `obstacleMitigation`, `antiGoals[]` |
| `GoalTask` | `src/types/app.ts:83-88` | `{id, title, completed, createdAt}` — the only task model |
| `WeeklyPlan` | `src/types/app.ts:160-172` | `goalAllocations[]`, `restDayTarget` |
| `GoalAllocation` | `src/types/app.ts:147-151` | `{goalId, targetCount, completedCount}` |
| `DayPlan` | `src/types/app.ts:192-207` | `goalId?`, `mainAction?`, `highlight?`, `timeBlocks[]` |
| `TimeBlock` | `src/types/app.ts:181-190` | `startTime`, `endTime`, `title`, `category`, `goalId?` (**dead**), `completed?` |
| `BadHabit` | `src/types/app.ts:136-145` | Relapse tracking. `status` includes `"relapsed"` |

### Entities that are MISSING

- **`Project`** — no type. `"project"` at `app.ts:582` is a notebook `ParaType`, unrelated.
- **`Task`** — no standalone type. Only `GoalTask`, nested inside `Goal`.
- **`Fork`** — zero occurrences anywhere.
- **Positive `Habit` / `Practice` / `Ritual`** — no entity at all.
- **Goal type taxonomy** (achievement / frequency / maintenance) — no `type` discriminant.
- **Availability** (preferred days, time windows) — none. `Goal.whenWhere` is unparsed free text.
- **Agenda** as data — "Agenda" exists only as a *view mode* of `TimeBlock[]`
  (`DayTimeBlockVisualizer.tsx:104`), not a stored list.

## 2. Structural defects

### D1 — Habit vocabulary is 100% negative
`habit` in this codebase means `BadHabit` (relapse). `toggleHabit` (`useMonkStore.ts:761`)
writes `BadHabitDraft` entries with id prefix `habit_draft`. There is **no construct for
a positive practice**. A habit like "meditate 10 min/day" has nowhere to live except a
string keystone action. The redesign must resolve this naming collision before adding
positive habits, or the two will be permanently confused.

### D2 — No Project layer; hierarchy is calendar-sliced, not work-sliced
Current chain: `Season → WeeklyPlan → DayPlan → TimeBlock`.
There is no "what finite thing am I producing". `GoalTask` is a flat checklist with no
grouping, so a recurring goal ("publish 1 video/week") cannot express "Video #27" as a
distinct unit of work. §16 Project Pipeline has no foundation today.

### D3 — Capacity is a dead stub
`capacityCheck` (`src/lib/planScoring.ts:34-61`) computes a `message` that the caller
**discards** — `OnboardingSteps.tsx:335` re-derives an i18n key instead. So the
hardcoded English strings inside `capacityCheck` are dead payload in a bilingual app.
Further: `ok: false` does **not** block `onNext`; it only picks a tone for an advisory
`CalmAlert`. `freeHoursPerDay <= 0` returns `ok: true` (an unanswered audit reads as
"fine"). Magic numbers `1.5` h/session, `× 6` days, `0.85` threshold are unextracted.
It never runs after onboarding, so capacity can be violated forever post-creation.

### D4 — Three-way target duplication
`Goal.weeklyTargetCount` → copied into `GoalAllocation.targetCount`
(`defaultData.ts:655`) → `completedCount` tracked on `WeeklyPlan`. Two schemas hold the
same truth, synced by convention rather than by the type system.

### D5 — `Goal.priority` is a phantom field
Required in the type (`priority: 1 | 2 | 3`, `app.ts:112`), **written by no UI**,
**read by nothing** — not by `planScoring`, not by `capacityCheck`. This is the natural
triage field for §48 trade-offs, currently dead.

### D6 — The 3-goal cap is a silent magic number
`useMonkStore.ts:871`: `if (!selected && state.onboarding.selectedFocusGoalIds.length >= 3) return;`
Hardcoded `3`, bare `return` — no toast, no disabled state, no explanation. Scoped to
onboarding draft selection only; **unenforced after season creation**. A second implicit
cap: `defaultData.ts:661` `patterns[goalIds.length] ?? []` means 4+ goals silently receive
**zero weekly allocation**.

### D7 — Season and Goal have no navigation entry point
`BottomNav` (`src/components/ui.tsx:664-667`) has exactly 4 items: Today, Week, Timeline,
Journal. `Season` and `Goal` — the two core domain entities — are reachable only via
in-page deep links. `/relapse` is orphaned entirely (referenced only by its route def).

### D8 — Two hardcoded English strings, both in `GoalBlueprintModal`
`GoalBlueprintModal.tsx:353` (`"Target Days & 2-Minute Plan B"`) and `:394` (`"Cancel"`).
Indonesian users see English. Both sit in the file the redesign will rewrite anyway.
Also `planScoring.ts:27-31` `planStrengthLabel` returns untranslated English prose
(`"Solid" | "Steady" | "Thin" | "Fragile"`) with no i18n boundary.

### D9 — `TimeBlock.goalId` is dead
Field exists (`app.ts:188`), zero usages in `src/`. Intended per-block goal linkage,
never wired.

## 3. Audit classification (brief §50 STEP 2)

ADD is kept deliberately smallest, per instruction.

### KEEP — works, do not touch
- `Season` / `SeasonWhy` / `Goal` core shape and the `Season → WeeklyPlan → DayPlan` spine
- `Goal.keystoneAction` as the controllable-action slot (correct concept, correctly named)
- `WeeklyReviewModal` → `updateGoalKeystoneAction` pattern (`useMonkStore.ts:2113-2117`) —
  authoritative write of the canonical action. The daily modal should mirror this.
- `src/lib/date.ts` — correct date-fns usage, no hardcoded month lengths. §41 satisfied.
- i18n catalog parity — 1288 keys, zero drift, `Record<MessageKey,string>` type-locked
- `focusStreak.ts` miss-today-does-not-kill + "miss twice" rule (aligns with §24)
- `getFocusStreak` rest-day exemption (aligns with §31, no guilt)
- Custom zero-dep markdown renderer (`notebookMarkdown.tsx`)
- Notebook PARA model and PARA filter tabs

### IMPROVE — exists but wrong or incomplete
- `capacityCheck` — promote from dead stub to a real, localized, advisory signal (D3, §27)
- 3-goal cap — name the constant, give feedback, enforce post-creation (D6, §8)
- `GoalBlueprintModal` — trim to the 7 high-value questions in §34; localize D8
- `MorningPlanningModal` — separate Today Focus / Main Action / Agenda (§18-22)
- `Goal.priority` — either wire it to triage or remove it (D5)
- `planStrengthLabel` + `capacityCheck` messages — move behind i18n (D8)

### CONNECT — exists separately, should work together
- Habit ↔ Goal optional link (§25) — currently impossible, no positive habit entity
- Goal → Project → Task (§16) — Project layer missing (D2)
- `DayPlan.goalId` → `TimeBlock.goalId` — per-block linkage dead (D9)
- `Goal.weeklyTargetCount` ↔ `GoalAllocation.targetCount` — unify (D4)
- Tomorrow's Main Action → next day's suggestion (§33)

### SIMPLIFY
- `SeasonWhy` — 4 required parts is heavier than §9's "one high-level reason". Collapse
  the `consequenceOfInaction` / `antiWhy` redundancy (same concept, both present).
- Timeline visual design (§40) — preserve logic, reduce chrome

### HIDE — progressive disclosure
- Advanced goal fields behind an "Advanced" disclosure (already partly the case)
- Secondary planning detail in collapsed `<details>` (existing pattern, extend it)

### REMOVE
- Dead English `message` payload in `capacityCheck` (D3)
- Orphaned `/relapse` route from nav reachability, OR wire it (§43 hypothesis)
- `TimeBlock.goalId` if not wired (D9)
- Any duplicate target counter once D4 is unified

### ADD — smallest category
- Positive `Habit` entity (§23) — genuinely missing, blocks §24-25
- `Goal.type` discriminant (§12) — genuinely missing, blocks §26 progress model
- Outcome Frequency vs Practice Rhythm split (§13) — genuinely missing
- Availability fields (§14) — genuinely missing
- Agenda as stored data (§21) — in flight in Part 1
- Nav entry point for Season/Goal (D7)

## 4. Proposed P0 order (brief §50 STEP 4)

Ordered by dependency, not by size. Each is a shippable increment.

1. **Close Part 1** (in flight, separate scope) — Focus abandon leak, Planning clobber.
2. **Feedback + honesty pass** — name the 3-goal cap, give it feedback, enforce
   post-creation; make `capacityCheck` honest (`freeHoursPerDay <= 0` should not read
   "fine"); localize its labels. Small, fixes silent failure (D3, D6, D8).
3. **Goal type + frequency split** — add `Goal.type` and separate outcome frequency from
   practice rhythm (§12-13). Additive optional fields; migration maps existing
   `weeklyTargetCount` → practice rhythm.
4. **Positive Habit entity** (§23-25) — resolve the D1 naming collision first.
5. **Today Focus / Main Action / Agenda separation** (§18-22) — Part 1 lands the `agenda`
   field; P0 completes the distinction on the read surface.
6. **Nav entry point for Season/Goal** (§43) — currently unreachable (D7).
7. **Availability fields** (§14) — additive, feeds realistic suggestions.
8. **Project layer** (§16) — largest; only after 1-7 are stable.

## 5. Explicitly deferred (P1/P2)

P1: Fork→Task→Agenda, notebook simplification, Library integration, journal drawing,
timeline visual simplification, capacity awareness beyond advisory.

P2: animation polish, advanced filtering, personalization, smart suggestions.

## 6. Honest scope statement

Part 2 as specified is a multi-phase redesign of the entire data model. The brief itself
mandates inspection before implementation (§50 STEP 1-3), and ADD must stay smallest.
This audit is that inspection. P0 items 1-8 above are not a single change set; 3, 4, 5 and
8 each carry real migration and test surface. Recommended to ship in the order listed,
verifying between each, rather than as one large rewrite.