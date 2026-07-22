/**
 * Shared AudioContext helper — browsers start suspended until a user gesture.
 * Timer-fired sounds must reuse a context that was already resumed by a click.
 */
let sharedCtx: AudioContext | null = null

function getSharedCtx(): AudioContext | null {
  const C = window.AudioContext || (window as any).webkitAudioContext
  if (!C) return null
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new C()
  }
  return sharedCtx
}

/** Call from any user gesture (buttons) so later timer bells can play. */
export function unlockAudio() {
  const ctx = getSharedCtx()
  if (!ctx) return
  if (ctx.state === "suspended") {
    void ctx.resume()
  }
  // Silent blip primes some mobile browsers
  try {
    const g = ctx.createGain()
    g.gain.value = 0.0001
    const o = ctx.createOscillator()
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 0.01)
  } catch {
    /* ignore */
  }
}

/**
 * Tibetan singing bowl / zen bell via Web Audio.
 * Uses shared context + resume so it works from session timers too.
 */
export function playZenBell() {
  const ctx = getSharedCtx()
  if (!ctx) return

  const run = () => {
    const now = ctx.currentTime
    const freqs = [440, 554.37, 659.25, 880]

    freqs.forEach((f, index) => {
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()

      osc.type = "sine"
      osc.frequency.setValueAtTime(f, now)

      const duration = 4.0 - index * 0.7
      const initialVolume = index === 0 ? 0.35 : 0.14

      gainNode.gain.setValueAtTime(initialVolume, now)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      osc.connect(gainNode)
      gainNode.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + duration)
    })
  }

  if (ctx.state === "suspended") {
    void ctx.resume().then(run).catch(run)
  } else {
    run()
  }
}
