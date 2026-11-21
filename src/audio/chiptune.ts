// 8-bit retro walking music for the Dinosaur Maze (an original loop, synthesized: no audio files, works
// offline). Square-wave tune, triangle bass, noise hi-hat — the classic three-channel console sound.
// Plays only while Dinosaur Mom is walking; respects mute.
import { isMuted } from './speech';

/** Beats per minute; the song is written in eighth notes. */
export const CHIP_BPM = 150;
export const EIGHTH_S = 60 / CHIP_BPM / 2;

/** One bar per string, 8 eighth notes each: a note (C5, F#4…), "-" holds the previous note, "." rest. */
export const CHIP_LEAD = [
  'E5 . G5 . C6 . G5 .', 'A5 . G5 E5 G5 - - .',
  'F5 . A5 . D6 . A5 .', 'G5 . F5 D5 E5 - - .',
  'E5 . G5 . C6 . E6 .', 'D6 . C6 A5 G5 - E5 .',
  'F5 E5 D5 . G5 . B4 .', 'C5 - - . C6 . G5 .',
];
export const CHIP_BASS = [
  'C3 . C4 . C3 . C4 .', 'A2 . A3 . A2 . A3 .',
  'F2 . F3 . F2 . F3 .', 'G2 . G3 . G2 . G3 .',
  'C3 . C4 . C3 . C4 .', 'A2 . A3 . A2 . A3 .',
  'F2 . F3 . G2 . G3 .', 'C3 . G2 . C3 - - .',
];
/** x = hi-hat, o = kick-ish thump, . = nothing. */
export const CHIP_DRUMS = ['o . x . o . x x', 'o . x . o . x .', 'o . x . o . x x', 'o . x . o x x x', 'o . x . o . x x', 'o . x . o . x .', 'o . x . o . x x', 'o . x . o o x x'];

export interface ChipNote {
  step: number; // eighth-note index in the loop
  len: number; // eighths
  hz: number;
}

const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" → 440 Hz. Accepts sharps ("F#4") and flats ("Bb3"). */
export function noteHz(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`Bad note ${name}`);
  const midi = 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Bars of notes → a flat list of notes with lengths ("-" extends the note before it). */
export function parseTrack(bars: string[]): { notes: ChipNote[]; steps: number } {
  const tokens = bars.flatMap((b) => b.trim().split(/\s+/));
  const notes: ChipNote[] = [];
  tokens.forEach((tok, step) => {
    if (tok === '.') return;
    if (tok === '-') {
      const last = notes[notes.length - 1];
      if (last && last.step + last.len === step) last.len += 1;
      return;
    }
    notes.push({ step, len: 1, hz: noteHz(tok) });
  });
  return { notes, steps: tokens.length };
}

export function parseDrums(bars: string[]): { hits: { step: number; kind: 'hat' | 'kick' }[]; steps: number } {
  const tokens = bars.flatMap((b) => b.trim().split(/\s+/));
  const hits: { step: number; kind: 'hat' | 'kick' }[] = [];
  tokens.forEach((t, step) => {
    if (t === 'x') hits.push({ step, kind: 'hat' });
    else if (t === 'o') hits.push({ step, kind: 'kick' });
  });
  return { hits, steps: tokens.length };
}

const LEAD = parseTrack(CHIP_LEAD);
const BASS = parseTrack(CHIP_BASS);
const DRUMS = parseDrums(CHIP_DRUMS);
export const LOOP_STEPS = LEAD.steps;

// ---------- Playback ----------

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: number | undefined;
let nextStep = 0;
let nextTime = 0;
let noise: AudioBuffer | null = null;
let pulse: PeriodicWave | null = null;

function audio(): AudioContext | null {
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

/** 25% pulse wave: the thinner, buzzier "NES" square. */
function pulseWave(ac: AudioContext): PeriodicWave {
  if (pulse) return pulse;
  const n = 32;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
  pulse = ac.createPeriodicWave(real, imag);
  return pulse;
}

function voice(ac: AudioContext, out: AudioNode, hz: number, t0: number, dur: number, kind: 'lead' | 'bass') {
  const osc = ac.createOscillator();
  if (kind === 'lead') osc.setPeriodicWave(pulseWave(ac));
  else osc.type = 'triangle';
  osc.frequency.setValueAtTime(hz, t0);
  const g = ac.createGain();
  const peak = kind === 'lead' ? 0.22 : 0.4;
  g.gain.setValueAtTime(peak, t0);
  g.gain.setValueAtTime(peak * 0.7, t0 + Math.min(dur * 0.4, 0.08));
  g.gain.linearRampToValueAtTime(0.0001, t0 + dur * 0.95);
  osc.connect(g).connect(out);
  osc.start(t0);
  osc.stop(t0 + dur);
}

function drum(ac: AudioContext, out: AudioNode, t0: number, kind: 'hat' | 'kick') {
  if (kind === 'kick') {
    const osc = ac.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t0);
    osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.1);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.25, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
    osc.connect(g).connect(out);
    osc.start(t0);
    osc.stop(t0 + 0.13);
    return;
  }
  if (!noise || noise.sampleRate !== ac.sampleRate) {
    noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.05), ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource();
  src.buffer = noise;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 6000;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.12, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
  src.connect(hp).connect(g).connect(out);
  src.start(t0);
}

function schedule() {
  const ac = ctx;
  if (!ac || !master) return;
  while (nextTime < ac.currentTime + 0.25) {
    const s = nextStep % LOOP_STEPS;
    for (const n of LEAD.notes) if (n.step === s) voice(ac, master, n.hz, nextTime, n.len * EIGHTH_S, 'lead');
    for (const n of BASS.notes) if (n.step === s) voice(ac, master, n.hz, nextTime, n.len * EIGHTH_S, 'bass');
    for (const h of DRUMS.hits) if (h.step === s) drum(ac, master, nextTime, h.kind);
    nextStep += 1;
    nextTime += EIGHTH_S;
  }
}

export function isChiptunePlaying() {
  return timer !== undefined;
}

/** Start (or keep) the walking music. Picks up where it stopped, so stop/start sounds like pause/resume. */
export function startChiptune() {
  if (timer !== undefined || isMuted()) return;
  const ac = audio();
  if (!ac) return;
  master = ac.createGain();
  master.gain.setValueAtTime(0.0001, ac.currentTime);
  master.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.15);
  master.connect(ac.destination);
  nextTime = ac.currentTime + 0.05;
  schedule();
  timer = window.setInterval(schedule, 60);
}

/** Stop the music with a quick fade (notes already scheduled fade out with it). */
export function stopChiptune() {
  if (timer === undefined) return;
  window.clearInterval(timer);
  timer = undefined;
  const ac = ctx;
  const m = master;
  master = null;
  if (ac && m) {
    m.gain.cancelScheduledValues(ac.currentTime);
    m.gain.setValueAtTime(m.gain.value || 0.12, ac.currentTime);
    m.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.2);
    window.setTimeout(() => m.disconnect(), 400);
  }
}
