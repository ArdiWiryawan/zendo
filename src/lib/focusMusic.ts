// Ambient focus music via Web Audio API
let ctx: AudioContext | null = null
let playing = false
let oscNodes: OscillatorNode[] = []
let gainNodes: GainNode[] = []
let lfoNodes: OscillatorNode[] = []
let lfoGainNodes: GainNode[] = []

function getCtx() {
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Higher harmonics that work on phone speakers
const HARMONICS = [110, 165, 220, 275, 330, 440, 550]

export function startMusic(vol = 0.22) {
  if (playing) return
  const c = getCtx()
  if (!c) return

  // Ensure context is running before starting oscillators
  const p = c.resume()
  const startAll = () => {
    const now = c.currentTime
    HARMONICS.forEach((freq, i) => {
      try {
        const osc = c.createOscillator()
        const gain = c.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)

        // gentle stereo spread
        const pan = (i / (HARMONICS.length - 1)) * 2 - 1
        const stereo = c.createStereoPanner ? c.createStereoPanner() : null
        if (stereo) stereo.pan.setValueAtTime(pan, now)

        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(vol, now + 3)
        gain.gain.linearRampToValueAtTime(vol * 0.6, now + 6)

        // slow LFO
        const lfo = c.createOscillator()
        const lfoG = c.createGain()
        lfo.frequency.setValueAtTime(0.25 + i * 0.08, now)
        lfoG.gain.setValueAtTime(vol * 0.12, now)
        lfo.connect(lfoG)
        lfoG.connect(gain.gain)
        lfo.start(now)

        osc.connect(gain)
        if (stereo) { gain.connect(stereo); stereo.connect(c.destination) }
        else gain.connect(c.destination)
        osc.start(now)
        oscNodes.push(osc)
        gainNodes.push(gain)
        lfoNodes.push(lfo)
        lfoGainNodes.push(lfoG)
      } catch {}
    })
    playing = true
  }
  p.then(startAll).catch(startAll)
}

export function stopMusic() {
  [...oscNodes, ...lfoNodes].forEach(n => { try { n.stop() } catch {} })
  oscNodes = []
  gainNodes = []
  lfoNodes = []
  lfoGainNodes = []
  playing = false
}

export function toggleMusic(): boolean {
  if (playing) { stopMusic(); return false }
  else { startMusic(); return true }
}

export function isMusicOn(): boolean { return playing }
