import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";
import { useMonkStore } from "./useMonkStore";

const DATE = getTodayDateString();
const T = (h: number, m = 0) => new Date(Date.UTC(2026, 8, 7, h, m, 0));

function boot() {
  useMonkStore.setState(createInitialState(), false);
  useMonkStore.getState().setSeasonDuration(30);
  useMonkStore.getState().createSeasonFromOnboarding();
  useMonkStore
    .getState()
    .createOrUpdateDayPlan(DATE, { dayType: "goal", mainAction: "Keystone" });
}

const find = (id: string) =>
  useMonkStore.getState().focusSessions.find((x) => x.id === id)!;

/**
 * Regression suite for the paused wall-clock leak in abandonFocusSession.
 *
 * The bug: abandoning a PAUSED session credited
 * `Date.now() - startTime`, which counted the entire pause duration as focus
 * time. A session paused at 25m and abandoned 30m later was credited 55m of
 * focus. Credit must reflect only the time the session was actually running.
 */
describe("abandonFocusSession — credits running time only", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T(8));
    boot();
  });
  afterEach(() => vi.useRealTimers());

  it("pause ~0 elapsed, wait 30m, abandon → credited 0", () => {
    const s = useMonkStore.getState().startFocusSession("deep_work", 50)!;
    useMonkStore.getState().pauseFocusSession(s.id);
    vi.setSystemTime(T(8, 30));
    useMonkStore.getState().abandonFocusSession(s.id);
    const a = find(s.id);
    expect(a.status).toBe("ended_early");
    expect(a.focusDurationSeconds).toBe(0);
  });

  it("pause at 25m, wait 30m, abandon → 25m, not 55m", () => {
    const s = useMonkStore.getState().startFocusSession("deep_work", 50)!;
    vi.setSystemTime(T(8, 25));
    useMonkStore.getState().pauseFocusSession(s.id);
    vi.setSystemTime(T(8, 55));
    useMonkStore.getState().abandonFocusSession(s.id);
    expect(find(s.id).focusDurationSeconds).toBe(25 * 60);
  });

  it("pause → resume → abandon credits only running spans, not the pause", () => {
    // Run 8:00→8:10 (10m), pause 8:10→8:40 (30m — must NOT count),
    // run 8:40→8:45 (5m). Running time = 15m.
    const s = useMonkStore.getState().startFocusSession("deep_work", 50)!;
    vi.setSystemTime(T(8, 10));
    useMonkStore.getState().pauseFocusSession(s.id);
    vi.setSystemTime(T(8, 40));
    useMonkStore.getState().resumeFocusSession(s.id);
    vi.setSystemTime(T(8, 45));
    useMonkStore.getState().abandonFocusSession(s.id);
    expect(find(s.id).focusDurationSeconds).toBe(15 * 60);
  });

  it("abandon while running uses wall clock when no ticker cached elapsed (control)", () => {
    const s = useMonkStore.getState().startFocusSession("deep_work", 50)!;
    vi.setSystemTime(T(8, 12));
    useMonkStore.getState().abandonFocusSession(s.id);
    expect(find(s.id).focusDurationSeconds).toBe(12 * 60);
  });

  it("double pause is a no-op and does not extend credited time", () => {
    const s = useMonkStore.getState().startFocusSession("deep_work", 50)!;
    vi.setSystemTime(T(8, 10));
    useMonkStore.getState().pauseFocusSession(s.id);
    vi.setSystemTime(T(8, 40));
    useMonkStore.getState().pauseFocusSession(s.id);
    expect(find(s.id).elapsedSeconds).toBe(10 * 60);
  });

  it("abandon after complete is refused", () => {
    const s = useMonkStore.getState().startFocusSession("deep_work", 50)!;
    vi.setSystemTime(T(8, 50));
    useMonkStore.getState().completeFocusSession(s.id);
    const before = find(s.id).status;
    useMonkStore.getState().abandonFocusSession(s.id);
    expect(find(s.id).status).toBe(before);
  });

  it("abandon twice is refused and emits no duplicate timeline event", () => {
    const s = useMonkStore.getState().startFocusSession("deep_work", 50)!;
    vi.setSystemTime(T(8, 10));
    useMonkStore.getState().abandonFocusSession(s.id);
    const first = find(s.id).focusDurationSeconds;
    const ev1 = useMonkStore.getState().timelineEvents.length;
    vi.setSystemTime(T(8, 40));
    useMonkStore.getState().abandonFocusSession(s.id);
    expect(find(s.id).focusDurationSeconds).toBe(first);
    expect(useMonkStore.getState().timelineEvents.length).toBe(ev1);
  });

  it("pause after a tick cached a larger elapsed keeps the cached value", () => {
    const s = useMonkStore.getState().startFocusSession("deep_work", 50)!;
    vi.setSystemTime(T(8, 30));
    useMonkStore.getState().tickFocusSession(s.id, 30 * 60);
    useMonkStore.getState().pauseFocusSession(s.id);
    vi.setSystemTime(T(9, 0));
    useMonkStore.getState().abandonFocusSession(s.id);
    expect(find(s.id).focusDurationSeconds).toBe(30 * 60);
  });

  it("abandon while paused is clamped to the phase length, never wall clock", () => {
    const s = useMonkStore.getState().startFocusSession("deep_work", 50)!;
    vi.setSystemTime(T(9)); // 60m > 50m phase
    useMonkStore.getState().pauseFocusSession(s.id);
    vi.setSystemTime(T(20)); // 11h later
    useMonkStore.getState().abandonFocusSession(s.id);
    expect(find(s.id).focusDurationSeconds).toBe(50 * 60);
  });
});
