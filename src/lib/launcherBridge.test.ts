import { describe, expect, it } from "vitest";
import {
  LAUNCHER_BRIDGE_FORMAT,
  LAUNCHER_BRIDGE_MAX_TASKS,
  LAUNCHER_BRIDGE_SCHEMA_VERSION,
  LAUNCHER_BRIDGE_SOURCE,
  buildLauncherSnapshot,
  launcherSnapshotFileName,
  localIsoDate,
  serializeLauncherSnapshot,
  type LauncherBridgeDayPlan,
  type LauncherBridgeGoal,
} from "./launcherBridge";

// Local-time date so `localIsoDate` is machine-timezone independent.
const NOW = new Date(2026, 9, 15, 21, 30, 0);
const TODAY = "2026-10-15";

function plan(overrides: Partial<LauncherBridgeDayPlan> = {}): LauncherBridgeDayPlan {
  return {
    id: "plan-1",
    date: TODAY,
    mainAction: "Ship the settings export",
    highlight: "Protect the morning block",
    goalId: "goal-1",
    updatedAt: "2026-10-15T08:00:00.000Z",
    ...overrides,
  };
}

function goal(overrides: Partial<LauncherBridgeGoal> = {}): LauncherBridgeGoal {
  return {
    id: "goal-1",
    keystoneAction: "Write one page",
    status: "active",
    updatedAt: "2026-10-01T00:00:00.000Z",
    tasks: [],
    ...overrides,
  };
}

function task(id: string, title: string, completed = false, createdAt = "2026-10-01T00:00:00.000Z") {
  return { id, title, completed, createdAt };
}

describe("launcherBridge", () => {
  it("stamps the envelope with the format the launcher validates, in local time", () => {
    const snapshot = buildLauncherSnapshot({ dayPlans: [], goals: [] }, NOW);
    expect(snapshot.format).toBe(LAUNCHER_BRIDGE_FORMAT);
    expect(snapshot.schemaVersion).toBe(LAUNCHER_BRIDGE_SCHEMA_VERSION);
    expect(snapshot.source).toBe(LAUNCHER_BRIDGE_SOURCE);
    expect(snapshot.exportedAt).toBe(NOW.toISOString());
    expect(snapshot.localDate).toBe(TODAY);
    expect(localIsoDate(NOW)).toBe(TODAY);
  });

  it("carries today's action, highlight and open tasks", () => {
    const snapshot = buildLauncherSnapshot(
      {
        dayPlans: [plan()],
        goals: [
          goal({
            tasks: [
              task("t1", "Draft the outline"),
              task("t2", "Old task", false, "2026-09-01T00:00:00.000Z"),
            ],
          }),
        ],
      },
      NOW,
    );
    expect(snapshot.todayAction).toEqual({ id: "plan-1", title: "Ship the settings export" });
    expect(snapshot.highlight).toEqual({
      id: "plan-1:highlight",
      text: "Protect the morning block",
    });
    // Oldest first, so sortOrder stays stable across exports.
    expect(snapshot.tasks?.map((t) => t.id)).toEqual(["t2", "t1"]);
    expect(snapshot.tasks?.map((t) => t.sortOrder)).toEqual([0, 1]);
    expect(snapshot.tasks?.every((t) => t.isCompleted === false)).toBe(true);
  });

  it("falls back to the goal's keystone action when the plan has no main action", () => {
    const snapshot = buildLauncherSnapshot(
      { dayPlans: [plan({ mainAction: "  " })], goals: [goal()] },
      NOW,
    );
    expect(snapshot.todayAction?.title).toBe("Write one page");
  });

  it("takes the newest plan and never resurrects a cleared one", () => {
    const snapshot = buildLauncherSnapshot(
      {
        dayPlans: [
          plan({ id: "old", mainAction: "Old line", updatedAt: "2026-10-15T06:00:00.000Z" }),
          plan({ id: "new", mainAction: "New line", updatedAt: "2026-10-15T09:00:00.000Z" }),
        ],
        dayPlanDeletedAt: { new: "2026-10-15T10:00:00.000Z" },
        goals: [],
      },
      NOW,
    );
    expect(snapshot.todayAction?.title).toBe("Old line");
    expect(snapshot.todayAction?.id).toBe("old");
  });

  it("leaves out completed and blank tasks, paused goals, and caps at the launcher's limit", () => {
    const many = Array.from({ length: LAUNCHER_BRIDGE_MAX_TASKS + 50 }, (_, i) =>
      task(`t${String(i).padStart(4, "0")}`, `Task ${i}`, false, `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}.000Z`),
    );
    const snapshot = buildLauncherSnapshot(
      {
        dayPlans: [],
        goals: [
          goal({ id: "g-active", tasks: [task("done", "Done thing", true), task("blank", "   "), ...many] }),
          goal({ id: "g-paused", status: "paused", tasks: [task("p1", "Paused task")] }),
          goal({ id: "g-released", status: "released", tasks: [task("r1", "Released task")] }),
        ],
      },
      NOW,
    );
    expect(snapshot.tasks).toHaveLength(LAUNCHER_BRIDGE_MAX_TASKS);
    expect(snapshot.tasks?.some((t) => t.id === "done" || t.id === "blank" || t.id === "p1" || t.id === "r1")).toBe(false);
  });

  it("still produces a valid file when nothing is planned", () => {
    const snapshot = buildLauncherSnapshot({ dayPlans: [], goals: [] }, NOW);
    expect(snapshot.todayAction).toBeUndefined();
    expect(snapshot.highlight).toBeUndefined();
    expect(snapshot.tasks).toBeUndefined();
    const parsed = JSON.parse(serializeLauncherSnapshot(snapshot)) as Record<string, unknown>;
    expect(parsed.format).toBe(LAUNCHER_BRIDGE_FORMAT);
    expect(parsed.localDate).toBe(TODAY);
    expect(parsed.todayAction).toBeUndefined();
  });

  it("names the file by its local date", () => {
    expect(launcherSnapshotFileName(TODAY)).toBe(`zendo-launcher-snapshot-${TODAY}.json`);
  });
});
