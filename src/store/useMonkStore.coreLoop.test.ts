import { beforeEach, describe, expect, it } from "vitest";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";
import { useMonkStore } from "./useMonkStore";
import { selectCurrentWeeklyPlan, selectTodayPlan } from "./selectors";
import type { MonkMVPState, Goal, JournalAnswers, LearningSession, Season } from "../types/app";

function nowIso() {
  return new Date().toISOString();
}

/** Active season straddling today (week 1 is current, so getOrCreateCurrentWeeklyPlan touches it). */
function activeSeason(): Season {
  const today = getTodayDateString();
  return {
    id: "s_active",
    name: "Test Season",
    startDate: today,
    endDate: today, // recalculated below
    durationDays: 30,
    status: "active",
    mode: "planning",
    goalIds: [],
    badHabitIds: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function goal(id: string, seasonId: string, weeklyTargetCount: number): Goal {
  return {
    id,
    seasonId,
    title: `Goal ${id}`,
    keystoneAction: "Do the thing",
    priority: 1,
    weeklyTargetCount,
    status: "active",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function seedSeason(state: MonkMVPState, season: Season, goals: Goal[]): void {
  const start = new Date(season.startDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + season.durationDays - 1);
  const endDate = [
    end.getFullYear(),
    String(end.getMonth() + 1).padStart(2, "0"),
    String(end.getDate()).padStart(2, "0"),
  ].join("-");
  useMonkStore.setState({
    activeSeason: { ...season, endDate, goalIds: goals.map((g) => g.id) },
    goals,
  });
}

function lastState(): MonkMVPState {
  return useMonkStore.getState();
}

const journalAnswers: JournalAnswers = { whatMovedToday: "Focused on the keystone action." };

describe("core loop (integrated)", () => {
  beforeEach(() => {
    useMonkStore.setState(createInitialState(), false);
  });

  it("healthy season: weekly plan allocates goals, today's plan is pickable, focus completes the day", () => {
    seedSeason(lastState(), activeSeason(), [goal("g1", "s_active", 3)]);

    const week = useMonkStore.getState().getOrCreateCurrentWeeklyPlan();
    expect(week).toBeDefined();
    expect(week!.goalAllocations.length).toBe(1);
    expect(week!.goalAllocations[0]).toMatchObject({ goalId: "g1", targetCount: 3 });

    // Today may or may not be a planned goal day in the auto-built week; forcing
    // a goal day for today is what the Today picker does.
    useMonkStore.getState().createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal", goalId: "g1" });
    const todayPlan = selectTodayPlan(lastState());
    expect(todayPlan).toBeDefined();
    expect(todayPlan!.goalId).toBe("g1");

    const session = useMonkStore.getState().startFocusSession("deep_work");
    expect(session).toBeDefined();
    useMonkStore.getState().advanceFocusPhase(session!.id);
    useMonkStore.getState().completeFocusSession(session!.id);

    const finished = lastState().focusSessions.find((s) => s.id === session!.id)!;
    expect(finished.status).toBe("completed");

    // The day only reaches "completed" once BOTH focus and learning landed
    // (resolveDailyActivityStatus). Complete the learning half to close the loop.
    const learning: LearningSession = {
      id: "learn1",
      seasonId: "s_active",
      relatedGoalId: "g1",
      sourceType: "book",
      sourceTitle: "A book",
      startedAt: session!.startTime,
      endedAt: new Date().toISOString(),
      actualDurationSeconds: 25 * 60,
      status: "completed",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    useMonkStore.getState().saveLearningSession(learning);

    expect(selectTodayPlan(lastState())!.status).toBe("completed");
  });

  it("legacy/corrupt goal (no seasonId, no weeklyTargetCount): self-heal seeds a non-empty weekly plan allocation", () => {
    seedSeason(lastState(), activeSeason(), [goal("g_legacy", "", 0)]);

    const week = useMonkStore.getState().getOrCreateCurrentWeeklyPlan();
    expect(week).toBeDefined();
    expect(week!.goalAllocations.length).toBe(1);
    expect(week!.goalAllocations[0].goalId).toBe("g_legacy");
    expect(week!.goalAllocations[0].targetCount).toBeGreaterThanOrEqual(1);

    // Same guarantee through the read-side selector after the heal.
    const selected = selectCurrentWeeklyPlan(lastState());
    expect(selected!.goalAllocations[0]).toMatchObject({ goalId: "g_legacy" });
  });

  it("empty selection: active season with no active goals does not crash and degrades gracefully", () => {
    seedSeason(lastState(), activeSeason(), []);

    let week;
    expect(() => {
      week = useMonkStore.getState().getOrCreateCurrentWeeklyPlan();
    }).not.toThrow();
    expect(week).toBeDefined();
    expect(week!.goalAllocations).toEqual([]);

    // Today picker with no goal is still safe to run.
    expect(() => {
      useMonkStore.getState().createOrUpdateDayPlan(getTodayDateString(), { dayType: "rest" });
    }).not.toThrow();
    expect(selectTodayPlan(lastState())).toBeDefined();
  });

  it("full loop on healed legacy goal: pick today, complete focus, journal saves (no dead-end)", () => {
    seedSeason(lastState(), activeSeason(), [goal("g_legacy", "", 0)]);

    // Heal via the guard.
    const week = useMonkStore.getState().getOrCreateCurrentWeeklyPlan();
    expect(week!.goalAllocations[0]).toMatchObject({ goalId: "g_legacy" });

    // Pick the healed goal for today, start and complete a focus session.
    useMonkStore.getState().createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal", goalId: "g_legacy" });
    const session = useMonkStore.getState().startFocusSession("deep_work");
    expect(session).toBeDefined();
    expect(session!.goalId).toBe("g_legacy");
    useMonkStore.getState().advanceFocusPhase(session!.id);
    useMonkStore.getState().completeFocusSession(session!.id);

    const plan = selectTodayPlan(lastState())!;
    expect(plan.status).toBe("active"); // focus alone -> partial day

    // Learning closes the completion gate (resolveDailyActivityStatus).
    const learning: LearningSession = {
      id: "learn2",
      seasonId: "s_active",
      relatedGoalId: "g_legacy",
      sourceType: "course",
      sourceTitle: "A course",
      startedAt: session!.startTime,
      endedAt: new Date().toISOString(),
      actualDurationSeconds: 25 * 60,
      status: "completed",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    useMonkStore.getState().saveLearningSession(learning);
    expect(selectTodayPlan(lastState())!.status).toBe("completed");

    // Journal gate must not dead-end once the day is resolvable.
    useMonkStore.getState().saveJournalEntry(journalAnswers, { date: getTodayDateString() });
    const entry = lastState().journalEntries.find(
      (e) => e.seasonId === "s_active" && e.date === getTodayDateString()
    );
    expect(entry).toBeDefined();
    expect(entry!.dayPlanId).toBe(plan.id);
    expect(entry!.answers.whatMovedToday).toBe("Focused on the keystone action.");

    // The completed day feeds the timeline as a real completed day.
    const timeline = lastState().timelineDays.find((d) => d.seasonId === "s_active" && d.date === getTodayDateString());
    expect(timeline).toBeDefined();
    expect(timeline!.status).toBe("completed");
    expect(timeline!.journalCompleted).toBe(true);
  });

  it("unplanned day: journal saves standalone (no day plan required) and journalCompleted is true", () => {
    seedSeason(lastState(), activeSeason(), []);
    // No day plan, no weekly plan — journal must still save (spec: optional but encouraged).
    useMonkStore.getState().saveJournalEntry(journalAnswers);

    const entry = lastState().journalEntries.find(
      (e) => e.seasonId === "s_active" && e.date === getTodayDateString()
    );
    expect(entry).toBeDefined();
    expect(entry!.dayPlanId).toBeUndefined();
    expect(entry!.answers.whatMovedToday).toBe("Focused on the keystone action.");

    // Standalone entry still marks the date's journalCompleted without a plan.
    const timeline = lastState().timelineDays.find((d) => d.seasonId === "s_active" && d.date === getTodayDateString());
    expect(timeline).toBeDefined();
    expect(timeline!.journalCompleted).toBe(true);
    // No day plan was auto-created.
    expect(lastState().dayPlans.filter((d) => d.seasonId === "s_active" && d.date === getTodayDateString())).toHaveLength(0);
  });
});
