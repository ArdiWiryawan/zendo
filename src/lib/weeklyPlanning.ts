import type {
  MonkMVPState,
  WeeklyPlan,
  WeeklyDraft,
  WeeklyRitual,
  WeekProposal,
  IdealBlock,
  TimeBlock,
} from "../types/app";
import { isIdealWeekColor } from "./idealWeekCalendar";
import {
  addDaysToDate,
  datesInRange,
  parseLocalDateKey,
  getCurrentWeekNumber,
  getWeekStartDate,
  getWeekEndDate,
} from "./date";

export const emptyRitual = (): WeeklyRitual => ({
  outcomes: [],
  reflection: "",
  appliedKeys: [],
  held: [],
});
function revisionStamp(state: MonkMVPState): string {
  const previous = [...state.dayPlans, ...state.weeklyPlans]
    .map((item) => Date.parse(item.updatedAt))
    .filter(Number.isFinite);
  return new Date(
    Math.max(Date.now(), ...previous.map((time) => time + 1)),
  ).toISOString();
}
function containingWeek(
  state: MonkMVPState,
  date: string,
): { state: MonkMVPState; week: WeeklyPlan } {
  const season = state.activeSeason;
  if (
    !season ||
    !validDate(date) ||
    date < season.startDate ||
    date > season.endDate
  )
    throw new Error("invalid");
  const existing = state.weeklyPlans.find(
    (week) =>
      week.seasonId === season.id &&
      week.startDate <= date &&
      week.endDate >= date,
  );
  if (existing) return { state, week: existing };
  const weekNumber = getCurrentWeekNumber(season.startDate, date);
  const stamp = revisionStamp(state);
  const week: WeeklyPlan = {
    id: `weekly-plan:${season.id}:${weekNumber}`,
    seasonId: season.id,
    weekNumber,
    startDate: getWeekStartDate(season.startDate, weekNumber),
    endDate: getWeekEndDate(season.startDate, weekNumber),
    mode: season.mode,
    goalAllocations: state.goals
      .filter(
        (goal) =>
          goal.status === "active" &&
          (!goal.seasonId || goal.seasonId === season.id),
      )
      .map((goal) => ({
        goalId: goal.id,
        targetCount: goal.weeklyTargetCount > 0 ? goal.weeklyTargetCount : 1,
        completedCount: 0,
      })),
    restDayTarget: 1,
    status: "active",
    createdAt: stamp,
    updatedAt: stamp,
  };
  return {
    state: { ...state, weeklyPlans: [...state.weeklyPlans, week] },
    week,
  };
}
export function minutes(time: string): number {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) && time !== "24:00")
    throw new Error("invalid");
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export const clock = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
export function validDate(date: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(parseLocalDateKey(date).getTime()) &&
    addDaysToDate(date, 0) === date
  );
}
export function validateReference(block: IdealBlock) {
  if (
    !block.title.trim() ||
    !block.days.length ||
    block.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
    minutes(block.startTime) >= 1440 ||
    !Number.isInteger(block.duration) ||
    block.duration < 1 ||
    block.duration > 1440 ||
    (block.color !== undefined && !isIdealWeekColor(block.color))
  )
    throw new Error("invalid");
}
export function referenceProposals(
  refs: IdealBlock[],
  week: WeeklyPlan,
): WeekProposal[] {
  return refs.flatMap((ref) =>
    datesInRange(week.startDate, 7)
      .filter((date) => ref.days.includes(parseLocalDateKey(date).getDay()))
      .map((date) => ({
        id: `${ref.id}:${date}`,
        occurrenceKey: `${ref.id}:${date}`,
        date,
        title: ref.title,
        startTime: ref.startTime,
        duration: ref.duration,
        category: ref.category,
        goalId: ref.goalId,
        practiceId: ref.practiceId,
      })),
  );
}
export function proposalParts(
  p: WeekProposal,
): { date: string; block: TimeBlock }[] {
  const start = minutes(p.startTime);
  if (
    !validDate(p.date) ||
    !p.title.trim() ||
    start >= 1440 ||
    !Number.isInteger(p.duration) ||
    p.duration < 1 ||
    p.duration > 1440
  )
    throw new Error("invalid");
  const end = start + p.duration;
  const block: TimeBlock = {
    id: `weekly:${p.id}`,
    occurrenceGroup: `weekly:${p.id}`,
    title: p.title.trim(),
    startTime: p.startTime,
    endTime: clock(Math.min(end, 1440)),
    category: p.category,
    goalId: p.goalId,
    practiceId: p.practiceId,
    outcomeId: p.outcomeId,
    occurrenceKey: p.occurrenceKey,
  };
  return [
    { date: p.date, block },
    ...(end > 1440
      ? [
          {
            date: addDaysToDate(p.date, 1),
            block: {
              ...block,
              id: block.id + ":next",
              startTime: "00:00",
              endTime: clock(end - 1440),
            },
          },
        ]
      : []),
  ];
}
export function confirmWeek(
  state: MonkMVPState,
  weekId: string,
  draft: WeeklyDraft,
): MonkMVPState {
  const week = state.weeklyPlans.find((w) => w.id === weekId);
  if (!week || state.activeSeason?.id !== week.seasonId)
    throw new Error("stale");
  if (
    draft.outcomes.some((o) => !o.title.trim()) ||
    new Set(draft.outcomes.map((o) => o.id)).size !== draft.outcomes.length
  )
    throw new Error("invalid");
  const stamp = revisionStamp(state);
  const ritual = week.ritual ?? emptyRitual();
  let next = state;
  let days = state.dayPlans.map((d) => ({
    ...d,
    ...(d.timeBlocks ? { timeBlocks: [...d.timeBlocks] } : {}),
  }));
  const keys = new Set(ritual.appliedKeys);
  const seen = new Set<string>();
  for (const p of draft.proposals) {
    if (
      p.date < week.startDate ||
      p.date > week.endDate ||
      p.date < state.activeSeason.startDate ||
      p.date > state.activeSeason.endDate
    )
      throw new Error("invalid");
    if (p.occurrenceKey && keys.has(p.occurrenceKey)) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    for (const { date, block } of proposalParts(p)) {
      if (date > state.activeSeason.endDate) throw new Error("invalid");
      const containing = containingWeek(next, date);
      next = containing.state;
      let day = days.find(
        (d) => d.date === date && d.seasonId === week.seasonId,
      );
      if (day?.timeBlocks?.some((b) => b.id === block.id)) continue;
      const overlap = day?.timeBlocks?.find(
        (b) =>
          minutes(b.startTime) < minutes(block.endTime) &&
          minutes(block.startTime) < minutes(b.endTime),
      );
      if (overlap)
        throw new Error(
          `conflict: ${date} ${block.title} ${block.startTime}–${block.endTime} / ${overlap.title} ${overlap.startTime}–${overlap.endTime}`,
        );
      if (!day) {
        day = {
          id: `weekly-day:${week.seasonId}:${date}`,
          seasonId: week.seasonId,
          weeklyPlanId: containing.week.id,
          date,
          dayType: "goal",
          status: "planned",
          timeBlocks: [],
          createdAt: stamp,
          updatedAt: stamp,
        };
        days.push(day);
      }
      day.weeklyPlanId = containing.week.id;
      (day.timeBlocks ??= []).push(block);
      day.updatedAt = stamp;
    }
    if (p.occurrenceKey) keys.add(p.occurrenceKey);
  }
  return {
    ...next,
    dayPlans: days,
    weeklyPlans: next.weeklyPlans.map((w) =>
      w.id === weekId
        ? {
            ...w,
            updatedAt: stamp,
            ritual: {
              ...ritual,
              outcomes: draft.outcomes.map((o) => ({
                ...o,
                title: o.title.trim(),
              })),
              reflection: draft.reflection,
              confirmedAt: stamp,
              draft: undefined,
              appliedKeys: [...keys],
            },
          }
        : w,
    ),
  };
}
export type Adjustment =
  | { kind: "later" }
  | { kind: "skip" }
  | {
      kind: "reschedule" | "reduce";
      date: string;
      startTime: string;
      duration: number;
    };
export function undoPlanningChange(
  before: MonkMVPState,
  after: MonkMVPState,
  current: MonkMVPState,
): MonkMVPState {
  const stamp = revisionStamp(current);
  function restore<T extends { id: string; updatedAt?: string }>(
    old: T[],
    changed: T[],
    fresh: T[],
    keepNew: (item: T) => T,
  ): T[] {
    const ids = changed
      .filter(
        (item) =>
          JSON.stringify(item) !==
          JSON.stringify(old.find((x) => x.id === item.id)),
      )
      .map((x) => x.id);
    if (
      ids.some(
        (id) =>
          JSON.stringify(changed.find((x) => x.id === id)) !==
          JSON.stringify(fresh.find((x) => x.id === id)),
      )
    )
      throw new Error("stale");
    return [
      ...fresh.filter((x) => !ids.includes(x.id)),
      ...ids.flatMap((id) => {
        const previous = old.find((item) => item.id === id);
        const item =
          previous ?? keepNew(changed.find((item) => item.id === id)!);
        return [{ ...item, updatedAt: stamp }];
      }),
    ];
  }
  return {
    ...current,
    dayPlans: restore(
      before.dayPlans,
      after.dayPlans,
      current.dayPlans,
      (item) => ({ ...item, timeBlocks: [] }),
    ),
    weeklyPlans: restore(
      before.weeklyPlans,
      after.weeklyPlans,
      current.weeklyPlans,
      (item) => ({ ...item, ritual: undefined }),
    ),
  };
}
export function occurrenceDetails(
  state: MonkMVPState,
  date: string,
  blockId: string,
): {
  date: string;
  block: TimeBlock;
  duration: number;
  parts: Array<{ date: string; block: TimeBlock }>;
} {
  const day = state.dayPlans.find(
    (item) => item.date === date && item.seasonId === state.activeSeason?.id,
  );
  const selected = day?.timeBlocks?.find((item) => item.id === blockId);
  if (!day || !selected) throw new Error("stale");
  const parts = state.dayPlans
    .filter((item) => item.seasonId === day.seasonId)
    .flatMap((item) =>
      (item.timeBlocks ?? [])
        .filter((block) =>
          selected.occurrenceGroup
            ? block.occurrenceGroup === selected.occurrenceGroup
            : selected.occurrenceKey
              ? block.occurrenceKey === selected.occurrenceKey
              : item.id === day.id && block.id === selected.id,
        )
        .map((block) => ({ date: item.date, block })),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.block.startTime.localeCompare(b.block.startTime),
    );
  return {
    ...parts[0],
    parts,
    duration: parts.reduce(
      (total, part) =>
        total + minutes(part.block.endTime) - minutes(part.block.startTime),
      0,
    ),
  };
}
export function adjustOccurrence(
  state: MonkMVPState,
  date: string,
  blockId: string,
  adjustment: Adjustment,
): MonkMVPState {
  const occurrence = occurrenceDetails(state, date, blockId);
  const day = state.dayPlans.find(
    (d) => d.date === occurrence.date && d.seasonId === state.activeSeason?.id,
  );
  const block = occurrence.block;
  const week = state.weeklyPlans.find((w) => w.id === day?.weeklyPlanId);
  if (!day || !block || !week) throw new Error("stale");
  const stamp = revisionStamp(state);
  let next = {
    ...state,
    dayPlans: state.dayPlans.map((d) =>
      occurrence.parts.some(
        (part) => part.date === d.date && d.seasonId === day.seasonId,
      )
        ? {
            ...d,
            timeBlocks: d.timeBlocks?.filter(
              (b) =>
                !occurrence.parts.some(
                  (part) => part.date === d.date && part.block.id === b.id,
                ),
            ),
            updatedAt: stamp,
          }
        : d,
    ),
  };
  const ritual = week.ritual ?? emptyRitual();
  if (adjustment.kind === "later" || adjustment.kind === "skip") {
    return {
      ...next,
      weeklyPlans: next.weeklyPlans.map((w) =>
        w.id === week.id
          ? {
              ...w,
              updatedAt: stamp,
              ritual: {
                ...ritual,
                held: [
                  ...ritual.held,
                  {
                    id: block.id,
                    date: occurrence.date,
                    block,
                    duration: occurrence.duration,
                    status: adjustment.kind === "later" ? "later" : "skipped",
                  },
                ],
              },
            }
          : w,
      ),
    };
  }
  if (
    adjustment.kind === "reduce" &&
    (adjustment.date !== occurrence.date ||
      adjustment.startTime !== block.startTime ||
      adjustment.duration > occurrence.duration)
  )
    throw new Error("invalid");
  const containing = containingWeek(next, adjustment.date);
  next = containing.state;
  const targetWeek = containing.week;
  const draft = {
    outcomes: targetWeek.ritual?.outcomes ?? [],
    reflection: targetWeek.ritual?.reflection ?? "",
    proposals: [
      {
        id: `adjust:${block.id}:${stamp}`,
        date: adjustment.date,
        title: block.title,
        startTime: adjustment.startTime,
        duration: adjustment.duration,
        category: block.category,
        goalId: block.goalId,
        practiceId: block.practiceId,
        outcomeId: block.outcomeId,
      },
    ],
  };
  const changed = confirmWeek(next, targetWeek.id, draft);
  // Preserve completion/provenance and stable identity for this occurrence.
  const generatedId = `weekly:${draft.proposals[0].id}`;
  return {
    ...changed,
    weeklyPlans: changed.weeklyPlans.map(
      (w) =>
        next.weeklyPlans.find((old) => old.id === w.id) ?? {
          ...w,
          ritual: undefined,
        },
    ),
    dayPlans: changed.dayPlans.map((d) => ({
      ...d,
      timeBlocks: d.timeBlocks?.map((b) =>
        b.occurrenceGroup === generatedId
          ? {
              ...block,
              startTime: b.startTime,
              endTime: b.endTime,
              id: b.id === generatedId ? block.id : block.id + ":next",
              occurrenceGroup: block.occurrenceGroup ?? block.id,
            }
          : b,
      ),
    })),
  };
}
