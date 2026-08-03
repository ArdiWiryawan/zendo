import { describe, expect, it } from "vitest";
import { joinPages, removePhotoMarker } from "./notebookPages";

describe("joinPages", () => {
  it("joins pages with newlines", () => {
    expect(joinPages(["a", "b", "c"])).toBe("a\nb\nc");
  });
  it("single page round-trips unchanged", () => {
    expect(joinPages(["line one\nline two"])).toBe("line one\nline two");
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
});
