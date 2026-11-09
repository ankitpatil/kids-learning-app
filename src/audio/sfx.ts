// Tiny synthesized sound effects (Web Audio): no audio files, works offline, respects mute.
import { isMuted } from './speech';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (isMuted()) return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(ac: AudioContext, freq: number, at: number, dur: number, type: OscillatorType, peak: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + at);
  gain.gain.setValueAtTime(0.0001, ac.currentTime + at);
  gain.gain.exponentialRampToValueAtTime(peak, ac.currentTime + at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + at + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + at);
  osc.stop(ac.currentTime + at + dur + 0.05);
}

/** Bright rising arpeggio: C–E–G–C. */
export function playCorrect() {
  const ac = audio();
  if (!ac) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, i * 0.08, 0.25, 'triangle', 0.18));
}

/** Soft, low two-note "hmm" — gentle, never a buzzer. */
export function playWrong() {
  const ac = audio();
  if (!ac) return;
  tone(ac, 330, 0, 0.18, 'sine', 0.12);
  tone(ac, 262, 0.16, 0.28, 'sine', 0.1);
}

/** Sparkly shimmer for a new sticker / level up. */
export function playSparkle() {
  const ac = audio();
  if (!ac) return;
  [1046.5, 1318.5, 1568, 2093, 1568, 2093].forEach((f, i) => tone(ac, f, i * 0.06, 0.18, 'sine', 0.1));
}
