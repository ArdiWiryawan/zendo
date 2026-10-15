import type { DayPlan, Goal, GoalTask } from "../types/app";

/**
 * The manual bridge to Zendo Launcher: a small, one-way JSON snapshot the user
 * moves by hand — the launcher picks it with the system file picker. It is not
 * a sync, not an account and not an API. The launcher validates every field
 * with its own strict reader, so what this file promises must match exactly.
 *
 * Contract (format v1; launcher side reads it in `data/BridgeCodec.kt`):
 *   { format: "zendo-launcher-bridge", schemaVersion: 1, source, exportedAt,
 *     localDate: "YYYY-MM-DD", timeZone?, todayAction?{id,title},
 *     highlight?{id,text}, tasks?[{id,title,isCompleted,dueDate?,sortOrder}] }
 * A snapshot dated in the future is rejected by the launcher, so the file is
 * always stamped with the local calendar date, never a UTC-rolled one.
 */

export const LAUNCHER_BRIDGE_FORMAT = "zendo-launcher-bridge";
export const LAUNCHER_BRIDGE_SCHEMA_VERSION = 1;
export const LAUNCHER_BRIDGE_SOURCE = "zendo-pwa";
/** The launcher's reader refuses more than 500 tasks; stay under it, quietly. */
export const LAUNCHER_BRIDGE_MAX_TASKS = 500;

/** Only what the snapshot needs. Real store records satisfy this structurally. */
export type LauncherBridgeDayPlan = Pick<
  DayPlan,
  "id" | "date" | "mainAction" | "highlight" | "goalId" | "updatedAt"
>;
export type LauncherBridgeGoal = Pick<Goal, "id" | "keystoneAction" | "status" | "updatedAt"> & {
  tasks?: Pick<GoalTask, "id" | "title" | "completed" | "createdAt">[];
};

export type LauncherBridgeSource = {
  dayPlans: LauncherBridgeDayPlan[];
  /** Tombstones: a cleared day plan must never leak back into an export. */
  dayPlanDeletedAt?: Record<string, string>;
  goals: LauncherBridgeGoal[];
};

export type LauncherBridgeTask = {
  id: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
};

export type LauncherBridgeSnapshot = {
  format: string;
  schemaVersion: number;
  source: string;
  exportedAt: string;
  localDate: string;
  timeZone?: string;
  todayAction?: { id: string; title: string };
  highlight?: { id: string; text: string };
  tasks?: LauncherBridgeTask[];
};

/**
 * YYYY-MM-DD in the device's own timezone. The launcher compares this against
 * its own local today and rejects a future date, so a UTC `toISOString()` slice
 * would be wrong for users east of UTC late in the evening.
 */
export function localIsoDate(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function timeZoneName(): string | undefined {
  try {
    const name = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return name && name.length <= 64 ? name : undefined;
  } catch {
    return undefined;
  }
}

function latestPlanFor(
  source: LauncherBridgeSource,
  date: string,
): LauncherBridgeDayPlan | null {
  const plans = source.dayPlans.filter(
    (p) => p.date === date && !source.dayPlanDeletedAt?.[p.id],
  );
  if (plans.length === 0) return null;
  return [...plans].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)).pop() ?? null;
}

function planActionTitle(plan: LauncherBridgeDayPlan, goals: LauncherBridgeGoal[]): string {
  const own = plan.mainAction?.trim();
  if (own) return own;
  // A plan without a typed main action still stands on its goal's keystone
  // action — better one honest line than an empty Today on the launcher.
  const goal = goals.find((g) => g.id === plan.goalId);
  return goal?.keystoneAction?.trim() ?? "";
}

/**
 * Undone tasks of active goals, oldest first so `sortOrder` stays stable across
 * exports of the same data. Completed tasks are left out on purpose: the
 * launcher's Today list is for what remains.
 */
function openTasks(goals: LauncherBridgeGoal[]): LauncherBridgeTask[] {
  const rows: { id: string; title: string; createdAt: string }[] = [];
  for (const goal of goals) {
    if (goal.status !== "active") continue;
    for (const task of goal.tasks ?? []) {
      const title = task.title?.trim();
      if (!title || task.completed) continue;
      rows.push({ id: task.id, title, createdAt: task.createdAt });
    }
  }
  rows.sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  return rows.slice(0, LAUNCHER_BRIDGE_MAX_TASKS).map((row, index) => ({
    id: row.id,
    title: row.title,
    isCompleted: false,
    sortOrder: index,
  }));
}

/**
 * Builds the snapshot for one day. Everything beyond the envelope is optional:
 * an export with nothing planned still produces a valid file, and the launcher
 * then has nothing to write — which is honest, not broken.
 */
export function buildLauncherSnapshot(
  source: LauncherBridgeSource,
  now: Date = new Date(),
): LauncherBridgeSnapshot {
  const localDate = localIsoDate(now);
  const snapshot: LauncherBridgeSnapshot = {
    format: LAUNCHER_BRIDGE_FORMAT,
    schemaVersion: LAUNCHER_BRIDGE_SCHEMA_VERSION,
    source: LAUNCHER_BRIDGE_SOURCE,
    exportedAt: now.toISOString(),
    localDate,
  };
  const zone = timeZoneName();
  if (zone) snapshot.timeZone = zone;

  const plan = latestPlanFor(source, localDate);
  if (plan) {
    const actionTitle = planActionTitle(plan, source.goals);
    if (actionTitle) snapshot.todayAction = { id: plan.id, title: actionTitle };
    const highlight = plan.highlight?.trim();
    // Stable per-day id so the launcher refreshes a previously imported
    // highlight instead of treating a later export as a second one.
    if (highlight) snapshot.highlight = { id: `${plan.id}:highlight`, text: highlight };
  }

  const tasks = openTasks(source.goals);
  if (tasks.length > 0) snapshot.tasks = tasks;
  return snapshot;
}

export function serializeLauncherSnapshot(snapshot: LauncherBridgeSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function launcherSnapshotFileName(localDate: string): string {
  return `zendo-launcher-snapshot-${localDate}.json`;
}
