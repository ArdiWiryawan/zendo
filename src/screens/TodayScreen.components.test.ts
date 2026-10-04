import { describe, expect, it } from "vitest";
import { derivePrimaryCTA, type PrimaryCTA } from "./TodayScreen.components";

type Case = {
  name: string;
  focusStatus: "running" | "paused" | undefined;
  todayCompleted: boolean;
  expected: PrimaryCTA;
};

describe("derivePrimaryCTA", () => {
  it("starts when there is no session and the day is not complete", () => {
    expect(derivePrimaryCTA(undefined, false)).toBe("start");
  });

  it("returns into a live session", () => {
    expect(derivePrimaryCTA("running", false)).toBe("return");
  });

  it("resumes a paused session", () => {
    expect(derivePrimaryCTA("paused", false)).toBe("resume");
  });

  it("reports completed once the day is done", () => {
    expect(derivePrimaryCTA(undefined, true)).toBe("completed");
  });

  describe("precedence (first match wins)", () => {
    it("completed beats a running session", () => {
      expect(derivePrimaryCTA("running", true)).toBe("completed");
    });

    it("completed beats a paused session", () => {
      expect(derivePrimaryCTA("paused", true)).toBe("completed");
    });

    it("running beats paused", () => {
      expect(derivePrimaryCTA("running", false)).toBe("return");
    });
  });

  it.each<Case>([
    { name: "idle, not done", focusStatus: undefined, todayCompleted: false, expected: "start" },
    { name: "running, not done", focusStatus: "running", todayCompleted: false, expected: "return" },
    { name: "paused, not done", focusStatus: "paused", todayCompleted: false, expected: "resume" },
    { name: "idle, done", focusStatus: undefined, todayCompleted: true, expected: "completed" },
    { name: "running, done", focusStatus: "running", todayCompleted: true, expected: "completed" },
    { name: "paused, done", focusStatus: "paused", todayCompleted: true, expected: "completed" }
  ])("$name -> $expected", ({ focusStatus, todayCompleted, expected }) => {
    expect(derivePrimaryCTA(focusStatus, todayCompleted)).toBe(expected);
  });

  it("never yields a deferred state", () => {
    const states = [undefined, "running", "paused"] as const;
    for (const focusStatus of states) {
      for (const todayCompleted of [false, true]) {
        expect(derivePrimaryCTA(focusStatus, todayCompleted)).not.toBe("deferred");
      }
    }
  });
});
