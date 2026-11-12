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
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
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
