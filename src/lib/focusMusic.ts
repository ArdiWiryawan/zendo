// Generative ambient focus beds (Web Audio, 100% open-source procedural, zero copyright).
// Calibrated for peaceful chill focus that blends seamlessly with background music.
import { getSharedCtx } from "./audio";

export type SoundscapeId =
  | "dawn_mist"
  | "day_still"
  | "day_garden"
  | "dusk_ember"
  | "night_deep"
  | "night_rain"
  | "zen_stream"
  | "forest_birds"
  | "binaural_alpha"
  | "singing_bowl";

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
    masterVol: 0.72,
    lowpassHz: 2400,
    noise: { lowpassHz: 1200, gain: 0.22, lfoHz: 0.05, lfoDepth: 0.08 },
    partials: [
      { freq: 246.94, gain: 0.25, pan: -0.3, lfoHz: 0.04 }, // B3
      { freq: 369.99, gain: 0.18, pan: 0.25, lfoHz: 0.055 }, // F#4
      { freq: 493.88, gain: 0.12, pan: 0.1, lfoHz: 0.03 }, // B4
    ],
  },
  day_still: {
    id: "day_still",
    masterVol: 0.75,
    lowpassHz: 2200,
    noise: { lowpassHz: 950, gain: 0.26, lfoHz: 0.07, lfoDepth: 0.09 },
    partials: [
      { freq: 220.0, gain: 0.28, pan: -0.25, lfoHz: 0.05 }, // A3
      { freq: 329.63, gain: 0.22, pan: 0.2, lfoHz: 0.06 }, // E4
      { freq: 440.0, gain: 0.14, pan: 0.15, lfoHz: 0.04 }, // A4
    ],
  },
  day_garden: {
    id: "day_garden",
    masterVol: 0.72,
    lowpassHz: 2400,
    noise: { lowpassHz: 1100, gain: 0.24, lfoHz: 0.09, lfoDepth: 0.08 },
    partials: [
      { freq: 196.0, gain: 0.26, pan: -0.2, lfoHz: 0.045 }, // G3
      { freq: 293.66, gain: 0.2, pan: 0.28, lfoHz: 0.07 }, // D4
      { freq: 392.0, gain: 0.14, pan: -0.1, lfoHz: 0.05 }, // G4
      { freq: 587.33, gain: 0.08, pan: 0.35, lfoHz: 0.08 }, // D5 soft sparkle
    ],
  },
  dusk_ember: {
    id: "dusk_ember",
    masterVol: 0.74,
    lowpassHz: 1800,
    noise: { lowpassHz: 750, gain: 0.28, lfoHz: 0.04, lfoDepth: 0.1 },
    partials: [
      { freq: 174.61, gain: 0.3, pan: -0.2, lfoHz: 0.035 }, // F3
      { freq: 261.63, gain: 0.22, pan: 0.22, lfoHz: 0.05 }, // C4
      { freq: 349.23, gain: 0.14, pan: 0.05, lfoHz: 0.03 }, // F4
    ],
  },
  night_deep: {
    id: "night_deep",
    masterVol: 0.78,
    lowpassHz: 1600,
    noise: { lowpassHz: 600, gain: 0.32, lfoHz: 0.03, lfoDepth: 0.12 },
    partials: [
      { freq: 146.83, gain: 0.32, pan: -0.15, lfoHz: 0.03 }, // D3
      { freq: 220.0, gain: 0.24, pan: 0.18, lfoHz: 0.045 }, // A3
      { freq: 293.66, gain: 0.12, pan: 0.08, lfoHz: 0.025 }, // D4
    ],
  },
  night_rain: {
    id: "night_rain",
    masterVol: 0.76,
    lowpassHz: 2200,
    noise: { lowpassHz: 1700, gain: 0.38, lfoHz: 0.12, lfoDepth: 0.14 },
    partials: [
      { freq: 164.81, gain: 0.22, pan: -0.28, lfoHz: 0.04 }, // E3
      { freq: 246.94, gain: 0.16, pan: 0.3, lfoHz: 0.06 }, // B3
      { freq: 329.63, gain: 0.1, pan: 0.0, lfoHz: 0.035 }, // E4
    ],
  },
  zen_stream: {
    id: "zen_stream",
    masterVol: 0.76,
    lowpassHz: 2300,
    noise: { lowpassHz: 1800, gain: 0.36, lfoHz: 0.15, lfoDepth: 0.14 },
    partials: [
      { freq: 174.61, gain: 0.22, pan: -0.3, lfoHz: 0.06 }, // F3 water resonance
      { freq: 261.63, gain: 0.16, pan: 0.3, lfoHz: 0.08 }, // C4
      { freq: 392.0, gain: 0.1, pan: -0.1, lfoHz: 0.05 }, // G4 ripple
    ],
  },
  forest_birds: {
    id: "forest_birds",
    masterVol: 0.72,
    lowpassHz: 2500,
    noise: { lowpassHz: 1300, gain: 0.28, lfoHz: 0.08, lfoDepth: 0.1 },
    partials: [
      { freq: 216.0, gain: 0.24, pan: -0.25, lfoHz: 0.04 }, // 216Hz Sub Harmonic
      { freq: 324.0, gain: 0.18, pan: 0.25, lfoHz: 0.06 }, // 324Hz
      { freq: 648.0, gain: 0.08, pan: 0.15, lfoHz: 0.1 }, // Gentle high canopy
    ],
  },
  binaural_alpha: {
    id: "binaural_alpha",
    masterVol: 0.8,
    lowpassHz: 1800,
    noise: { lowpassHz: 450, gain: 0.18, lfoHz: 0.02, lfoDepth: 0.05 },
    partials: [
      { freq: 216.0, gain: 0.3, pan: 0.0, lfoHz: 0.03 }, // 432 / 2 sub-octave
      { freq: 432.0, gain: 0.26, pan: -0.5, lfoHz: 0.02 }, // Left 432Hz
      { freq: 442.0, gain: 0.26, pan: 0.5, lfoHz: 0.02 }, // Right 442Hz (10Hz Alpha beat)
    ],
  },
  singing_bowl: {
    id: "singing_bowl",
    masterVol: 0.78,
    lowpassHz: 2200,
    noise: { lowpassHz: 650, gain: 0.2, lfoHz: 0.03, lfoDepth: 0.06 },
    partials: [
      { freq: 150.0, gain: 0.32, pan: 0.0, lfoHz: 0.025 }, // Base singing bowl tone
      { freq: 300.0, gain: 0.22, pan: -0.25, lfoHz: 0.04 }, // 2nd harmonic
      { freq: 450.0, gain: 0.15, pan: 0.25, lfoHz: 0.05 }, // 3rd harmonic
      { freq: 750.0, gain: 0.08, pan: -0.1, lfoHz: 0.03 }, // Warm chime shimmer
    ],
  },
};

const MORNING: SoundscapeId[] = ["dawn_mist", "day_still", "forest_birds"];
const MIDDAY: SoundscapeId[] = ["day_still", "day_garden", "zen_stream", "binaural_alpha"];
const AFTERNOON: SoundscapeId[] = ["day_garden", "dusk_ember", "zen_stream", "binaural_alpha"];
const EVENING: SoundscapeId[] = ["dusk_ember", "night_deep", "singing_bowl"];
const LATE: SoundscapeId[] = ["night_deep", "night_rain", "singing_bowl"];

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

let playing = false;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let startGeneration = 0;
let activeId: SoundscapeId | null = null;
let currentVolumeScale = 0.7; // Default 70%

export function getMusicVolume(): number {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem("zendo_ambient_volume");
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        currentVolumeScale = parsed;
        return parsed;
      }
    }
  }
  return currentVolumeScale;
}

export function setMusicVolume(volume: number) {
  const safe = Math.max(0, Math.min(1, volume));
  currentVolumeScale = safe;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem("zendo_ambient_volume", String(safe));
    } catch {
      /* ignore */
    }
  }
  if (masterGain && playing) {
    const c = getSharedCtx();
    if (c) {
      const activePatch = activeId ? PATCHES[activeId] : null;
      const target = (activePatch?.masterVol ?? 0.75) * currentVolumeScale;
      const now = c.currentTime;
      try {
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(Math.max(masterGain.gain.value, 0.0001), now);
        masterGain.gain.linearRampToValueAtTime(target, now + 0.1);
      } catch {
        /* ignore */
      }
    }
  }
}

let masterGain: GainNode | null = null;
let oscNodes: OscillatorNode[] = [];
let lfoNodes: OscillatorNode[] = [];
let noiseSources: AudioBufferSourceNode[] = [];
let extraNodes: AudioNode[] = [];

/** Soft pink/brown noise buffer for natural relaxation. */
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
    data[i] = pink * 0.28;
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
  [...oscNodes, ...lfoNodes].forEach((n) => {
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
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(vol, now + 0.3);

  const lowpass = c.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(patch.lowpassHz, now);
  lowpass.Q.setValueAtTime(0.5, now);

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
  noiseFilter.Q.setValueAtTime(0.4, now);

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
    const detune = freq * (i % 2 === 0 ? 1.0012 : 0.9988);
    makeVoice(detune, gain * 0.45, pan * -0.5);
  });
}

export type StartMusicOpts = {
  /** Override auto pick. */
  soundscape?: SoundscapeId;
  /** 0–1 scale on patch master. */
  volume?: number;
};

export function startMusic(opts: StartMusicOpts | number = {}): SoundscapeId | null {
  const options: StartMusicOpts = typeof opts === "number" ? { volume: opts } : opts;
  const volScale = options.volume ?? getMusicVolume();
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

  const c = getSharedCtx();
  if (!c) return null;

  // Unsuspend immediately in user gesture
  if (c.state === "suspended") {
    void c.resume();
  }

  activeId = id;
  const gen = ++startGeneration;
  const patch = PATCHES[id];

  try {
    buildGraph(c, patch, volScale);
    playing = true;
    activeId = id;
  } catch {
    clearGraph();
    playing = false;
    activeId = null;
  }

  // Backup assurance for async resume
  if (c.state === "suspended") {
    void c.resume().then(() => {
      if (gen !== startGeneration) return;
      if (!playing) {
        try {
          buildGraph(c, patch, volScale);
          playing = true;
          activeId = id;
        } catch {
          /* ignore */
        }
      }
    });
  }

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

  const c = getSharedCtx();
  const master = masterGain;
  if (c && master) {
    const now = c.currentTime;
    try {
      master.gain.cancelScheduledValues(now);
      const current = Math.max(master.gain.value, 0.0001);
      master.gain.setValueAtTime(current, now);
      master.gain.linearRampToValueAtTime(0.0001, now + 0.5);
    } catch {
      /* ignore */
    }
    playing = false;
    activeId = null;
    stopTimer = setTimeout(() => {
      clearGraph();
      stopTimer = null;
    }, 600);
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

