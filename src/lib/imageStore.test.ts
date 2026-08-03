import { describe, expect, it } from "vitest";
import { IMG_MARKER, matchImageMarkers } from "./imageStore";

describe("IMG_MARKER / matchImageMarkers", () => {
  it("matches a lone {{img:<id>}} line", () => {
    expect(IMG_MARKER.exec("{{img:abc123}}")?.[1]).toBe("abc123");
  });
  it("ignores invalid ids and non-marker lines", () => {
    expect(IMG_MARKER.exec("{{img:has space}}")).toBeNull();
    expect(IMG_MARKER.exec("text {{img:abc}}")).toBeNull();
    expect(IMG_MARKER.exec("{{img:}}")).toBeNull();
    expect(IMG_MARKER.exec("plain")).toBeNull();
  });
  it("collects referenced ids in body order (deduped)", () => {
    const ids = matchImageMarkers("a\n{{img:x}}\nb\n{{img:x}}\n{{img:y}}");
    expect([...ids].sort()).toEqual(["x", "y"]);
  });
  it("returns empty set when no markers", () => {
    expect(matchImageMarkers("just words\n- list")).toEqual(new Set());
  });
});