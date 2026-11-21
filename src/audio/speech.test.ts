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

describe('say (phrase queue)', () => {
  // These tests are about the queue, so narration is switched on (it is off by default).
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'narration' ? '1' : null), setItem: () => {} });
  });

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

describe('narration (off by default)', () => {
  it('does not speak prompts by itself until narration is switched on', async () => {
    const { say, isNarrationOn, setNarration } = await import('./speech');
    expect(isNarrationOn()).toBe(false);
    say('Pick what to play!');
    expect(spoken).toHaveLength(0);
    setNarration(true);
    say('Pick what to play!');
    expect(spoken.map((u) => u.text)).toEqual(['Pick what to play!']);
  });

  it('still speaks when the child taps (🔊, a picture), even with narration off', async () => {
    const { tapSay } = await import('./speech');
    tapSay('cat');
    expect(spoken.map((u) => u.text)).toEqual(['cat']);
  });

  it('reading levels: no narration even with talking on, but taps still read aloud', async () => {
    const { say, tapSay, setNarration, setReadingAlone } = await import('./speech');
    setNarration(true);
    setReadingAlone(true);
    say('The cat sat on the mat.');
    expect(spoken).toHaveLength(0);
    tapSay('mat');
    expect(spoken.map((u) => u.text)).toEqual(['mat']);
    setReadingAlone(false);
    say('Yes!');
    expect(spoken.map((u) => u.text)).toEqual(['mat', 'Yes!']);
  });

  it('silent mode silences taps too', async () => {
    const { tapSay, setMuted } = await import('./speech');
    setMuted(true);
    tapSay('cat');
    expect(spoken).toHaveLength(0);
  });
});

describe('onEnd and pitch (Dinosaur Maze)', () => {
  it('onEnd runs once the last phrase is done, not before', async () => {
    const { tapSay } = await import('./speech');
    const done = vi.fn();
    tapSay('Oh no! A locked door!', { onEnd: done });
    expect(spoken.map((u) => u.text)).toEqual(['Oh no!']);
    spoken[0].onend?.();
    vi.advanceTimersByTime(1000); // the pause, then the next phrase starts
    expect(spoken.map((u) => u.text)).toEqual(['Oh no!', 'A locked door!']);
    expect(done).not.toHaveBeenCalled();
    spoken[1].onend?.();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('onEnd still runs when nothing is spoken (narration off), and not when speech is cut off', async () => {
    const { say, tapSay } = await import('./speech');
    const quiet = vi.fn();
    say('Prompt', { onEnd: quiet }); // narration is off: nothing spoken
    vi.advanceTimersByTime(1);
    expect(quiet).toHaveBeenCalledTimes(1);
    const cut = vi.fn();
    tapSay('One. Two.', { onEnd: cut });
    tapSay('Hello!');
    vi.advanceTimersByTime(20000);
    expect(cut).not.toHaveBeenCalled();
  });

  it('a pitch can be set (the babies squeak)', async () => {
    const { tapSay } = await import('./speech');
    tapSay('Yay!', { pitch: 1.9 });
    expect((spoken[0] as unknown as { pitch: number }).pitch).toBe(1.9);
  });
});
