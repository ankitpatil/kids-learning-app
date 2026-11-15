import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// A speech engine that accepts utterances but never fires any event (a hung Chrome/Electron TTS).
class FakeUtterance {
  text: string;
  rate = 1;
  pitch = 1;
  voice: unknown = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onboundary: ((e: { name?: string; charIndex: number }) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

let spoken: FakeUtterance[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  spoken = [];
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'narration' ? '1' : null), setItem: () => {} });
  vi.stubGlobal('window', {
    speechSynthesis: { cancel: () => {}, resume: () => {}, getVoices: () => [], speak: (u: FakeUtterance) => spoken.push(u) },
  });
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('sayAlong', () => {
  it('still highlights every word and finishes when the speech engine never starts', async () => {
    const { sayAlong, SPEECH_START_WATCHDOG_MS } = await import('./speech');
    const words: number[] = [];
    const onEnd = vi.fn();
    sayAlong('Pam has a pet pig.', { onWord: (i) => words.push(i), onEnd });
    expect(spoken).toHaveLength(1);
    vi.advanceTimersByTime(SPEECH_START_WATCHDOG_MS + 20000);
    expect(new Set(words)).toEqual(new Set([0, 1, 2, 3, 4]));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('a normal engine (start → end) finishes once, and the watchdog does not double-run', async () => {
    const { sayAlong } = await import('./speech');
    const onEnd = vi.fn();
    sayAlong('The cat sat.', { onWord: () => {}, onEnd });
    spoken[0].onstart?.();
    vi.advanceTimersByTime(500);
    spoken[0].onend?.();
    vi.advanceTimersByTime(20000);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('cancelling stops highlighting and never calls onEnd', async () => {
    const { sayAlong } = await import('./speech');
    const onEnd = vi.fn();
    const words: number[] = [];
    const cancel = sayAlong('The cat sat.', { onWord: (i) => words.push(i), onEnd });
    cancel();
    vi.advanceTimersByTime(20000);
    expect(onEnd).not.toHaveBeenCalled();
    expect(words).toEqual([0]);
  });
});

describe('say (phrase queue)', () => {
  it('speaks phrases one at a time, waiting for each to end plus its pause', async () => {
    const { say } = await import('./speech');
    const { PAUSE } = await import('./readAlong');
    say('Great job! || Pick the next one?');
    expect(spoken.map((u) => u.text)).toEqual(['Great job!']);
    spoken[0].onend?.();
    vi.advanceTimersByTime(PAUSE.long - 1);
    expect(spoken).toHaveLength(1); // still in the pause
    vi.advanceTimersByTime(1);
    expect(spoken.map((u) => u.text)).toEqual(['Great job!', 'Pick the next one?']);
  });

  it('a new prompt cancels the rest of the old one', async () => {
    const { say } = await import('./speech');
    say('One. Two. Three.');
    say('Hello!');
    spoken[0].onend?.(); // the old first phrase finishing must not resume the old queue
    vi.advanceTimersByTime(20000);
    expect(spoken.map((u) => u.text)).toEqual(['One.', 'Hello!']);
  });

  it('moves on even if the engine never reports the end of a phrase', async () => {
    const { say } = await import('./speech');
    say('Look. Listen.');
    vi.advanceTimersByTime(20000);
    expect(spoken.map((u) => u.text)).toEqual(['Look.', 'Listen.']);
  });

  it('stopSpeech stops queued phrases', async () => {
    const { say, stopSpeech } = await import('./speech');
    say('One. Two.');
    stopSpeech();
    vi.advanceTimersByTime(20000);
    expect(spoken.map((u) => u.text)).toEqual(['One.']);
  });
});

describe('narration setting', () => {
  it('is off by default: say() stays quiet, speak() still talks', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
    vi.resetModules();
    const { say, speak, isNarrationOn } = await import('./speech');
    expect(isNarrationOn()).toBe(false);
    say('Pick a game!');
    vi.runAllTimers();
    expect(spoken).toHaveLength(0);
    speak('cat');
    vi.runAllTimers();
    expect(spoken.map((u) => u.text)).toEqual(['cat']);
  });

  it('turned on, say() speaks and the choice is saved', async () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v) });
    vi.resetModules();
    const { say, setNarration } = await import('./speech');
    setNarration(true);
    expect(store.narration).toBe('1');
    say('Pick a game!');
    vi.runAllTimers();
    expect(spoken.map((u) => u.text)).toEqual(['Pick a game!']);
  });
});
