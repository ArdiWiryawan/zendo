import { describe, expect, it } from "vitest";
import { DRAW_H, DRAW_W, fitDrawingBox, shouldAppendPoint, toCanvasPoint } from "./drawing";

describe("fitDrawingBox", () => {
  it("keeps the backing aspect ratio", () => {
    const box = fitDrawingBox(600, 2000);
    expect(box.width / box.height).toBeCloseTo(DRAW_W / DRAW_H, 5);
  });

  it("fits inside a wide box without overflowing it", () => {
    const box = fitDrawingBox(2000, 300);
    expect(box.width).toBeLessThanOrEqual(2000);
    expect(box.height).toBeLessThanOrEqual(300);
  });

  it("collapses to zero when the box has no room", () => {
    expect(fitDrawingBox(0, 400)).toEqual({ width: 0, height: 0 });
    expect(fitDrawingBox(400, 0)).toEqual({ width: 0, height: 0 });
  });
});

describe("toCanvasPoint", () => {
  const rect = { left: 10, top: 20, width: 300, height: 400 };

  it("maps the box origin to the backing origin", () => {
    expect(toCanvasPoint(10, 20, rect)).toEqual({ x: 0, y: 0 });
  });

  it("maps the box far corner to the backing far corner", () => {
    expect(toCanvasPoint(310, 420, rect)).toEqual({ x: DRAW_W, y: DRAW_H });
  });

  it("scales x and y independently", () => {
    // Halfway across a 300x400 box is halfway across 1200x1600.
    expect(toCanvasPoint(160, 220, rect)).toEqual({ x: DRAW_W / 2, y: DRAW_H / 2 });
  });

  it("does not divide by zero on an unmeasured box", () => {
    expect(toCanvasPoint(5, 5, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe("shouldAppendPoint", () => {
  it("always accepts the first point of a stroke", () => {
    expect(shouldAppendPoint(undefined, { x: 100, y: 100 })).toBe(true);
  });

  it("drops sub-threshold jitter", () => {
    expect(shouldAppendPoint({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(false);
  });

  it("keeps a real move", () => {
    expect(shouldAppendPoint({ x: 0, y: 0 }, { x: 40, y: 40 })).toBe(true);
  });
});
