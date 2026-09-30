import { describe, expect, it } from "vitest";
import { pickSoundscape } from "./focusMusic";

describe("pickSoundscape", () => {
  it("morning band stays in morning pool", () => {
    const d = new Date(2026, 6, 26, 7, 0, 0);
    expect(["dawn_mist", "day_still", "forest_birds"]).toContain(pickSoundscape(d));
  });

  it("midday band stays in day pool", () => {
    const d = new Date(2026, 6, 26, 11, 0, 0);
    expect(["day_still", "day_garden", "zen_stream", "binaural_alpha"]).toContain(pickSoundscape(d));
  });

  it("late night band stays in night pool", () => {
    const d = new Date(2026, 6, 26, 23, 30, 0);
    expect(["night_deep", "night_rain", "singing_bowl"]).toContain(pickSoundscape(d));
  });

  it("same day+hour is stable", () => {
    const a = new Date(2026, 0, 15, 10, 0, 0);
    const b = new Date(2026, 0, 15, 10, 45, 0);
    expect(pickSoundscape(a)).toBe(pickSoundscape(b));
  });

  it("different days can differ within band", () => {
    const picks = new Set(
      Array.from({ length: 14 }, (_, i) =>
        pickSoundscape(new Date(2026, 0, 1 + i, 10, 0, 0))
      )
    );
    expect(picks.size).toBeGreaterThanOrEqual(1);
    for (const p of picks) expect(["day_still", "day_garden", "zen_stream", "binaural_alpha"]).toContain(p);
  });
});
