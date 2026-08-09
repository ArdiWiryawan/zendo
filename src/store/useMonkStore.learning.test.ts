import { beforeEach, describe, expect, it } from "vitest";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";
import { useMonkStore } from "./useMonkStore";
import { selectTodayLearningSessions } from "./selectors";
import type { LearningSession, Season } from "../types/app";

function nowIso() {
  return new Date().toISOString();
}

function activeSeason(): Season {
  const today = getTodayDateString();
  return {
    id: "s_active",
    name: "Test Season",
    startDate: today,
    endDate: today,
    durationDays: 30,
    status: "active",
    mode: "planning",
    goalIds: [],
    badHabitIds: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function session(over: Partial<LearningSession> = {}): LearningSession {
  const now = nowIso();
  return {
    id: "learn1",
    seasonId: "s_active",
    relatedGoalId: null,
    sourceType: "book",
    sourceTitle: "A book",
    startedAt: now,
    endedAt: now,
    actualDurationSeconds: 25 * 60,
    lesson: "A lesson",
    status: "completed",
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

describe("learning session store actions", () => {
  beforeEach(() => {
    useMonkStore.setState(createInitialState(), false);
  });

  it("saveLearningSession appends a matching timeline event", () => {
    useMonkStore.setState({ activeSeason: activeSeason() });
    const { saveLearningSession } = useMonkStore.getState();
    saveLearningSession(session());
    const s = useMonkStore.getState();
    expect(s.learningSessions.map((x) => x.id)).toEqual(["learn1"]);
    const event = s.timelineEvents.find((ev) => ev.sourceId === "learn1");
    expect(event).toBeDefined();
    expect(event!.type).toBe("learning_session");
  });

  it("removeLearningSession removes only the target session", () => {
    useMonkStore.setState({ activeSeason: activeSeason() });
    const { saveLearningSession, removeLearningSession } = useMonkStore.getState();
    saveLearningSession(session());
    saveLearningSession(session({ id: "learn2", sourceTitle: "Another book" }));
    removeLearningSession("learn1");
    const s = useMonkStore.getState();
    expect(s.learningSessions.map((x) => x.id)).toEqual(["learn2"]);
  });

  it("removeLearningSession removes the session's timeline event", () => {
    useMonkStore.setState({ activeSeason: activeSeason() });
    const { saveLearningSession, removeLearningSession } = useMonkStore.getState();
    saveLearningSession(session());
    saveLearningSession(session({ id: "learn2", sourceTitle: "Another book" }));
    removeLearningSession("learn1");
    const s = useMonkStore.getState();
    expect(s.timelineEvents.some((ev) => ev.sourceId === "learn1")).toBe(false);
    expect(s.timelineEvents.some((ev) => ev.sourceId === "learn2")).toBe(true);
  });

  it("removeLearningSession is a no-op for an unknown id", () => {
    useMonkStore.setState({ activeSeason: activeSeason() });
    const { saveLearningSession, removeLearningSession } = useMonkStore.getState();
    saveLearningSession(session());
    removeLearningSession("nope");
    const s = useMonkStore.getState();
    expect(s.learningSessions.map((x) => x.id)).toEqual(["learn1"]);
    expect(s.timelineEvents.length).toBe(1);
  });

  it("selectTodayLearningSessions excludes non-completed sessions", () => {
    useMonkStore.setState({ activeSeason: activeSeason() });
    const { saveLearningSession } = useMonkStore.getState();
    const today = getTodayDateString();
    saveLearningSession(session());
    saveLearningSession(session({ id: "learn2", status: "cancelled" }));
    const selected = selectTodayLearningSessions(useMonkStore.getState(), today);
    expect(selected.map((x) => x.id)).toEqual(["learn1"]);
  });
});
