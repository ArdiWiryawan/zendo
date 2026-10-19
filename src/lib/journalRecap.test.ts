import { describe, expect, it } from "vitest";
import { buildJournalRecap } from "./journalRecap";
import type { JournalEntry } from "../types/app";

const now = "2026-10-19T20:00:00.000Z";

const entry = (over: Partial<JournalEntry> = {}): JournalEntry => ({
  id: "j-1",
  seasonId: "season-1",
  date: "2026-10-19",
  answers: { whatMovedToday: "Shipped the draft" },
  createdAt: now,
  updatedAt: now,
  ...over
});

/**
 * The weekly review shows the week's journal back to the user. These pin the
 * two properties that keep that honest: only days inside the reviewed week are
 * included, and an entry with nothing written in it is not "a thought".
 */
describe("weekly journal recap", () => {
  it("includes only entries inside the window", () => {
    const recap = buildJournalRecap(
      [
        entry({ id: "before", date: "2026-10-12", answers: { whatMovedToday: "too early" } }),
        entry({ id: "in", date: "2026-10-15", answers: { whatMovedToday: "inside" } }),
        entry({ id: "after", date: "2026-10-20", answers: { whatMovedToday: "too late" } })
      ],
      "2026-10-13",
      "2026-10-19",
      "id",
      "season-1"
    );

    expect(recap.entries.map((item) => item.id)).toEqual(["in"]);
    expect(recap.entryCount).toBe(1);
    expect(recap.dayCount).toBe(7);
  });

  it("drops entries with no written answer", () => {
    const recap = buildJournalRecap(
      [
        entry({ id: "blank", answers: {} }),
        entry({ id: "morning", answers: { morningPages: "  " } }),
        entry({ id: "real", answers: { whatMovedToday: "I finally asked for help" } })
      ],
      "2026-10-19",
      "2026-10-19",
      "id"
    );

    expect(recap.entries.map((item) => item.id)).toEqual(["real"]);
    expect(recap.latestAnswer).toBe("I finally asked for help");
  });

  it("labels answers with the day's prompt and keeps other questions readable", () => {
    const recap = buildJournalRecap(
      [
        entry({
          promptText: "What did you avoid today?",
          answers: {
            whatMovedToday: "The invoice",
            whatDidILearn: "Avoidance is expensive"
          }
        })
      ],
      "2026-10-19",
      "2026-10-19",
      "en"
    );

    const answers = recap.entries[0].answers;
    expect(answers[0].question).toBe("What did you avoid today?");
    expect(answers.map((item) => item.answer)).toContain("Avoidance is expensive");
  });

  it("counts moods and orders days chronologically", () => {
    const recap = buildJournalRecap(
      [
        entry({ id: "later", date: "2026-10-18", mood: "tired", answers: { whatMovedToday: "b" } }),
        entry({ id: "earlier", date: "2026-10-14", mood: "calm", answers: { whatMovedToday: "a" } }),
        entry({ id: "same", date: "2026-10-16", mood: "calm", answers: { whatMovedToday: "c" } })
      ],
      "2026-10-13",
      "2026-10-19",
      "id"
    );

    expect(recap.entries.map((item) => item.id)).toEqual(["earlier", "same", "later"]);
    expect(recap.moodCounts).toEqual({ calm: 2, tired: 1 });
  });

  it("ignores entries from another season", () => {
    const recap = buildJournalRecap(
      [
        entry({ id: "old-season", seasonId: "season-0" }),
        entry({ id: "current", seasonId: "season-1" })
      ],
      "2026-10-13",
      "2026-10-19",
      "id",
      "season-1"
    );

    expect(recap.entries.map((item) => item.id)).toEqual(["current"]);
  });
});
