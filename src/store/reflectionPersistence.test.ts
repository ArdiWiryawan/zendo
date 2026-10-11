import { beforeEach, describe, expect, it } from "vitest";
import type { DateOnlyString, MonkMVPState } from "../types/app";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";
import { useMonkStore } from "./useMonkStore";

function baseState(overrides: Partial<MonkMVPState> = {}): MonkMVPState {
  return {
    ...createInitialState(),
    ...overrides
  };
}

const today = getTodayDateString();

function entryFor(date: string) {
  return useMonkStore.getState().journalEntries.find((e) => e.date === date);
}

describe("reflection prompt persistence", () => {
  beforeEach(() => {
    useMonkStore.setState(baseState(), false);
  });

  it("assignReflectionPrompt creates an entry without marking the day complete", () => {
    const before = useMonkStore.getState();

    useMonkStore.getState().assignReflectionPrompt(today, "A01", "What felt steady today?");

    const state = useMonkStore.getState();
    const entry = entryFor(today);
    expect(entry).toBeDefined();
    expect(entry?.promptId).toBe("A01");
    expect(entry?.promptText).toBe("What felt steady today?");
    expect(entry?.reflectionStatus).toBe("prompt_assigned");
    expect(entry?.answers).toEqual({});
    expect(entry?.submittedAt).toBeUndefined();

    // Showing a question is not writing a journal.
    expect(state.timelineEvents).toHaveLength(before.timelineEvents.length);
    expect(state.timelineEvents.every((ev) => ev.type !== "journal_entry")).toBe(true);
    expect(state.timelineDays.find((d) => d.date === today)).toBeUndefined();
  });

  it("keeps the FIRST assigned promptId when assigned twice", () => {
    useMonkStore.getState().assignReflectionPrompt(today, "A01", "First question");
    useMonkStore.getState().assignReflectionPrompt(today, "B07", "Second question");

    const entry = entryFor(today);
    expect(entry?.promptId).toBe("A01");
    expect(entry?.promptText).toBe("First question");
    expect(useMonkStore.getState().journalEntries.filter((e) => e.date === today)).toHaveLength(1);
  });

  it("does not downgrade a submitted entry when a prompt is re-assigned", () => {
    useMonkStore.getState().assignReflectionPrompt(today, "A01", "First question");
    useMonkStore.getState().saveJournalEntry({ whatMovedToday: "Shipped the module" }, { date: today });
    expect(entryFor(today)?.reflectionStatus).toBe("submitted");

    useMonkStore.getState().assignReflectionPrompt(today, "B07", "Second question");

    const entry = entryFor(today);
    expect(entry?.reflectionStatus).toBe("submitted");
    expect(entry?.promptId).toBe("A01");
  });

  it("saveJournalEntry preserves the assigned prompt and marks it submitted", () => {
    useMonkStore.getState().assignReflectionPrompt(today, "C03", "Where did your energy go?");

    useMonkStore.getState().saveJournalEntry({ whatMovedToday: "Finished the draft" }, { date: today, tab: "reflection" });

    const entry = entryFor(today);
    expect(entry?.promptId).toBe("C03");
    expect(entry?.promptText).toBe("Where did your energy go?");
    expect(entry?.reflectionStatus).toBe("submitted");
    expect(entry?.submittedAt).toBeTruthy();
    expect(entry?.answers.whatMovedToday).toBe("Finished the draft");
  });

  it("re-saving the same date updates in place without duplicating", () => {
    useMonkStore.getState().assignReflectionPrompt(today, "D02", "What would you repeat?");
    useMonkStore.getState().saveJournalEntry({ whatMovedToday: "Session one" }, { date: today });
    const firstId = entryFor(today)?.id;
    const firstSubmittedAt = entryFor(today)?.submittedAt;

    useMonkStore.getState().saveJournalEntry({ whatMovedToday: "Session two" }, { date: today });

    const entries = useMonkStore.getState().journalEntries.filter((e) => e.date === today);
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(firstId);
    expect(entries[0].answers.whatMovedToday).toBe("Session two");
    // First submission timestamp sticks — only the first submit counts.
    expect(entries[0].submittedAt).toBe(firstSubmittedAt);
  });

  it("saves an entry with no prompt at all (backward compatibility)", () => {
    useMonkStore.getState().saveJournalEntry({ whatMovedToday: "No prompt here" }, { date: today });

    const entry = entryFor(today);
    expect(entry).toBeDefined();
    expect(entry?.promptId).toBeUndefined();
    expect(entry?.promptText).toBeUndefined();
    expect(entry?.reflectionStatus).toBe("submitted");
  });

  it("accepts opts.prompt as a fallback when no assignment exists", () => {
    useMonkStore
      .getState()
      .saveJournalEntry({ whatMovedToday: "Inline prompt" }, { date: today, prompt: { id: "E05", text: "What did you notice?" } });

    const entry = entryFor(today);
    expect(entry?.promptId).toBe("E05");
    expect(entry?.promptText).toBe("What did you notice?");
  });

  it("never overwrites a stored promptText on re-save (history fidelity)", () => {
    useMonkStore.getState().assignReflectionPrompt(today, "A01", "The wording shown that day");

    useMonkStore
      .getState()
      .saveJournalEntry({ whatMovedToday: "Answered" }, { date: today, prompt: { id: "B09", text: "Different wording" } });

    const entry = entryFor(today);
    expect(entry?.promptId).toBe("A01");
    expect(entry?.promptText).toBe("The wording shown that day");
  });

  it("keeps a morning-pages-only entry out of submitted state", () => {
    useMonkStore.getState().assignReflectionPrompt(today, "A02", "Morning question");
    useMonkStore.getState().saveJournalEntry({ morningPages: "Morning thoughts" }, { date: today, tab: "morning" });

    const entry = entryFor(today);
    expect(entry?.answers.morningPages).toBe("Morning thoughts");
    expect(entry?.answers.whatMovedToday).toBeUndefined();
    expect(entry?.reflectionStatus).toBe("prompt_assigned");
    expect(entry?.submittedAt).toBeUndefined();
  });

  it("does not overwrite a stored promptId when the existing entry has no seasonId", () => {
    useMonkStore.setState(
      baseState({
        journalEntries: [
          {
            id: "journal_legacy",
            seasonId: "",
            date: today as DateOnlyString,
            answers: {},
            promptId: "A01",
            promptText: "Legacy prompt",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
          }
        ]
      }),
      false
    );

    useMonkStore.getState().assignReflectionPrompt(today, "B07", "Newer prompt");

    const entries = useMonkStore.getState().journalEntries;
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("journal_legacy");
    expect(entries[0].promptId).toBe("A01");
    expect(entries[0].promptText).toBe("Legacy prompt");
  });
});
