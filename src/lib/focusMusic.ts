// Generative ambient focus beds (Web Audio, no assets).
// Soundscape auto-picks from time-of-day + day seed so sessions feel different.

export type SoundscapeId =
  | "dawn_mist"
  | "day_still"
  | "day_garden"
  | "dusk_ember"
  | "night_deep"
  | "night_rain";

export type SoundscapeMeta = {
  id: SoundscapeId;
  /** i18n key under focus.soundscape.* */
  labelKey: `focus.soundscape.${SoundscapeId}`;
};

type PartialVoice = { freq: number; gain: number; pan: number; lfoHz: number };

type SoundscapePatch = {
  id: SoundscapeId;
  masterVol: number;
  lowpassHz: number;
  noise: { lowpassHz: number; gain: number; lfoHz: number; lfoDepth: number };
  partials: PartialVoice[];
};

const PATCHES: Record<SoundscapeId, SoundscapePatch> = {
  dawn_mist: {
    id: "dawn_mist",
    masterVol: 0.32,
    lowpassHz: 2800,
    noise: { lowpassHz: 1200, gain: 0.09, lfoHz: 0.05, lfoDepth: 0.025 },
    partials: [
      { freq: 246.94, gain: 0.07, pan: -0.3, lfoHz: 0.04 }, // B3
      { freq: 369.99, gain: 0.055, pan: 0.25, lfoHz: 0.055 }, // F#4
      { freq: 493.88, gain: 0.035, pan: 0.1, lfoHz: 0.03 }, // B4
    ],
  },
  day_still: {
    id: "day_still",
    masterVol: 0.35,
    lowpassHz: 2400,
    noise: { lowpassHz: 900, gain: 0.12, lfoHz: 0.07, lfoDepth: 0.03 },
    partials: [
      { freq: 220.0, gain: 0.09, pan: -0.25, lfoHz: 0.05 }, // A3
      { freq: 329.63, gain: 0.07, pan: 0.2, lfoHz: 0.06 }, // E4
      { freq: 440.0, gain: 0.045, pan: 0.15, lfoHz: 0.04 }, // A4
    ],
  },
  day_garden: {
    id: "day_garden",
    masterVol: 0.33,
    lowpassHz: 2600,
    noise: { lowpassHz: 1100, gain: 0.1, lfoHz: 0.09, lfoDepth: 0.028 },
    partials: [
      { freq: 196.0, gain: 0.08, pan: -0.2, lfoHz: 0.045 }, // G3
      { freq: 293.66, gain: 0.065, pan: 0.28, lfoHz: 0.07 }, // D4
      { freq: 392.0, gain: 0.04, pan: -0.1, lfoHz: 0.05 }, // G4
      { freq: 587.33, gain: 0.02, pan: 0.35, lfoHz: 0.08 }, // D5 soft sparkle
    ],
  },
  dusk_ember: {
    id: "dusk_ember",
    masterVol: 0.34,
    lowpassHz: 1900,
    noise: { lowpassHz: 700, gain: 0.11, lfoHz: 0.04, lfoDepth: 0.035 },
    partials: [
      { freq: 174.61, gain: 0.1, pan: -0.2, lfoHz: 0.035 }, // F3
      { freq: 261.63, gain: 0.07, pan: 0.22, lfoHz: 0.05 }, // C4
      { freq: 349.23, gain: 0.04, pan: 0.05, lfoHz: 0.03 }, // F4
    ],
  },
  night_deep: {
    id: "night_deep",
    masterVol: 0.36,
    lowpassHz: 1600,
    noise: { lowpassHz: 550, gain: 0.14, lfoHz: 0.03, lfoDepth: 0.04 },
    partials: [
      { freq: 146.83, gain: 0.11, pan: -0.15, lfoHz: 0.03 }, // D3
      { freq: 220.0, gain: 0.08, pan: 0.18, lfoHz: 0.045 }, // A3
      { freq: 293.66, gain: 0.035, pan: 0.08, lfoHz: 0.025 }, // D4
    ],
  },
  night_rain: {
    id: "night_rain",
    masterVol: 0.34,
    lowpassHz: 2000,
    noise: { lowpassHz: 1600, gain: 0.16, lfoHz: 0.12, lfoDepth: 0.05 },
    partials: [
      { freq: 164.81, gain: 0.07, pan: -0.28, lfoHz: 0.04 }, // E3
      { freq: 246.94, gain: 0.05, pan: 0.3, lfoHz: 0.06 }, // B3
      { freq: 329.63, gain: 0.03, pan: 0.0, lfoHz: 0.035 }, // E4
    ],
  },
};

const MORNING: SoundscapeId[] = ["dawn_mist", "day_still"];
const MIDDAY: SoundscapeId[] = ["day_still", "day_garden"];
const AFTERNOON: SoundscapeId[] = ["day_garden", "dusk_ember"];
const EVENING: SoundscapeId[] = ["dusk_ember", "night_deep"];
const LATE: SoundscapeId[] = ["night_deep", "night_rain"];

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

/** Stable pick: hour band + day-of-year so same morning ≠ every morning. */
export function pickSoundscape(now = new Date()): SoundscapeId {
  const hour = now.getHours();
  const pool =
    hour >= 5 && hour < 9
      ? MORNING
      : hour >= 9 && hour < 15
        ? MIDDAY
        : hour >= 15 && hour < 18
          ? AFTERNOON
          : hour >= 18 && hour < 22
            ? EVENING
            : LATE;
  const seed = dayOfYear(now) + now.getDay() * 3 + Math.floor(hour / 3);
  return pool[seed % pool.length];
}

export function getSoundscapeMeta(id: SoundscapeId): SoundscapeMeta {
  return { id, labelKey: `focus.soundscape.${id}` };
}

let ctx: AudioContext | null = null;
let playing = false;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let startGeneration = 0;
let activeId: SoundscapeId | null = null;

let masterGain: GainNode | null = null;
let oscNodes: OscillatorNode[] = [];
let lfoNodes: OscillatorNode[] = [];
let noiseSources: AudioBufferSourceNode[] = [];
let extraNodes: AudioNode[] = [];

function getCtx(): AudioContext | null {
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  return ctx;
}

async function ensureRunning(c: AudioContext) {
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      /* autoplay / policy */
    }
  }
}

/** Soft pink-ish noise buffer. */
function createNoiseBuffer(c: AudioContext, seconds = 3): AudioBuffer {
  const length = Math.floor(c.sampleRate * seconds);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    data[i] = pink * 0.18;
  }
  const fade = Math.min(1024, Math.floor(length / 16));
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    data[i] *= t;
    data[length - 1 - i] *= t;
  }
  return buffer;
}

function clearGraph() {
  ;[...oscNodes, ...lfoNodes].forEach((n) => {
    try {
      n.stop();
    } catch {
      /* already stopped */
    }
    try {
      n.disconnect();
    } catch {
      /* ok */
    }
  });
  noiseSources.forEach((n) => {
    try {
      n.stop();
    } catch {
      /* already stopped */
    }
    try {
      n.disconnect();
    } catch {
      /* ok */
    }
  });
  extraNodes.forEach((n) => {
    try {
      n.disconnect();
    } catch {
      /* ok */
    }
  });
  if (masterGain) {
    try {
      masterGain.disconnect();
    } catch {
      /* ok */
    }
  }
  oscNodes = [];
  lfoNodes = [];
  noiseSources = [];
  extraNodes = [];
  masterGain = null;
}

function buildGraph(c: AudioContext, patch: SoundscapePatch, volScale: number) {
  const now = c.currentTime;
  const vol = patch.masterVol * volScale;

  const master = c.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(vol, now + 0.6);

  const lowpass = c.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(patch.lowpassHz, now);
  lowpass.Q.setValueAtTime(0.4, now);

  const bus = c.createGain();
  bus.gain.setValueAtTime(1, now);
  bus.connect(lowpass);
  lowpass.connect(master);
  master.connect(c.destination);

  masterGain = master;
  extraNodes.push(bus, lowpass);

  const noiseBuf = createNoiseBuffer(c, 3);
  const noise = c.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;

  const noiseFilter = c.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.setValueAtTime(patch.noise.lowpassHz, now);
  noiseFilter.Q.setValueAtTime(0.35, now);

  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(patch.noise.gain, now);

  const noiseLfo = c.createOscillator();
  const noiseLfoG = c.createGain();
  noiseLfo.type = "sine";
  noiseLfo.frequency.setValueAtTime(patch.noise.lfoHz, now);
  noiseLfoG.gain.setValueAtTime(patch.noise.lfoDepth, now);
  noiseLfo.connect(noiseLfoG);
  noiseLfoG.connect(noiseGain.gain);
  noiseLfo.start(now);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(bus);
  noise.start(now);

  noiseSources.push(noise);
  lfoNodes.push(noiseLfo);
  extraNodes.push(noiseFilter, noiseGain, noiseLfoG);

  patch.partials.forEach(({ freq, gain, pan, lfoHz }, i) => {
    const makeVoice = (f: number, g: number, p: number) => {
      const osc = c.createOscillator();
      const gNode = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now);
      gNode.gain.setValueAtTime(g, now);

      const lfo = c.createOscillator();
      const lfoG = c.createGain();
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(lfoHz + i * 0.01, now);
      lfoG.gain.setValueAtTime(g * 0.15, now);
      lfo.connect(lfoG);
      lfoG.connect(gNode.gain);
      lfo.start(now);

      const stereo = typeof c.createStereoPanner === "function" ? c.createStereoPanner() : null;
      if (stereo) {
        stereo.pan.setValueAtTime(p, now);
        osc.connect(gNode);
        gNode.connect(stereo);
        stereo.connect(bus);
        extraNodes.push(stereo);
      } else {
        osc.connect(gNode);
        gNode.connect(bus);
      }

      osc.start(now);
      oscNodes.push(osc);
      lfoNodes.push(lfo);
      extraNodes.push(gNode, lfoG);
    };

    makeVoice(freq, gain, pan);
    const detune = freq * (i % 2 === 0 ? 1.0015 : 0.9985);
    makeVoice(detune, gain * 0.4, pan * -0.5);
  });
}

export type StartMusicOpts = {
  /** Override auto pick. */
  soundscape?: SoundscapeId;
  /** 0–1 scale on patch master (default 1). */
  volume?: number;
};

export function startMusic(opts: StartMusicOpts | number = {}): SoundscapeId | null {
  // Back-compat: startMusic(0.35)
  const options: StartMusicOpts = typeof opts === "number" ? { volume: opts / 0.35 } : opts;
  const volScale = options.volume ?? 1;
  const id = options.soundscape ?? pickSoundscape();

  if (playing) {
    if (activeId === id) return id;
    stopMusic();
  }
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
  clearGraph();

  const c = getCtx();
  if (!c) return null;

  // Optimistic id for UI before async resume completes
  activeId = id;
  const gen = ++startGeneration;
  const patch = PATCHES[id];

  void ensureRunning(c).then(() => {
    if (gen !== startGeneration) return;
    if (playing) return;
    if (c.state === "suspended") {
      void c.resume();
    }
    try {
      buildGraph(c, patch, volScale);
      playing = true;
      activeId = id;
    } catch {
      clearGraph();
      playing = false;
      activeId = null;
    }
  });
  return id;
}

export function stopMusic() {
  startGeneration++;
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }

  if (!playing && !masterGain) {
    clearGraph();
    activeId = null;
    return;
  }

  const c = ctx;
  const master = masterGain;
  if (c && master) {
    const now = c.currentTime;
    try {
      master.gain.cancelScheduledValues(now);
      const current = Math.max(master.gain.value, 0.0001);
      master.gain.setValueAtTime(current, now);
      master.gain.linearRampToValueAtTime(0.0001, now + 0.8);
    } catch {
      /* ignore */
    }
    playing = false;
    activeId = null;
    stopTimer = setTimeout(() => {
      clearGraph();
      stopTimer = null;
    }, 900);
    return;
  }

  clearGraph();
  playing = false;
  activeId = null;
}

export function toggleMusic(opts?: StartMusicOpts): { on: boolean; soundscape: SoundscapeId | null } {
  if (playing) {
    stopMusic();
    return { on: false, soundscape: null };
  }
  const soundscape = startMusic(opts);
  return { on: true, soundscape };
}

export function isMusicOn(): boolean {
  return playing;
}

export function getActiveSoundscape(): SoundscapeId | null {
  return activeId;
}

/** Upcoming auto pick (for UI before start). */
export function peekAutoSoundscape(now = new Date()): SoundscapeMeta {
  return getSoundscapeMeta(pickSoundscape(now));
}
