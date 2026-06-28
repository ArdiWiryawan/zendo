/**
 * Synthesizes a beautiful Tibetan singing bowl/Zen bell sound using Web Audio API.
 * Uses multiple sine frequencies and exponential envelopes to avoid external assets.
 */
export function playZenBell() {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  
  // Metallic bell frequencies
  const freqs = [440, 554.37, 659.25, 880];
  const now = ctx.currentTime;
  
  freqs.forEach((f, index) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, now);
    
    // Low frequencies ring longer, higher frequencies fade quicker
    const duration = 4.0 - index * 0.7;
    const initialVolume = index === 0 ? 0.3 : 0.12;
    
    gainNode.gain.setValueAtTime(initialVolume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + duration);
  });
}
