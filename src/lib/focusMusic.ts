// Ambient focus music via Web Audio API
let ctx: AudioContext | null = null
let playing = false
let oscNodes: OscillatorNode[] = []
let gainNodes: GainNode[] = []

function getCtx() {
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

const HARMONICS = [55, 82.5, 110, 137.5, 165]

export function startMusic(vol = 0.06) {
  if (playing) return
  const c = getCtx()
  if (!c) return
  const now = c.currentTime

  HARMONICS.forEach((freq, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)

    const pan = (i / (HARMONICS.length - 1)) * 2 - 1
    const stereo = c.createStereoPanner ? c.createStereoPanner() : null
    if (stereo) {
      stereo.pan.setValueAtTime(pan, now)
    }

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(vol, now + 2)
    gain.gain.linearRampToValueAtTime(vol * 0.5, now + 4)

    // slow LFO for depth
    const lfo = c.createOscillator()
    const lfoGain = c.createGain()
    lfo.frequency.setValueAtTime(0.3 + i * 0.1, now)
    lfoGain.gain.setValueAtTime(vol * 0.12, now)
    lfo.connect(lfoGain)
    lfoGain.connect(gain.gain)
    lfo.start(now)

    osc.connect(gain)
    if (stereo) {
      gain.connect(stereo)
      stereo.connect(c.destination)
    } else {
      gain.connect(c.destination)
    }
    osc.start(now)
    oscNodes.push(osc)
    gainNodes.push(gain)
  })
  playing = true
}

export function stopMusic() {
  oscNodes.forEach(n => { try { n.stop() } catch {} })
  oscNodes = []
  gainNodes = []
  playing = false
}

export function toggleMusic(): boolean {
  if (playing) { stopMusic(); return false }
  else { startMusic(); return true }
}

export function isMusicOn(): boolean { return playing }
