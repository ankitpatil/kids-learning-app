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

/** Fanfare notes (Hz, start s, length s): "ta-ta-ta-taaa, ta-TAAA" in C major. */
export const FANFARE: [number, number, number][] = [
  [392.0, 0, 0.13], [392.0, 0.15, 0.13], [392.0, 0.3, 0.13], [523.25, 0.45, 0.42],
  [659.25, 0.9, 0.16], [783.99, 1.08, 0.7],
];

/** One brass-like note: two slightly detuned saws through a low-pass that opens on the attack, with gentle vibrato. */
function brass(ac: AudioContext, freq: number, at: number, dur: number, peak: number) {
  const t0 = ac.currentTime + at;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600, t0);
  filter.frequency.exponentialRampToValueAtTime(2600, t0 + 0.05);
  filter.frequency.exponentialRampToValueAtTime(1500, t0 + dur);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.03);
  gain.gain.setValueAtTime(peak * 0.8, t0 + Math.max(0.04, dur - 0.08));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.06);
  filter.connect(gain).connect(ac.destination);
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.frequency.value = 5.5;
  lfoGain.gain.value = dur > 0.3 ? freq * 0.008 : 0;
  lfo.connect(lfoGain);
  for (const detune of [-6, 6]) {
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t0);
    osc.detune.value = detune;
    lfoGain.connect(osc.frequency);
    osc.connect(filter);
    osc.start(t0);
    osc.stop(t0 + dur + 0.1);
  }
  lfo.start(t0);
  lfo.stop(t0 + dur + 0.1);
}

/** Short trumpet fanfare for a finished round. */
export function playFanfare() {
  const ac = audio();
  if (!ac) return;
  for (const [f, at, dur] of FANFARE) brass(ac, f, at, dur, 0.09);
}

/**
 * Clap times (s) for applause: dense at first, thinning out — like a small crowd.
 * `rand` is injectable for tests.
 */
export function clapTimes(seconds = 2.2, rand: () => number = Math.random): number[] {
  const times: number[] = [];
  let t = 0;
  while (t < seconds) {
    times.push(t);
    const thin = t / seconds; // 0 → 1
    t += 0.012 + rand() * (0.03 + 0.12 * thin * thin);
  }
  return times;
}

let noise: AudioBuffer | null = null;

/** Applause: many short band-passed noise bursts ("claps") at random times. */
export function playApplause(seconds = 2.2) {
  const ac = audio();
  if (!ac) return;
  if (!noise || noise.sampleRate !== ac.sampleRate) {
    noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.05), ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length / 6));
  }
  for (const at of clapTimes(seconds)) {
    const t0 = ac.currentTime + at;
    const src = ac.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.5;
    const band = ac.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 900 + Math.random() * 1400;
    band.Q.value = 1.2;
    const gain = ac.createGain();
    const fade = 1 - (at / seconds) * 0.7;
    gain.gain.value = (0.05 + Math.random() * 0.06) * fade;
    src.connect(band).connect(gain).connect(ac.destination);
    src.start(t0);
  }
}

export interface CheerVoice {
  at: number;    // s after the cheer starts
  dur: number;   // s
  pitch: number; // Hz at the start of the "woo"
  rise: number;  // pitch multiplier at the top of the glide
  vowel: 0 | 1;  // 0 = "oo" → "ah", 1 = "ay"
  pan: number;   // -1 (left) … 1 (right)
}

/** A small crowd of "woo-hoo!" / "yay!" voices, mostly early in the cheer. `rand` is injectable for tests. */
export function cheerVoices(count = 12, seconds = 1.6, rand: () => number = Math.random): CheerVoice[] {
  return Array.from({ length: count }, () => {
    const child = rand() < 0.5;
    return {
      at: rand() * rand() * seconds,
      dur: 0.35 + rand() * 0.45,
      pitch: child ? 330 + rand() * 170 : 170 + rand() * 110,
      rise: 1.25 + rand() * 0.45,
      vowel: rand() < 0.5 ? 0 : 1,
      pan: rand() * 2 - 1,
    } satisfies CheerVoice;
  }).sort((a, b) => a.at - b.at);
}

/** Vowel formants (Hz): [start F1, start F2, end F1, end F2]. */
const FORMANTS: Record<0 | 1, [number, number, number, number]> = {
  0: [350, 800, 750, 1150], // "oo" opening to "ah"  → "woo-ah!"
  1: [600, 1700, 450, 2100], // "ay"                  → "yay!"
};

function cheerVoice(ac: AudioContext, v: CheerVoice, peak: number) {
  const t0 = ac.currentTime + v.at;
  const end = t0 + v.dur;
  const osc = ac.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(v.pitch, t0);
  osc.frequency.exponentialRampToValueAtTime(v.pitch * v.rise, t0 + v.dur * 0.45);
  osc.frequency.exponentialRampToValueAtTime(v.pitch * v.rise * 0.8, end);
  const vib = ac.createOscillator();
  const vibGain = ac.createGain();
  vib.frequency.value = 6 + Math.random() * 2;
  vibGain.gain.value = v.pitch * 0.02;
  vib.connect(vibGain).connect(osc.frequency);
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, t0);
  out.gain.exponentialRampToValueAtTime(peak, t0 + 0.06);
  out.gain.exponentialRampToValueAtTime(peak * 0.6, t0 + v.dur * 0.7);
  out.gain.exponentialRampToValueAtTime(0.0001, end);
  const [f1a, f2a, f1b, f2b] = FORMANTS[v.vowel];
  for (const [fa, fb, q] of [[f1a, f1b, 6], [f2a, f2b, 9]] as const) {
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(fa, t0);
    bp.frequency.exponentialRampToValueAtTime(fb, t0 + v.dur * 0.5);
    osc.connect(bp).connect(out);
  }
  const panner = ac.createStereoPanner ? ac.createStereoPanner() : null;
  if (panner) {
    panner.pan.value = v.pan;
    out.connect(panner).connect(ac.destination);
  } else out.connect(ac.destination);
  osc.start(t0);
  vib.start(t0);
  osc.stop(end + 0.05);
  vib.stop(end + 0.05);
}

/** Crowd cheer: a swelling, band-passed noise "roar" under a dozen woo-hoo voices. */
export function playCheer(seconds = 2.4) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * seconds), ac.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = 0.97 * last + 0.03 * (Math.random() * 2 - 1); // soften white noise toward a crowd rumble
    d[i] = last * 6;
  }
  const roar = ac.createBufferSource();
  roar.buffer = buf;
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 900;
  band.Q.value = 0.6;
  const roarGain = ac.createGain();
  roarGain.gain.setValueAtTime(0.0001, t0);
  roarGain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.35);
  roarGain.gain.exponentialRampToValueAtTime(0.05, t0 + seconds * 0.6);
  roarGain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
  roar.connect(band).connect(roarGain).connect(ac.destination);
  roar.start(t0);
  for (const v of cheerVoices(12, seconds * 0.65)) cheerVoice(ac, v, 0.035);
}

/** Round finished: trumpet fanfare, then crowd cheer + applause. Returns ms until it's quiet enough to speak. */
export function playCelebration(): number {
  playFanfare();
  setTimeout(() => {
    playCheer();
    playApplause(2.6);
  }, 700);
  return 2300;
}
