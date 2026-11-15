import { describe, it, expect } from 'vitest';
import { createAiClient, createMockProvider } from './client';
import type { AiSettings } from './settings';
import { checkWhyHint, createWhyHinter, fetchWhyHint, leaksAnswer, mentionsNumber, spellsWord, whyRequest, WHY_TIMEOUT_MS, type WhyContext } from './whyHint';

const ON: AiSettings = { enabled: true, proxyUrl: 'https://proxy.example.workers.dev/', passcode: 'mango42' };
const OFF: AiSettings = { ...ON, enabled: false };

function client(opts: { settings?: AiSettings; online?: boolean; text?: unknown; delayMs?: number; fail?: boolean } = {}) {
  const mock = createMockProvider({
    responses: opts.text === undefined ? {} : { why: { text: opts.text } },
    delayMs: opts.delayMs,
    fail: opts.fail,
  });
  const c = createAiClient({
    settings: () => opts.settings ?? ON,
    online: () => opts.online ?? true,
    identifiers: () => ['Riya', 'p_1'],
    proxy: () => mock, // the "proxy" is the mock provider in tests
  });
  return { c, mock };
}

const MATH: WhyContext = { subject: 'math', track: 'add10', level: 2, question: 'What is 3 + 4?', answer: 7, picked: 6 };
const READ: WhyContext = { subject: 'reading', track: 'cvc', level: 0, question: 'Read the word "cat", then tap its picture.', answer: 'cat', picked: 'dog' };
const CANNED = 'Hop four more. | Try again!';

describe('answer leak checks', () => {
  it('math: the answer number as digits or words', () => {
    expect(mentionsNumber('It is 7.', 7)).toBe(true);
    expect(mentionsNumber('Seven is the one!', 7)).toBe(true);
    expect(mentionsNumber('Count to 17.', 7)).toBe(false);
    expect(mentionsNumber('Seventeen frogs.', 7)).toBe(false);
    expect(mentionsNumber('It is thirty-four.', 34)).toBe(true);
    expect(mentionsNumber('It is thirty four.', 34)).toBe(true);
    expect(leaksAnswer('Start at 3 and count on 4 more.', MATH)).toBe(false);
    expect(leaksAnswer('3 and 4 make seven.', MATH)).toBe(true);
  });

  it('math: non-number answers must not appear as written', () => {
    expect(leaksAnswer('It is 5 + 3 = 8.', { subject: 'math', answer: '5 + 3 = 8' })).toBe(true);
    expect(leaksAnswer('Does she get more or fewer?', { subject: 'math', answer: '5 + 3 = 8' })).toBe(false);
    // AI3b: equation answers in words or symbols, numbers as digits or words.
    const EQ = { subject: 'math' as const, answer: '5 plus 3' };
    expect(leaksAnswer('Try 5 plus 3.', EQ)).toBe(true);
    expect(leaksAnswer('Try five plus three.', EQ)).toBe(true);
    expect(leaksAnswer('Try 5 + 3.', EQ)).toBe(true);
    expect(leaksAnswer('She gets 3 more, so we add.', EQ)).toBe(false);
    const SUB = { subject: 'math' as const, answer: '12 minus 4' };
    expect(leaksAnswer('It is 12 - 4.', SUB)).toBe(true);
    expect(leaksAnswer('It is twelve minus four.', SUB)).toBe(true);
    expect(leaksAnswer('Four go away from the twelve.', SUB)).toBe(false);
    expect(leaksAnswer('Getting more means plus!', { subject: 'math', answer: 'plus' })).toBe(true);
    expect(leaksAnswer('Do they get more, or do some go away?', { subject: 'math', answer: 'plus' })).toBe(false);
  });

  it('reading: the word said or spelled out', () => {
    expect(spellsWord('Look: c, a, t.', 'cat')).toBe(true);
    expect(spellsWord('Sound it out: c a t', 'cat')).toBe(true);
    expect(spellsWord('Say sh-i-p slowly.', 'ship')).toBe(true);
    expect(spellsWord('Look, a cat can nap.', 'cat')).toBe(false);
    expect(spellsWord('Say each sound slowly.', 'cat')).toBe(false);
    expect(leaksAnswer('That word is cat!', READ)).toBe(true);
    expect(leaksAnswer('Say each sound, then blend them.', READ)).toBe(false);
    // Build it: saying the word is fine, spelling it is not.
    expect(leaksAnswer('Listen to ship. What sound starts it?', { subject: 'reading', answer: 'ship', sayWordOk: true })).toBe(false);
    expect(leaksAnswer('Ship is sh-i-p.', { subject: 'reading', answer: 'ship', sayWordOk: true })).toBe(true);
  });
});

describe('checkWhyHint', () => {
  it('accepts a short, safe hint and makes it speech-ready', () => {
    expect(checkWhyHint('Start at the bigger number. Count on with your fingers!', MATH)).toEqual({
      ok: true,
      text: 'Start at the bigger number. | Count on with your fingers!',
    });
    expect(checkWhyHint('Say each sound slowly. | Then blend them together.', READ)).toEqual({
      ok: true,
      text: 'Say each sound slowly. | Then blend them together.',
    });
  });

  it('rejects leaks, long or odd text and blocked words', () => {
    const bad = (t: unknown, ctx: WhyContext = MATH) => (checkWhyHint(t, ctx) as { ok: false; problems: string[] }).problems;
    expect(bad('The answer is 7.')).toContain('leaks-answer');
    expect(bad('It is c-a-t.', READ)).toContain('leaks-answer');
    expect(bad('One. Two. Three.')).toContain('sentences');
    expect(bad('Count on from the big number and keep going and going and going until you stop.')).toContain('long-sentence');
    expect(bad('Count on 🐸 hops!')).toContain('characters');
    expect(bad('See https://x.y')).toContain('characters');
    expect(bad('x'.repeat(200))).toContain('too-long');
    expect(bad('')).toContain('empty');
    expect(bad(42)).toContain('empty');
    expect(bad('Count on, you stupid frog.')).toContain('blocked');
  });
});

describe('whyRequest', () => {
  it('carries only learning context, 1-based level, whitelisted track id', () => {
    expect(whyRequest(MATH)).toEqual({ kind: 'why', subject: 'math', track: 'add10', level: 3, item: { question: 'What is 3 + 4?', answer: '7', picked: '6' } });
    expect(whyRequest({ ...READ, track: 'silent_e-2', picked: undefined }).track).toBe('silente2');
    expect(whyRequest({ ...READ, picked: undefined }).item).toEqual({ question: READ.question, answer: 'cat' });
  });
});

describe('fetchWhyHint (mock provider)', () => {
  it('valid hint → Claude text', async () => {
    const { c, mock } = client({ text: 'Start at three. Count on four hops.' });
    const r = await fetchWhyHint(MATH, CANNED, c);
    expect(r).toEqual({ source: 'claude', text: 'Start at three. | Count on four hops.' });
    expect(mock.calls).toHaveLength(1);
    expect(JSON.stringify(mock.calls[0])).not.toMatch(/Riya|p_1/);
  });

  it('hint that states the answer → canned hint', async () => {
    const { c } = client({ text: 'Three and four make seven!' });
    const r = await fetchWhyHint(MATH, CANNED, c);
    expect(r.source).toBe('builtin');
    expect(r.text).toBe(CANNED);
    expect(r.why).toContain('leaks-answer');
  });

  it('helpers off or offline → canned hint, no request', async () => {
    for (const opts of [{ settings: OFF }, { online: false }]) {
      const { c, mock } = client(opts);
      const r = await fetchWhyHint(MATH, CANNED, c);
      expect(r).toEqual({ source: 'builtin', text: CANNED, why: 'offline' });
      expect(mock.calls).toHaveLength(0);
    }
  });

  it('slow proxy → canned hint after the 2 s timeout', async () => {
    const { c } = client({ text: 'Start at three.', delayMs: WHY_TIMEOUT_MS + 500 });
    const t0 = Date.now();
    const r = await fetchWhyHint(MATH, CANNED, c);
    expect(r).toMatchObject({ source: 'builtin', text: CANNED, why: 'timeout' });
    expect(Date.now() - t0).toBeLessThan(WHY_TIMEOUT_MS + 400);
  });

  it('network failure or bad shape → canned hint', async () => {
    expect((await fetchWhyHint(MATH, CANNED, client({ fail: true }).c)).source).toBe('builtin');
    expect((await fetchWhyHint(MATH, CANNED, client({ text: '' }).c)).source).toBe('builtin');
  });
});

describe('createWhyHinter', () => {
  it('canned before the 2nd miss, then one Claude fetch per item, reused', async () => {
    const { c, mock } = client({ text: 'Say each sound. Then blend them.' });
    const h = createWhyHinter(c);
    expect(await h.hint('i1', 1, READ, 'Look again.')).toMatchObject({ source: 'builtin', text: 'Look again.' });
    expect(mock.calls).toHaveLength(0);
    expect(await h.hint('i1', 2, READ, 'Look again.')).toEqual({ source: 'claude', text: 'Say each sound. | Then blend them.' });
    expect(await h.hint('i1', 3, READ, 'Look again.')).toMatchObject({ source: 'claude' });
    expect(mock.calls).toHaveLength(1);
    await h.hint('i2', 2, READ, 'Look again.');
    expect(mock.calls).toHaveLength(2);
  });

  it('failed fetch keeps the per-miss canned hint and is not retried for that item', async () => {
    const { c, mock } = client({ text: 'It is cat.' });
    const h = createWhyHinter(c);
    expect(await h.hint('i1', 2, READ, "That's dog.")).toMatchObject({ source: 'builtin', text: "That's dog." });
    expect(await h.hint('i1', 3, READ, "That's pig.")).toMatchObject({ source: 'builtin', text: "That's pig." });
    expect(mock.calls).toHaveLength(1);
  });

  it('helpers off → never fetches', async () => {
    const { c, mock } = client({ settings: OFF });
    const h = createWhyHinter(c);
    expect((await h.hint('i1', 5, MATH, CANNED)).text).toBe(CANNED);
    expect(mock.calls).toHaveLength(0);
  });
});
