import { describe, expect, it } from "vitest";
import { deletePageAtIndex, joinPages, removePhotoMarker, trimTrailingBlankPages } from "./notebookPages";

describe("joinPages", () => {
  it("joins pages with newlines", () => {
    expect(joinPages(["a", "b", "c"])).toBe("a\nb\nc");
  });
  it("single page round-trips unchanged", () => {
    expect(joinPages(["line one\nline two"])).toBe("line one\nline two");
  });
  it("joins multi-line pages preserving internal newlines", () => {
    expect(joinPages(["a\nb", "c\nd"])).toBe("a\nb\nc\nd");
  });
  it("empty page contributes a blank separator line", () => {
    expect(joinPages(["a", "", "c"])).toBe("a\n\nc");
  });
});

describe("removePhotoMarker", () => {
  it("removes only the matching marker line", () => {
    const page = "text\n{{img:abc}}\nmore\n{{img:xyz}}";
    expect(removePhotoMarker(page, "abc")).toBe("text\nmore\n{{img:xyz}}");
  });
  it("leaves the page unchanged when id absent", () => {
    const page = "text\n{{img:abc}}";
    expect(removePhotoMarker(page, "nope")).toBe(page);
  });
  it("does not touch non-marker lines", () => {
    expect(removePhotoMarker("plain {{img:abc}}", "abc")).toBe("plain {{img:abc}}");
  });
  it("removes the marker from the right page after a page-index shift", () => {
    // A photo lives on page 1; page 0 is dropped → indices shift. The marker
    // must still be found and removed from its page.
    const pages = ["dropped", "text\n{{img:abc}}\nmore"];
    const afterDrop = pages.slice(1);
    expect(afterDrop.map((p) => removePhotoMarker(p, "abc"))).toEqual(["text\nmore"]);
  });
  it("deleting a page containing the marker leaves later pages intact", () => {
    const pages = ["text\n{{img:abc}}", "after"];
    const afterDrop = pages.slice(1);
    expect(afterDrop.map((p) => removePhotoMarker(p, "abc"))).toEqual(["after"]);
    expect(joinPages(afterDrop.map((p) => removePhotoMarker(p, "abc")))).toBe("after");
  });
});

describe("trimTrailingBlankPages", () => {
  it("trims trailing blank pages from 8-page note with 3 empty sheets", () => {
    const pages = ["Page 1", "Page 2", "Page 3", "Page 4", "Page 5", "", "  ", "\n\n"];
    expect(trimTrailingBlankPages(pages)).toEqual(["Page 1", "Page 2", "Page 3", "Page 4", "Page 5"]);
  });

  it("leaves notes without trailing blanks untouched", () => {
    expect(trimTrailingBlankPages(["p1", "p2"])).toEqual(["p1", "p2"]);
  });

  it("returns single blank page for completely empty arrays", () => {
    expect(trimTrailingBlankPages([])).toEqual([""]);
    expect(trimTrailingBlankPages(["", "   "])).toEqual([""]);
  });
});

describe("deletePageAtIndex", () => {
  it("deletes page at specific index and shifts later pages", () => {
    const pages = ["Page 1", "Page 2 to delete", "Page 3"];
    expect(deletePageAtIndex(pages, 1)).toEqual(["Page 1", "Page 3"]);
  });

  it("deleting last remaining page returns single blank page", () => {
    expect(deletePageAtIndex(["Only page"], 0)).toEqual([""]);
  });
});

