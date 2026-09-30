import { describe, expect, it } from "vitest";
import { PATCHES, type SoundscapeId } from "./focusMusic";

/**
 * These lock in the retune. The old beds were distracting for four mechanical
 * reasons — a forced tremolo on every voice, a constant detune throb, a 300ms
 * switch-like fade, and peaks loud enough to fight background music — and every
 * one of them was a *value*, not a bug you could see in a diff of the logic. So
 * they get asserted here rather than left to a comment.
 */
const ALL: SoundscapeId[] = [
  "dawn_mist",
  "day_still",
  "day_garden",
  "dusk_ember",
  "night_deep",
  "night_rain",
  "zen_stream",
  "forest_birds",
  "binaural_alpha",
  "singing_bowl",
];

/** Beds the noise floor carries; the partials are decoration at ghost level. */
const NOISE_LED: SoundscapeId[] = ["night_rain", "zen_stream", "forest_birds"];

/** Depth at which drift stops reading as "alive" and starts reading as vibrato. */
const MAX_DRIFT_DEPTH = 0.05;

describe("soundscape patches", () => {
  it("covers every soundscape id", () => {
    expect(Object.keys(PATCHES).sort()).toEqual([...ALL].sort());
  });

  it("fades in slowly on every patch", () => {
    for (const id of ALL) {
      // The regression was a hardcoded 300ms ramp, which sounded like a switch.
      expect(PATCHES[id].attackSec).toBeGreaterThan(1);
    }
  });

  it("keeps every bed under the work rather than in front of it", () => {
    for (const id of ALL) {
      expect(PATCHES[id].masterVol).toBeLessThanOrEqual(0.55);
    }
  });

  it("never drives a voice with a large tremolo", () => {
    for (const id of ALL) {
      for (const p of PATCHES[id].partials) {
        // Undefined means the build uses a 2% default; anything explicit must be
        // small too, because a deep slow wobble is what pulled attention away.
        if (p.lfoHz > 0) expect(p.lfoDepth ?? 0).toBeLessThanOrEqual(MAX_DRIFT_DEPTH);
      }
    }
  });

  it("leaves the binaural patch as a clean, steady two-tone beat", () => {
    const p = PATCHES.binaural_alpha;

    // Any drifting voice here would smear the beat the patch exists to produce.
    expect(p.partials.filter((v) => v.lfoHz > 0)).toHaveLength(0);

    const left = p.partials.find((v) => v.pan === -0.5);
    const right = p.partials.find((v) => v.pan === 0.5);
    expect(left?.freq).toBe(432);
    expect(right?.freq).toBe(442);
    // The old twin-voice detune stacked extra beats on top of the alpha beat.
    expect(left?.detuneCents).toBeUndefined();
    expect(right?.detuneCents).toBeUndefined();
  });

  it("gives the singing bowl inharmonic overtones", () => {
    const ratios = PATCHES.singing_bowl.partials
      .slice(1)
      .map((v) => v.freq / PATCHES.singing_bowl.partials[0].freq);

    // A real bowl is inharmonic. A 1:2:3:5 stack is a sawtooth, which is what
    // this patch used to be and why it never sounded like a bowl.
    expect(ratios[0]).toBeGreaterThan(2.5);
    for (const r of ratios) {
      expect(Math.abs(r - Math.round(r))).toBeGreaterThan(0.05);
    }
  });

  it("uses detune on at most one patch", () => {
    const withDetune = ALL.filter((id) =>
      PATCHES[id].partials.some((v) => (v.detuneCents ?? 0) > 0)
    );
    // Every voice used to carry a twin at ~1.2 cents, which beat at ~0.3Hz on
    // all ten beds. One deliberate use for warmth is fine; a habit is not.
    expect(withDetune).toEqual(["dusk_ember"]);
  });

  it("keeps the noise-led beds noise-led", () => {
    for (const id of NOISE_LED) {
      const p = PATCHES[id];
      expect(p.noise.gain).toBeGreaterThanOrEqual(0.3);
      for (const v of p.partials) expect(v.gain).toBeLessThanOrEqual(0.1);
    }
  });
});
