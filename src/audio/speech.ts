// Thin wrapper over the Web Speech API. Kids can't read yet, so every prompt is spoken.
import { tokenize, wordIndexAt, estimateWordStarts, estimateDuration } from './readAlong';
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

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return (
    voices.find((v) => /en[-_](US|GB|IN)/i.test(v.lang) && /female|samantha|google/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith('en'))
  );
}

export function say(text: string, opts: { rate?: number } = {}) {
  if (muted || typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = opts.rate ?? 0.9;
  u.pitch = 1.1;
  const v = pickVoice();
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

/**
 * Speak `text` and report which word is being spoken (index into `tokenize(text)`), for read-along
 * highlighting. Uses the browser's word-boundary events when it sends them, otherwise an estimated
 * timer. Returns a cancel function. When muted (or no speech), calls onEnd right away.
 */
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
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = 1.1;
  const v = pickVoice();
  if (v) u.voice = v;
  u.onboundary = (e) => {
    if (done || (e.name && e.name !== 'word')) return;
    gotBoundary = true;
    onWord(wordIndexAt(tokens, e.charIndex));
  };
  u.onstart = () => {
    estimateWordStarts(text, rate).forEach((ms, i) =>
      timers.push(setTimeout(() => !done && !gotBoundary && onWord(i), ms)),
    );
    // Some browsers drop `onend`; never leave the story stuck.
    timers.push(setTimeout(finish, estimateDuration(text, rate) + 2500));
  };
  u.onend = finish;
  u.onerror = finish;
  onWord(0);
  window.speechSynthesis.speak(u);
  return () => {
    done = true;
    timers.forEach(clearTimeout);
    window.speechSynthesis.cancel();
  };
}
