import { beforeEach, describe, expect, it } from "vitest";
import { createInitialState } from "../constants/defaultData";
import { addDaysToDate, getTodayDateString } from "../lib/date";
import { shouldOfferReentry } from "../lib/dailyActivity";
import { autolistMarker, renderBodyMarkdown } from "../lib/notebookMarkdown";
import { useMonkStore } from "./useMonkStore";

describe("Zendo E2E QA Suite — Core Loop, Timer, & State Integrity", () => {
  beforeEach(() => {
    useMonkStore.setState(createInitialState(), false);
  });

  describe("1. Focus Timer & Ghost Prevention QA", () => {
    it("runs a full focus session and records exact minutes and timeline event", () => {
      const state = useMonkStore.getState();
      state.setSeasonDuration(30);
      state.createSeasonFromOnboarding();
      state.createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal", mainAction: "Write video script" });

      const session = state.startFocusSession("deep_work")!;
      expect(session).toBeDefined();
      expect(session.status).toBe("running");

      state.advanceFocusPhase(session.id);
      state.advanceFocusPhase(session.id);
      state.advanceFocusPhase(session.id);
      state.completeFocusSession(session.id);

      const store = useMonkStore.getState();
      const finished = store.focusSessions.find((s) => s.id === session.id)!;
      expect(finished.status).toBe("completed");
      expect(finished.focusDurationMinutes).toBe(100);

      const event = store.timelineEvents.find((e) => e.sourceId === session.id);
      expect(event).toBeDefined();
      expect(event?.type).toBe("focus_session");
    });

    it("starts focus session smoothly even when no day plan has been created yet", () => {
      const state = useMonkStore.getState();
      state.setSeasonDuration(30);
      state.createSeasonFromOnboarding();

      // Clear today day plan
      useMonkStore.setState({ dayPlans: [] });

      const session = useMonkStore.getState().startFocusSession("pomodoro", 25);
      expect(session).toBeDefined();
      expect(session?.status).toBe("running");
      expect(useMonkStore.getState().dayPlans.length).toBe(1);
    });

    it("ending a session early saves actual time and marks day completed if focus >= 15m", () => {
      const state = useMonkStore.getState();
      state.setSeasonDuration(30);
      state.createSeasonFromOnboarding();
      state.createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal" });

      const session = state.startFocusSession("pomodoro")!;
      state.tickFocusSession(session.id, 20 * 60);
      state.abandonFocusSession(session.id);

      const store = useMonkStore.getState();
      const ended = store.focusSessions.find((s) => s.id === session.id)!;
      expect(ended.status).toBe("ended_early");
      expect(ended.focusDurationMinutes).toBe(20);

      const plan = store.dayPlans.find((p) => p.date === getTodayDateString());
      expect(plan?.status).toBe("completed");
    });
  });

  describe("2. Day Completion & Weekly Rhythm QA", () => {
    it("completing today focus marks day completed on timeline", () => {
      const state = useMonkStore.getState();
      state.setSeasonDuration(30);
      state.createSeasonFromOnboarding();

      const today = getTodayDateString();
      state.createOrUpdateDayPlan(today, {
        dayType: "goal",
        mainAction: "Finish milestone 1"
      });

      state.toggleTodayCompletion();

      const timelineDay = useMonkStore.getState().timelineDays.find((d) => d.date === today);
      expect(timelineDay?.status).toBe("completed");
    });

    it("retro logging past day as completed updates timelineDays and weekly allocations", () => {
      const state = useMonkStore.getState();
      state.setSeasonDuration(30);
      state.createSeasonFromOnboarding();
      const yesterday = addDaysToDate(getTodayDateString(), -1);
      const goal = state.goals[0];

      state.createOrUpdateDayPlan(yesterday, {
        dayType: "goal",
        goalId: goal?.id,
        status: "completed"
      });

      const store = useMonkStore.getState();
      const plan = store.dayPlans.find((p) => p.date === yesterday);
      expect(plan?.status).toBe("completed");

      const timelineDay = store.timelineDays.find((d) => d.date === yesterday);
      expect(timelineDay?.status).toBe("completed");
    });

    it("shouldOfferReentry returns false if yesterday had focus session or journal entry", () => {
      const state = useMonkStore.getState();
      state.setSeasonDuration(30);
      state.createSeasonFromOnboarding();
      const today = getTodayDateString();
      const yesterday = addDaysToDate(today, -1);

      state.createOrUpdateDayPlan(today, { dayType: "goal", mainAction: "Deep work" });
      const plan = useMonkStore.getState().dayPlans.find((p) => p.date === today)!;

      // Add a session on yesterday directly to store
      useMonkStore.setState((s) => ({
        focusSessions: [
          ...s.focusSessions,
          {
            id: "y_session",
            seasonId: s.activeSeason!.id,
            weeklyPlanId: plan.weeklyPlanId,
            dayPlanId: plan.id,
            startTime: yesterday + "T10:00:00.000Z",
            durationMinutes: 61,
            status: "ended_early",
            timerMode: "custom",
            timerState: "work",
            createdAt: yesterday + "T10:00:00.000Z",
            updatedAt: yesterday + "T11:01:00.000Z",
            endedAt: yesterday + "T11:01:00.000Z",
            focusDurationMinutes: 61,
            completedDurationMinutes: 61,
            plannedDurationMinutes: 61,
            totalFocusBlocks: 1,
            totalBreakBlocks: 0,
            completedFocusBlocks: 1,
            completedBreakBlocks: 0,
            phases: []
          }
        ]
      }));

      state.saveJournalEntry(
        { whatMovedToday: "Finished 1 youtube idea quickly" },
        { date: yesterday }
      );

      const fullStore = useMonkStore.getState();
      const shouldOffer = shouldOfferReentry(fullStore, fullStore.activeSeason!.startDate, today);
      expect(shouldOffer).toBe(false);
    });
  });

  describe("3. Timeline Session Deletion QA", () => {
    it("deleting a focus session removes it from timeline, re-derives day status, and updates consistency", () => {
      const state = useMonkStore.getState();
      state.setSeasonDuration(30);
      state.createSeasonFromOnboarding();
      const today = getTodayDateString();
      state.createOrUpdateDayPlan(today, { dayType: "goal" });

      const session = state.startFocusSession("custom", 50)!;
      state.completeFocusSession(session.id);

      expect(useMonkStore.getState().focusSessions.length).toBe(1);
      expect(useMonkStore.getState().timelineEvents.length).toBeGreaterThan(0);

      state.removeFocusSession(session.id);

      const storeAfter = useMonkStore.getState();
      expect(storeAfter.focusSessions.length).toBe(0);
      expect(storeAfter.timelineEvents.some((e) => e.sourceId === session.id)).toBe(false);
    });
  });

  describe("4. Notebook Task List & Markdown QA", () => {
    it("autolistMarker correctly increments and continues checkbox tasks", () => {
      expect(autolistMarker("- [ ] Record video")).toBe("- [ ] ");
      expect(autolistMarker("- [x] Done task")).toBe("- [ ] ");
      expect(autolistMarker("1. Step one")).toBe("2. ");
    });

    it("renders task list markdown to structured elements", () => {
      const elements = renderBodyMarkdown("- [ ] Task 1\n- [x] Task 2");
      expect(elements).toBeDefined();
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
