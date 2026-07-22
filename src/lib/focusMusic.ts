// Zendo "still air" — generative ambient for focus sessions (Web Audio, no assets)

let ctx: AudioContext | null = null
let playing = false
let stopTimer: ReturnType<typeof setTimeout> | null = null
let startGeneration = 0

let masterGain: GainNode | null = null
let oscNodes: OscillatorNode[] = []
let lfoNodes: OscillatorNode[] = []
let noiseSources: AudioBufferSourceNode[] = []
let extraNodes: AudioNode[] = []

function getCtx(): AudioContext | null {
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  return ctx
}

async function ensureRunning(c: AudioContext) {
  if (c.state === "suspended") {
    try {
      await c.resume()
    } catch {
      /* autoplay / policy */
    }
  }
}

/** Soft pink-ish noise buffer. */
function createNoiseBuffer(c: AudioContext, seconds = 3): AudioBuffer {
  const length = Math.floor(c.sampleRate * seconds)
  const buffer = c.createBuffer(1, length, c.sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0
  let b1 = 0
  let b2 = 0
  let b3 = 0
  let b4 = 0
  let b5 = 0
  let b6 = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
    b6 = white * 0.115926
    data[i] = pink * 0.18
  }
  const fade = Math.min(1024, Math.floor(length / 16))
  for (let i = 0; i < fade; i++) {
    const t = i / fade
    data[i] *= t
    data[length - 1 - i] *= t
  }
  return buffer
}

function clearGraph() {
  ;[...oscNodes, ...lfoNodes].forEach((n) => {
    try {
      n.stop()
    } catch {
      /* already stopped */
    }
    try {
      n.disconnect()
    } catch {
      /* ok */
    }
  })
  noiseSources.forEach((n) => {
    try {
      n.stop()
    } catch {
      /* already stopped */
    }
    try {
      n.disconnect()
    } catch {
      /* ok */
    }
  })
  extraNodes.forEach((n) => {
    try {
      n.disconnect()
    } catch {
      /* ok */
    }
  })
  if (masterGain) {
    try {
      masterGain.disconnect()
    } catch {
      /* ok */
    }
  }
  oscNodes = []
  lfoNodes = []
  noiseSources = []
  extraNodes = []
  masterGain = null
}

/**
 * Still-air graph:
 * - Noise bed (audible soft air)
 * - Open fifths in phone-speaker range (A3/E4/A4) — not sub-bass
 * - Master lowpass keeps it calm without killing presence
 */
function buildGraph(c: AudioContext, vol: number) {
  const now = c.currentTime

  const master = c.createGain()
  // Short fade so user hears feedback immediately on tap
  master.gain.setValueAtTime(0, now)
  master.gain.linearRampToValueAtTime(vol, now + 0.6)

  const lowpass = c.createBiquadFilter()
  lowpass.type = "lowpass"
  lowpass.frequency.setValueAtTime(2400, now)
  lowpass.Q.setValueAtTime(0.4, now)

  const bus = c.createGain()
  bus.gain.setValueAtTime(1, now)
  bus.connect(lowpass)
  lowpass.connect(master)
  master.connect(c.destination)

  masterGain = master
  extraNodes.push(bus, lowpass)

  // --- Soft noise bed ---
  const noiseBuf = createNoiseBuffer(c, 3)
  const noise = c.createBufferSource()
  noise.buffer = noiseBuf
  noise.loop = true

  const noiseFilter = c.createBiquadFilter()
  noiseFilter.type = "lowpass"
  noiseFilter.frequency.setValueAtTime(900, now)
  noiseFilter.Q.setValueAtTime(0.35, now)

  const noiseGain = c.createGain()
  // Base only — LFO depth applied as unipolar offset via setValueCurve is overkill;
  // keep a gentle gain so phone speakers actually move air.
  noiseGain.gain.setValueAtTime(0.12, now)

  const noiseLfo = c.createOscillator()
  const noiseLfoG = c.createGain()
  noiseLfo.type = "sine"
  noiseLfo.frequency.setValueAtTime(0.07, now)
  // Keep depth small so gain never collapses near 0
  noiseLfoG.gain.setValueAtTime(0.03, now)
  noiseLfo.connect(noiseLfoG)
  noiseLfoG.connect(noiseGain.gain)
  noiseLfo.start(now)

  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(bus)
  noise.start(now)

  noiseSources.push(noise)
  lfoNodes.push(noiseLfo)
  extraNodes.push(noiseFilter, noiseGain, noiseLfoG)

  // Phone-audible open fifths (A3, E4, A4) — 82Hz was inaudible on most devices
  const partials: { freq: number; gain: number; pan: number; lfoHz: number }[] = [
    { freq: 220.0, gain: 0.09, pan: -0.25, lfoHz: 0.05 }, // A3
    { freq: 329.63, gain: 0.07, pan: 0.2, lfoHz: 0.06 }, // E4
    { freq: 440.0, gain: 0.045, pan: 0.15, lfoHz: 0.04 } // A4
  ]

  partials.forEach(({ freq, gain, pan, lfoHz }, i) => {
    const makeVoice = (f: number, g: number, p: number) => {
      const osc = c.createOscillator()
      const gNode = c.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(f, now)
      gNode.gain.setValueAtTime(g, now)

      const lfo = c.createOscillator()
      const lfoG = c.createGain()
      lfo.type = "sine"
      lfo.frequency.setValueAtTime(lfoHz + i * 0.01, now)
      lfoG.gain.setValueAtTime(g * 0.15, now)
      lfo.connect(lfoG)
      lfoG.connect(gNode.gain)
      lfo.start(now)

      const stereo = typeof c.createStereoPanner === "function" ? c.createStereoPanner() : null
      if (stereo) {
        stereo.pan.setValueAtTime(p, now)
        osc.connect(gNode)
        gNode.connect(stereo)
        stereo.connect(bus)
        extraNodes.push(stereo)
      } else {
        osc.connect(gNode)
        gNode.connect(bus)
      }

      osc.start(now)
      oscNodes.push(osc)
      lfoNodes.push(lfo)
      extraNodes.push(gNode, lfoG)
    }

    makeVoice(freq, gain, pan)
    const detune = freq * (i % 2 === 0 ? 1.0015 : 0.9985)
    makeVoice(detune, gain * 0.4, pan * -0.5)
  })
}

export function startMusic(vol = 0.35) {
  if (playing) return
  if (stopTimer) {
    clearTimeout(stopTimer)
    stopTimer = null
  }
  clearGraph()

  const c = getCtx()
  if (!c) return

  const gen = ++startGeneration

  // Resume must complete before building — Safari often starts suspended
  void ensureRunning(c).then(() => {
    if (gen !== startGeneration) return
    if (playing) return
    if (c.state === "suspended") {
      // Last-ditch: still suspended (rare after user gesture) — try once more sync
      void c.resume()
    }
    try {
      buildGraph(c, vol)
      playing = true
    } catch {
      clearGraph()
      playing = false
    }
  })
}

export function stopMusic() {
  startGeneration++ // cancel any in-flight start
  if (stopTimer) {
    clearTimeout(stopTimer)
    stopTimer = null
  }

  if (!playing && !masterGain) {
    clearGraph()
    return
  }

  const c = ctx
  const master = masterGain
  if (c && master) {
    const now = c.currentTime
    try {
      master.gain.cancelScheduledValues(now)
      const current = Math.max(master.gain.value, 0.0001)
      master.gain.setValueAtTime(current, now)
      master.gain.linearRampToValueAtTime(0.0001, now + 0.8)
    } catch {
      /* ignore */
    }
    playing = false
    stopTimer = setTimeout(() => {
      clearGraph()
      stopTimer = null
    }, 900)
    return
  }

  clearGraph()
  playing = false
}

export function toggleMusic(): boolean {
  if (playing) {
    stopMusic()
    return false
  }
  startMusic()
  // Optimistic: graph builds after resume; treat as on for UI
  return true
}

export function isMusicOn(): boolean {
  return playing
}
