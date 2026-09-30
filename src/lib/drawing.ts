// Geometry helpers for the notebook sketchpad.
//
// The pad draws into a fixed-size backing store (DRAW_W x DRAW_H) so a sketch
// survives rotation, window resize and re-opening without ever being resampled.
// Strokes are stored in backing coordinates; the on-screen size is derived from
// whatever box the layout gives us.

export const DRAW_W = 1200;
export const DRAW_H = 1600;

/** Aspect-preserving size for the canvas element inside an arbitrary box. */
export function fitDrawingBox(wrapW: number, wrapH: number): { width: number; height: number } {
  if (wrapW <= 0 || wrapH <= 0) return { width: 0, height: 0 };
  const scale = Math.min(wrapW / DRAW_W, wrapH / DRAW_H);
  return { width: Math.floor(DRAW_W * scale), height: Math.floor(DRAW_H * scale) };
}

/** Map a viewport pointer position to backing-store coordinates. */
export function toCanvasPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number }
): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  return {
    x: ((clientX - rect.left) / rect.width) * DRAW_W,
    y: ((clientY - rect.top) / rect.height) * DRAW_H
  };
}

/** Drop jitter: a pointermove closer than a couple of units adds nothing visible. */
export function shouldAppendPoint(
  prev: { x: number; y: number } | undefined,
  next: { x: number; y: number },
  minDist = 2
): boolean {
  if (!prev) return true;
  return Math.hypot(next.x - prev.x, next.y - prev.y) >= minDist;
}
