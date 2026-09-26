/**
 * Shared AudioContext helper — browsers start suspended until a user gesture.
 * Timer-fired sounds must reuse a context that was already resumed by a click.
 */
let sharedCtx: AudioContext | null = null;
let audioUnlocked = false;

export function getSharedCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const C = window.AudioContext || (window as any).webkitAudioContext;
  if (!C) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new C();
  }
  return sharedCtx;
}

/** Call from any user gesture (clicks/keys) so later timer bells can play reliably on desktop & mobile. */
export function unlockAudio() {
  const ctx = getSharedCtx();
  if (!ctx) return;
  if (ctx.state === "suspended" || (ctx.state as string) === "interrupted") {
    void ctx.resume();
  }
  // Silent blip primes mobile & desktop browser audio engine
  try {
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    const o = ctx.createOscillator();
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.01);
    audioUnlocked = true;
  } catch {
    /* ignore */
  }
}

export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}

// Self-register global user-interaction listeners once in browser
if (typeof window !== "undefined") {
  const primeAudio = () => {
    unlockAudio();
    if (audioUnlocked) {
      window.removeEventListener("pointerdown", primeAudio, true);
      window.removeEventListener("keydown", primeAudio, true);
      window.removeEventListener("touchstart", primeAudio, true);
    }
  };
  window.addEventListener("pointerdown", primeAudio, { capture: true, passive: true });
  window.addEventListener("keydown", primeAudio, { capture: true, passive: true });
  window.addEventListener("touchstart", primeAudio, { capture: true, passive: true });
}

/** Safe runner that always ensures AudioContext is resumed before playing */
function withAudioContext(fn: (ctx: AudioContext) => void) {
  const ctx = getSharedCtx();
  if (!ctx) return;
  if (ctx.state === "suspended" || (ctx.state as string) === "interrupted") {
    void ctx
      .resume()
      .then(() => {
        try {
          fn(ctx);
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        try {
          fn(ctx);
        } catch {
          /* ignore */
        }
      });
  } else {
    try {
      fn(ctx);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Tibetan singing bowl / zen bell via Web Audio.
 * Uses shared context + resume so it works from session timers too.
 */
export function playZenBell() {
  withAudioContext((ctx) => {
    const now = ctx.currentTime;
    const freqs = [440, 554.37, 659.25, 880];

    freqs.forEach((f, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now);

      const duration = 4.0 - index * 0.7;
      const initialVolume = index === 0 ? 0.35 : 0.14;

      gainNode.gain.setValueAtTime(initialVolume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });
  });
}

/**
 * Break transition chime — 2 gentle rising harmonious bell tones.
 * Signals the start of a refreshing break.
 */
export function playBreakChime() {
  withAudioContext((ctx) => {
    const now = ctx.currentTime;
    const notes = [
      { f: 523.25, time: 0, dur: 2.2, vol: 0.28 }, // C5
      { f: 659.25, time: 0.22, dur: 2.8, vol: 0.24 }, // E5
    ];

    notes.forEach(({ f, time, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + time);

      gain.gain.setValueAtTime(0.0001, now + time);
      gain.gain.linearRampToValueAtTime(vol, now + time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  });
}

/**
 * Focus return chime — crisp double bell reminding user to enter deep focus.
 */
export function playFocusChime() {
  withAudioContext((ctx) => {
    const now = ctx.currentTime;
    const notes = [
      { f: 659.25, time: 0, dur: 2.0, vol: 0.25 }, // E5
      { f: 523.25, time: 0.25, dur: 3.0, vol: 0.30 }, // C5 (grounding)
    ];

    notes.forEach(({ f, time, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + time);

      gain.gain.setValueAtTime(0.0001, now + time);
      gain.gain.linearRampToValueAtTime(vol, now + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  });
}

/**
 * Task / Keystone Action Done SFX — rewarding zen chord celebrating today's completion.
 */
export function playCompletionChime() {
  withAudioContext((ctx) => {
    const now = ctx.currentTime;
    const chord = [
      { f: 523.25, delay: 0.0, dur: 2.4, vol: 0.22 },   // C5
      { f: 659.25, delay: 0.06, dur: 2.6, vol: 0.20 },  // E5
      { f: 783.99, delay: 0.12, dur: 3.0, vol: 0.22 },  // G5
      { f: 1046.50, delay: 0.18, dur: 3.5, vol: 0.16 }, // C6
    ];

    chord.forEach(({ f, delay, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + delay);

      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.linearRampToValueAtTime(vol, now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + dur);
    });
  });
}
