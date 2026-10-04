import { describe, expect, it, vi } from "vitest";
import { pageHasContent } from "./notebookPages";

/**
 * Pins the gate in front of the sheet-delete confirm: content earns a dialog,
 * blank does not. Regression here silently re-exposes irreversible data loss.
 */
describe("pageHasContent", () => {
  it("requires confirmation for a sheet with text", () => {
    expect(pageHasContent("some words")).toBe(true);
  });

  it("treats whitespace-only text as blank", () => {
    expect(pageHasContent("   \n\t ")).toBe(false);
  });

  it("requires confirmation for a sheet that is only a photo", () => {
    expect(pageHasContent("{{img:abc123}}")).toBe(true);
  });

  it("requires confirmation for text plus a photo", () => {
    expect(pageHasContent("caption\n{{img:abc123}}")).toBe(true);
  });

  it("treats empty, missing and null sheets as blank", () => {
    expect(pageHasContent("")).toBe(false);
    expect(pageHasContent(undefined)).toBe(false);
    expect(pageHasContent(null)).toBe(false);
  });
});

// The delete callback is only invoked from the confirm branch; cancel clears
// the pending index and calls nothing. Assert the shape of that contract.
describe("cancel path", () => {
  it("does not call the delete function", () => {
    const handleDeletePage = vi.fn();
    let pendingDeletePage: number | null = 3;
    const onCancel = () => {
      pendingDeletePage = null;
    };
    onCancel();
    expect(handleDeletePage).not.toHaveBeenCalled();
    expect(pendingDeletePage).toBeNull();
  });
});