# Zendo — Focus / Rest / Pomodoro / Day / Season Audit

Scope: the whole chain `USER ACTION → SESSION → TIMER → SESSION RESULT → DAY RESULT → SEASON ACCOUNTING → PROGRESS → UI`.

Triggering report: Day 7 was scheduled Rest (rest already taken on Day 6). The user ran a Focus session on Day 7.
The timer counted the time and the session visibly completed, but the season kept counting Day 7 as **Rest**.

Every claim below was read from the code at the cited `file:line`.

---

## 1. Executive Summary

Zendo stores the *same fact* — "was this day focus or rest?" — in **four** different places, each written by a
different code path, and reads it back through **nine** independent implementations. They disagree.

The day plan (`DayPlan.dayType`) is the *schedule*. The timeline row (`TimelineDay.status`) is a *derived cache*.
The focus sessions are the *evidence*. The session is written from evidence; the day is written from the schedule.

On a day scheduled Rest, the schedule outranks the evidence at two separate choke points, so a completed focus
session can never win:

```
src/store/useMonkStore.ts:466     if (dayPlan.dayType === "rest" || dayPlan.status === "rest") return "rest";
src/lib/dailyActivity.ts:62       if (plan?.dayType === "rest" || plan?.status === "rest") return "rest";
```

Both sit **above** every check for completed focus sessions. `updatedTimelineDays()` then writes that verdict into
`timelineDays`, and `selectSeasonRhythmAccounting()` reads it back. The work is recorded and permanently
unacknowledged at the same time.

The "Day 7 flipped to Rest after I opened my phone" symptom is not a transition. It is the **discovery** of a
classification that was written the moment the session ended — the app re-derives `timelineDays` on every tick and
on hydrate, and the rest verdict was already in the row. Phoning, backgrounding, and refreshing only made it visible.

Root cause in one line: **scheduled state and actual result are conflated, and the schedule is checked first.**

---

## 2. Root Cause of the Day-7 Bug

The precise chain, with the offending lines:

| # | Step | Location | What happens |
|---|------|----------|--------------|
| 1 | User opts into rest on Day 7 | `TodayScreen.tsx:255,663,689` → `createOrUpdateDayPlan` | plan is `dayType:"rest"`, `status:"rest"` |
| 2 | User starts a focus session | `useMonkStore.ts:1815` `startFocusSession` | binds the session to that rest plan; **does not** promote the day |
| 3 | Day plan is rewritten | `useMonkStore.ts:2387` | `status` forced to `"active"` — `dayType` stays `"rest"` |
| 4 | Every 1 Hz tick re-derives the day | `useMonkStore.ts:1892` → `deriveTimelineStatus` | line 466 sees `dayType === "rest"` → returns `"rest"` |
| 5 | Vest will be written | `useMonkStore.ts:499` `updatedTimelineDays` | `timelineDays.status = "rest"` |
| 6 | Session completes | `useMonkStore.ts:2120` `completeFocusSession` | line 466 again returns `"rest"` → `dayPlan.status` set to `"active"`, never `"completed"` |
| 7 | Season reads it | `rhythmAccounting.ts:42` `selectSeasonRhythmAccounting` | `getDailyStatusForDate` → line 62 returns `"rest"` → `restDays++`, `focusDays` unchanged |

Step 4 is why the timer kept running and the minutes kept accruing while the day was *already* filed as rest.
Step 7 is why the season never counted the focus.

There are **two** independent defences that must both be crossed, which is why a one-line fix is insufficient:

- `useMonkStore.ts:466` — governs the new value written into `timelineDays`.
- `dailyActivity.ts:59` — governs a row already on disk: `if (day?.status === "rest") return day.status;`
  returns the stale rest row **verbatim, before recomputing anything**. Any row already poisoned stays poisoned
  even after the deriver is fixed.

---

## 3. Current Data Flow

```
DayPlan.dayType / .status          <-- SCHEDULE. Written by user action + createOrUpdateDayPlan.
        |
        |  deriveTimelineStatus  (useMonkStore.ts:463)   <-- schedule checked FIRST (line 466)
        v
TimelineDay.status                 <-- DERIVED CACHE, persisted. Written by 9 call sites.
        |                             Rewritten every 1 Hz tick (line 1892) and on hydrate (line 834).
        |
        |  getDailyStatusForDate (dailyActivity.ts:53)
        v                             line 59: returns the persisted cache verbatim
Season accounting (rhythmAccounting.ts:42)
        |
        v
UI (Timeline, Week, Today, SeasonEnd)
```

Truth is stored in **three** places for one fact:

- **Evidence** — `focusSessions[].status` + minutes. The only thing that reflects what the user did. Immutable once ended.
- **Schedule** — `dayPlans[].dayType` / `.status`. Reflects intent, not outcome.
- **Cache** — `timelineDays[].status`. A persisted copy of a derivation of the two above.

The fork: the **session** is written from evidence, the **day** is written from the schedule. Nothing reconciles them.

---

## 4. Bugs Found

| P | Issue | file:line | Root cause | Impact | Minimal fix |
|---|-------|-----------|------------|--------|-------------|
| P0 | Scheduled rest beats completed focus | `useMonkStore.ts:466` | rest check precedes the session scan | Day 7 reported rest despite real focus | Derive activity first; only return `"rest"` when activity is `not_started` |
| P0 | Stale rest row returned before recompute | `dailyActivity.ts:59` | persisted `timelineDays` row trusted verbatim | Poisoned rows never self-heal; season counts rest | Recompute the core status; honor a `rest` row only when core is `not_started` |
| P0 | Same short-circuit in the read path | `dailyActivity.ts:62` | duplicate of `:466` | Season path repeats the bug independently | Same rule as `:466` |
| P0 | Season counts a worked day as rest | `rhythmAccounting.ts:42` | consumes the above | `focusDays` understated, `consistencyRate` wrong | Fixed automatically once the resolver is shared |
| P0 | `dayType:"rest"` survives day promotion | `useMonkStore.ts:2387` | `status` promoted, `dayType` never cleared | All 8 `dayType==="rest"` consumers keep seeing rest | Promote `dayType` to `"goal"` when real focus starts on a rest day |
| P0 | One day counted in both buckets | `rhythmAccounting.ts:67` | `completed` by status **and** `rest` by `dayType` | `accounted` > `elapsed`; a day becomes two | Make the two tallies mutually exclusive |
| P1 | Completed day demoted to `active` | `useMonkStore.ts:2120` | ternary else-branch overwrites prior status | A later partial session erases a completed day | Preserve `completed` |
| P1 | Failed 1 Hz write silently loses `dayType` | `useMonkStore.ts:2387` | plan reconstructed from a session that carries no `dayType` | Observation, not corruption — `hydrate` fixes it | Carry `dayType` explicitly (`?? "goal"`) |
| P1 | `tickFocusSession` has no ended-session guard | `useMonkStore.ts:1884` | only checks `if (!session)` | Writes are tolerated; a post-end tick can still rewrite the day | Guard on `running`/`paused` |
| P1 | Stale session ends without recording minutes | `useMonkStore.ts:703` | hydrate sets `ended_early` without summarising | 3-hour-old session loses its focus time | Summarise from `elapsedSeconds` before ending |
| P1 | Streak denies focus done on a rest day | `focusStreak.ts:14` | `isHeldDay` returns false on `dayType==="rest"` | Real work does not extend the streak | Defer to the shared resolver |
| P1 | Offering to rest again on a day already worked | `reminderScheduler.ts:111`, `restSuggestion.ts:38` | `isRestDay` ignores activity | Nudge to rest after a completed focus day | Defer to the shared resolver |
| P1 | `didYesterdaySlip` treats any rest plan as "not slipped" | `dailyActivity.ts:244` | rest checked before activity | A worked rest day reads as slipped to the reentry card | Defer to the shared resolver |
| P1 | WeekScreen counts from the schedule, others from the resolver | `WeekScreen.tsx:74,224,576` | independent derivation | Same date, two answers on two screens | Use `getDailyStatusForDate` |
| P2 | `timelineDays` is a persisted duplicate of derived state | `useMonkStore.ts:478` | 9 writers, no single owner | Cache and truth can diverge silently | Treat as a cache, re-derive on hydrate |
| P2 | Nine independent "focus or rest" implementations | see §5 | no shared rule | Every new consumer can introduce a new divergence | One exported resolver |
| P2 | `completeMainAction` parameter never read | `useMonkStore.ts:2024` | dead parameter | Confusing contract | Remove or honour |
| P3 | Flagging a session removed leaves the day completed | `useMonkStore.ts:2289` | re-derive may keep `plan.status === "completed"` | Day stays completed with no session | Re-derive from remaining evidence |
| P3 | No shared contract between stored and derived day shapes | `useMonkStore.ts:497` | `deriveTimelineStatus` reads `DayPlan`, writes `TimelineDay` | Field drift is invisible | Type the boundary |

---

## 5. Competing Derivations

Nine independent implementations answer *"was this day focus or rest?"*. They are not required to agree.

| # | Location | Inputs it trusts | Can disagree because |
|---|----------|------------------|----------------------|
| 1 | `useMonkStore.ts:466` `deriveTimelineStatus` | plan, then sessions | schedule checked first |
| 2 | `dailyActivity.ts:62` `getDailyStatusForDate` | timeline row, then plan, then sessions | row returned verbatim at `:59` |
| 3 | `dailyActivity.ts:244` `shouldOfferReentry` | `plan.dayType==="rest"` | ignores activity |
| 4 | `focusStreak.ts:14,27,29` `isHeldDay`/`isRestDay` | plan + timeline, not sessions | ignores activity |
| 5 | `rhythmAccounting.ts:67` `countSeasonDayPlans` | plan `status` and `dayType` | double-counts |
| 6 | `reminderScheduler.ts:111` `isRestDay` | `plan.dayType` only | ignores activity + timeline |
| 7 | `restSuggestion.ts:32,38` `isGoalDay` | `plan.dayType` + `status` | ignores activity |
| 8 | `WeekScreen.tsx:74,224,576` | plan `status`/`dayType` | ignores the resolver entirely |
| 9 | `TodayScreen.tsx:481` | `plan.dayType` only | ignores activity |

`timelineDays` is neither purely a cache nor a source of truth: `hydrate` treats it as a cache (rewrites it at
`useMonkStore.ts:834`), while `dailyActivity.ts:59` treats it as authoritative. That contradiction is what makes the
gothic rest row survive a correct fix.

---

## 6. Invalid State Transitions

```
SCHEDULED_REST + FOCUS_COMPLETED  ->  REST        INVALID. Observed. This is the reported bug.
                                     Evidence must win.
FOCUS_COMPLETED (day)  ->  ACTIVE                 INVALID. useMonkStore.ts:2120 demotes on a later partial session.
REST (dayType)         ->  stays "rest" forever   INVALID. Nothing ever clears dayType once set.
                                                  A day can be both completed and rest at once (§4, countSeasonDayPlans).
RUNNING                ->  ENDED_EARLY (no summary) INVALID. useMonkStore.ts:703 drops the elapsed minutes.
```

Valid and guarded today (verified, no change needed):

```
RUNNING -> PAUSED -> RUNNING     pauseFocusSession:1985 / resumeFocusSession:2006 guard on status
RUNNING -> COMPLETED             completeFocusSession:2024 guards on status !== "running"
RUNNING|PAUSED -> ENDED_EARLY    abandonFocusSession:2140 guards on running/paused
COMPLETED -> anything            resetFocusSession:1895 and abandon:2140 both refuse to resurrect an ended session
```

Completed **sessions** are immutable. Completed **days** are not. That asymmetry is the architectural defect.

---

## 7. Data Integrity Risks

A completed historical session can be reclassified retroactively. Three independent mechanisms:

1. **Hydrate recomputes day status on every app open** — `useMonkStore.ts:834`. A past day's `timelineDays.status`
   is rewritten from current `dayPlans` + `focusSessions`. If a later sync merges in a rest-typed plan for that date,
   the past day flips to rest on next open.
2. **The 1 Hz tick rewrites the day** — `useMonkStore.ts:1892`. Any tick during a session re-derives the day from
   the schedule, so a completed focus day is continuously at risk while a session runs.
3. **The season's own math is not idempotent** — `rhythmAccounting.ts:67` can count one day twice, so the reported
   `accounted` / `consistencyRate` depends on how the plan happens to be typed, not on what happened.

The rule the product needs, and does not currently enforce:

> A day whose focus work is recorded is finished. Nothing — not a tick, an app open, a refresh, or a sync merge —
> may change it afterwards.

---

## 8. Unhandled Edge Cases

| Scenario | Today | Required |
|----------|-------|----------|
| Scheduled rest + focus completed | counted rest | counted focus |
| Scheduled rest + nothing done | rest | rest (already correct) |
| Scheduled rest + focus + app closed | rest on reopen | focus |
| Scheduled rest + focus + phone switch | rest | focus |
| Scheduled rest + focus + refresh | rest | focus |
| Scheduled rest + focus + return hours later | rest | focus |
| Scheduled rest + focus + later partial session | day demoted to `active` | stays completed |
| Scheduled rest + focus + session deleted | day may stay completed | re-derive from remaining evidence |
| Focus crossing midnight (23:50 → 00:10) | bound to the start day's plan | bound to the start day (already correct) |
| Two focus sessions in one day | both aggregated | aggregated |
| Onboarding `theme === "rest"` creates a rest plan | rest | unchanged |

---

## 9. Proposed Business Rules

Grounded in the philosophy already written into the codebase — `rhythmAccounting.ts:26` ("Rest is part of the plan,
not a failure to meet it"), `focusStreak.ts:8`, `dailyActivity.ts:56`.

1. **A completed session is immutable.** No tick, remount, hydrate, refresh, sync, or later session may alter a
   session whose status is `completed` or `ended_early`. *(Already true for sessions; enforce for days.)*
2. **Evidence outranks schedule.** A day resolves to a focus result the moment it contains a completed or
   ended-early focus session — even when the plan scheduled rest. *(New. This is the fix.)*
3. **Schedule is intent, not outcome.** `dayType:"rest"` means "rest was planned", never "rest happened". It may
   only decide a day that has no evidence.
4. **Rest is only the resort.** A date resolves to `rest` only when the plan says rest **and** no focus or learning
   evidence exists. *(New.)*
5. **A day is counted once.** A date lands in exactly one of focus / rest / missed / relapse. *(New.)*
6. **Starting real focus promotes the day.** When a session begins on a rest-scheduled day, the day becomes a goal
   day. The plan is promoted, not overwritten with a contradictory flag. *(New.)*
7. **Derived state is derived.** `timelineDays.status` is a cache of rules 1–6 and is recomputed on hydrate; it is
   never read as authority. *(New.)*
8. **One resolver.** Every consumer asks the same function the same question. *(New.)*

---

## 10. Minimal Fix Plan

Smallest diff first. No rewrites, no new abstractions beyond **one** shared resolver.

1. **Add the shared resolver** — one exported `resolveDayOutcome({ plan, focusSessions, learningSessions, relapseCount })`
   in `src/lib/dailyActivity.ts`, implementing rules 2, 3, 4, 5. Each of the nine sites in §5 is replaced by a call.

2. **Fix `deriveTimelineStatus`** (`useMonkStore.ts:463-475`) — drop the `:466` short-circuit; delegate to the resolver.
   Keep the `relapse` precedence.

3. **Fix `getDailyStatusForDate`** (`dailyActivity.ts:53-74`) — stop returning a persisted `rest` row verbatim at
   `:59`; recompute and honour `rest` only when the core status is `not_started`.

4. **Fix `startFocusSession`** (`useMonkStore.ts:1815`) — when the day is `dayType:"rest"`, promote it to `"goal"` at
   the same time the status becomes `"active"`. Fixes §4 row 5 at the source.

5. **Fix `completeFocusSession`** (`useMonkStore.ts:2120`) — never demote a `completed` day to `active`;
   `status: prior === "completed" || timelineStatus === "completed" ? "completed" : "active"`.

6. **Fix `countSeasonDayPlans`** (`rhythmAccounting.ts:67`) — make `completed` and `rest` mutually exclusive.

7. **Sweep the remaining consumers** — `focusStreak.ts`, `reminderScheduler.ts`, `restSuggestion.ts`,
   `WeekScreen.tsx`, `TodayScreen.tsx`, `dailyActivity.ts:244` — to call the resolver.

8. **Guard the tick** (`useMonkStore.ts:1884`) — return early unless the session is `running`/`paused`.

9. **Fix stale-session hydration** (`useMonkStore.ts:703`) — summarise the elapsed time before marking `ended_early`.

10. **Regression tests** — one test per §8 row, asserting evidence wins.

Ordering rationale: 1–3 stop the bleeding and are independently testable; 4–6 remove the sources that keep
re-poisoning the data; 7 removes the remaining divergences; 8–9 close the adjacent holes found by the same audit.
