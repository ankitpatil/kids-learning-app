// Thin wrapper over the Web Speech API. Kids can't read yet, so every prompt is spoken.
import { tokenize, wordIndexAt, estimateWordStarts, estimateDuration } from './readAlong';
import { chooseVoice, rankVoices, AUTO } from './voices';
let muted = false;
try {
  muted = localStorage.getItem('muted') === '1';
} catch {
  /* storage unavailable */
}

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem('muted', m ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (m) window.speechSynthesis?.cancel();
}

const VOICE_KEY = 'voice';

/** The parent's chosen voice id (voiceURI), or 'auto'. */
export function getVoicePref(): string {
  try {
    return localStorage.getItem(VOICE_KEY) ?? AUTO;
  } catch {
    return AUTO;
  }
}

export function setVoicePref(id: string) {
  try {
    localStorage.setItem(VOICE_KEY, id);
  } catch {
    /* ignore */
  }
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  return chooseVoice(window.speechSynthesis?.getVoices() ?? [], getVoicePref());
}

/** Installed English voices, best first (voices load async in Chrome: listen for `voiceschanged`). */
export function listVoices(): SpeechSynthesisVoice[] {
  return rankVoices(window.speechSynthesis?.getVoices() ?? []);
}

/** Speak a sample with a specific voice (for the picker), ignoring the saved choice. */
export function previewVoice(v: SpeechSynthesisVoice, text = 'Hi! Let us read a story together.') {
  if (muted || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume?.();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = v;
  u.lang = v.lang;
  u.rate = 0.9;
  u.pitch = 1.1;
  window.speechSynthesis.speak(u);
}

export function say(text: string, opts: { rate?: number } = {}) {
  if (muted || typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = opts.rate ?? 0.9;
  u.pitch = 1.1;
  const v = pickVoice();
  if (v) {
    u.voice = v;
    u.lang = v.lang;
  }
  window.speechSynthesis.speak(u);
}

/**
 * Speak `text` and report which word is being spoken (index into `tokenize(text)`), for read-along
 * highlighting. Uses the browser's word-boundary events when it sends them, otherwise an estimated
 * timer. Returns a cancel function. When muted (or no speech), calls onEnd right away.
 */
/** If speech hasn't started by now, assume the engine is stuck and time the words ourselves. */
export const SPEECH_START_WATCHDOG_MS = 1500;

export function sayAlong(
  text: string,
  { onWord, onEnd, rate = 0.85 }: { onWord: (index: number) => void; onEnd: () => void; rate?: number },
): () => void {
  if (muted || typeof window === 'undefined' || !window.speechSynthesis) {
    const t = setTimeout(onEnd, 0);
    return () => clearTimeout(t);
  }
  const tokens = tokenize(text);
  const timers: ReturnType<typeof setTimeout>[] = [];
  let done = false;
  let gotBoundary = false;
  const finish = () => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    onEnd();
  };
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume?.(); // Chrome can get stuck "paused"; resume unsticks it
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = 1.1;
  const v = pickVoice();
  if (v) {
    u.voice = v;
    u.lang = v.lang;
  }
  u.onboundary = (e) => {
    if (done || (e.name && e.name !== 'word')) return;
    gotBoundary = true;
    onWord(wordIndexAt(tokens, e.charIndex));
  };
  // Run the estimated word timings plus a safety finish. Started by `onstart`, or by a watchdog if the
  // speech engine hangs and never starts (seen in Chrome/Electron): the story then still highlights
  // word by word and moves on, silently, instead of stalling on the first line.
  let timing = false;
  const startTiming = (fromEngine: boolean) => {
    if (timing || done) return;
    timing = true;
    estimateWordStarts(text, rate).forEach((ms, i) =>
      timers.push(setTimeout(() => !done && !gotBoundary && onWord(i), ms)),
    );
    // Some browsers drop `onend`; never leave the story stuck. With real audio, allow slack for slow
    // voices; with a stuck engine (silent), move on as soon as the estimated words are shown.
    timers.push(setTimeout(finish, estimateDuration(text, rate) + (fromEngine ? 2500 : 400)));
  };
  u.onstart = () => startTiming(true);
  u.onend = finish;
  u.onerror = finish;
  timers.push(setTimeout(() => startTiming(false), SPEECH_START_WATCHDOG_MS));
  onWord(0);
  window.speechSynthesis.speak(u);
  return () => {
    done = true;
    timers.forEach(clearTimeout);
    window.speechSynthesis.cancel();
  };
}
