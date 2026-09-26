import { describe, it, expect } from "vitest";
import { extractWikiLinks, resolveLinkedNoteIds, findBacklinks, findRelatedNotes } from "./notebookLinks";
import type { NotebookEntry } from "../types/app";

describe("notebookLinks", () => {
  const mockNotes: NotebookEntry[] = [
    {
      id: "note-1",
      title: "Zendo Architecture",
      body: "Core ideas about [[Focus State]] and offline sync with Supabase.",
      categoryId: "cat_karier",
      tags: ["dev"],
      isPinned: false,
      paraType: "project",
      goalId: "goal-mvp",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z"
    },
    {
      id: "note-2",
      title: "Focus State",
      body: "Deep focus timers and pomodoro rhythm implementation.",
      categoryId: "cat_karier",
      tags: ["focus"],
      isPinned: false,
      paraType: "project",
      goalId: "goal-mvp",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z"
    },
    {
      id: "note-3",
      title: "Weekly Grocery List",
      body: "Apples, bananas, milk, eggs.",
      categoryId: "cat_pribadi",
      tags: [],
      isPinned: false,
      paraType: "resource",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z"
    }
  ];

  it("extracts wiki links from text", () => {
    const text = "Mentioning [[Zendo Architecture]] and [[Focus State]] in a note.";
    expect(extractWikiLinks(text)).toEqual(["Zendo Architecture", "Focus State"]);
  });

  it("resolves extracted titles to note ids", () => {
    const text = "Check [[focus state]] now.";
    const ids = resolveLinkedNoteIds(text, mockNotes);
    expect(ids).toEqual(["note-2"]);
  });

  it("finds backlinks to a target note", () => {
    const target = { id: "note-2", title: "Focus State" };
    const backlinks = findBacklinks(target, mockNotes);
    expect(backlinks.length).toBe(1);
    expect(backlinks[0].id).toBe("note-1");
  });

  it("finds related notes based on keyword overlap and goal", () => {
    const related = findRelatedNotes(mockNotes[0], mockNotes);
    expect(related.length).toBeGreaterThanOrEqual(1);
    expect(related[0].note.id).toBe("note-2");
    expect(related.some((r) => r.note.id === "note-3")).toBe(false);
  });
});
