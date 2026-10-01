import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { useMonkStore } from "../store/useMonkStore";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";

function src(path: string): string {
  return readFileSync(path, "utf8");
}

/**
 * D11: the Daily Highlight and the Main Action are two different questions —
 * "what is the one thing that matters most today?" vs "what is my next
 * controllable action?" — but they shared a field boundary. MorningPlanningModal
 * seeded its highlight from `mainAction`, then committed it straight back into
 * `highlight`, and Today read `highlight` first for its headline. An untouched
 * highlight field therefore silently rewrote the main action; an edited one
 * replaced the headline. These pin the store-level facts the fix relies on.
 */
describe("highlight and main action are separate fields", () => {
  // Derived, never hardcoded: `setTodayHighlight` resolves the plan through
  // `findTodayPlan` (the real current date), so a fixed literal silently turns
  // these into clock-dependent time bombs that fail the moment the day rolls over.
  const DATE = getTodayDateString();

  beforeEach(() => {
    useMonkStore.setState(createInitialState(), false);
    const now = new Date().toISOString();
    useMonkStore.setState({
      activeSeason: {
        id: "season-1",
        name: "Test Season",
        startDate: "2026-09-01",
        endDate: "2099-09-30",
        durationDays: 30,
        status: "active",
        mode: "flow",
        goalIds: [],
        badHabitIds: [],
        createdAt: now,
        updatedAt: now
      }
    });
    useMonkStore.getState().createOrUpdateDayPlan(DATE, {
      dayType: "goal",
      mainAction: "Run 30 minutes"
    });
  });

  const plan = () =>
    useMonkStore.getState().dayPlans.find((p) => p.date === DATE)!;

  it("writing the highlight does not touch the main action", () => {
    useMonkStore.getState().setTodayHighlight("Finish the client proposal");
    expect(plan().highlight).toBe("Finish the client proposal");
    expect(plan().mainAction).toBe("Run 30 minutes");
  });

  it("clearing the highlight does not erase the main action", () => {
    useMonkStore.getState().setTodayHighlight("Ship the deck");
    useMonkStore.getState().setTodayHighlight("");
    expect(plan().highlight).toBeUndefined();
    expect(plan().mainAction).toBe("Run 30 minutes");
  });

  it("saving blocks with no highlight leaves an existing one alone", () => {
    useMonkStore.getState().setTodayHighlight("Ship the deck");
    useMonkStore.getState().saveDayTimeBlocks(DATE, [], true, undefined);
    expect(plan().highlight).toBe("Ship the deck");
    expect(plan().mainAction).toBe("Run 30 minutes");
  });

  it("the planning modal seeds the highlight only from the highlight", () => {
    const modal = src("src/components/MorningPlanningModal.tsx");
    // The old seed fell back to mainAction (and the goal's keystone action),
    // which is what let an untouched field overwrite the main action.
    expect(modal).not.toMatch(/todayPlan\?\.highlight \|\| todayPlan\?\.mainAction/);
    expect(modal).toContain('const initialHighlight = todayPlan?.highlight || "";');
  });
});
