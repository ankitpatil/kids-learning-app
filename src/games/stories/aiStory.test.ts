import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { checkAiStory, newStory, patternCap, storyRequest, answerInLine, cleanEmoji, playableCached, fallbackStory, STORY_LIMITS, TOPIC_ICONS } from './aiStory';
import { STORIES, PATTERNS, type Story } from '../../content/stories';
import { blockedWords } from '../../content/kidSafe';
import { createAiClient, createMockProvider, type AiProvider } from '../../ai/client';
import { STORY_TOPICS, type AiRequest } from '../../ai/request';
import type { AiSettings } from '../../ai/settings';
import { AppDB, saveAiStory, listAiStories, clearAiStories, MAX_CACHED_STORIES } from '../../store/db';
import { storiesFor } from './generator';

const ON: AiSettings = { enabled: true, proxyUrl: 'https://proxy.example.workers.dev/', passcode: 'mango42' };

/** A story as Claude would return it (cricket, CVC + sight words). */
const GOOD = {
  title: 'Raj and the Bat',
  lines: [
    { text: 'Raj has a red bat.', emoji: '🏏' },
    { text: 'Raj hits it to Sam.', emoji: '⚾' },
    { text: 'It is in the net!', emoji: '🥅' },
    { text: 'Raj is a top pal.', emoji: '😄' },
  ],
  questions: [
    { q: 'What did Raj have?', line: 0, answer: { text: 'a red bat', emoji: '🏏' }, wrong: [{ text: 'a cup', emoji: '☕' }, { text: 'a hat', emoji: '🎩' }] },
    { q: 'Where did it go?', line: 2, answer: { text: 'in the net', emoji: '🥅' }, wrong: [{ text: 'on the bus', emoji: '🚌' }, { text: 'in a box', emoji: '📦' }] },
  ],
};
const clone = () => JSON.parse(JSON.stringify(GOOD)) as typeof GOOD;

function client(provider: AiProvider, online = true) {
  return createAiClient({ settings: () => ON, online: () => online, identifiers: () => ['Riya', 'p_123'], proxy: () => provider });
}

/** A provider that returns the given story bodies in order (then the last one). */
function seqProvider(bodies: unknown[]): AiProvider & { calls: AiRequest[] } {
  const calls: AiRequest[] = [];
  return {
    name: 'proxy',
    calls,
    async send(req) {
      calls.push(req);
      return { story: bodies[Math.min(calls.length - 1, bodies.length - 1)] };
    },
  };
}

const BUILTIN = STORIES[0];
const deps = (c: ReturnType<typeof client>, saved: Story[] = []) => ({
  client: c,
  fallback: () => BUILTIN,
  save: (s: Story) => void saved.push(s),
});

describe('checkAiStory', () => {
  it('accepts a good story and makes it playable', () => {
    const r = checkAiStory(GOOD, 0, 'cricket');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.story.id).toMatch(/^ai-/);
    expect(r.story.pattern).toBe('cvc');
    expect(r.story.emoji).toBe(TOPIC_ICONS.cricket);
    expect(r.story.questions).toHaveLength(2);
    // Same content → same id (so the cache doesn't fill with duplicates).
    expect((checkAiStory(clone(), 0, 'cricket') as { story: Story }).story.id).toBe(r.story.id);
  });

  it('rejects words above the child’s patterns', () => {
    const s = clone();
    s.lines[3].text = 'Raj is a champ.'; // "champ" = digraph + blend
    const r = checkAiStory(s, 0, 'cricket');
    expect(r.ok).toBe(false);
    expect((r as { problems: string[] }).problems.join()).toMatch(/undecodable:.*champ/);
    expect(checkAiStory(s, 2, 'cricket').ok).toBe(true);
  });

  it('rejects stories that are too long, too short or have long lines', () => {
    const long = clone();
    long.lines.push(...Array.from({ length: STORY_LIMITS.maxLines }, () => ({ text: 'Raj ran.', emoji: '🏃' })));
    expect(checkAiStory(long, 0, 'cricket').ok).toBe(false);
    const short = clone();
    short.lines = short.lines.slice(0, 2);
    short.questions[1].line = 1;
    expect(checkAiStory(short, 0, 'cricket').ok).toBe(false);
    const wordy = clone();
    wordy.lines[3].text = 'Raj is a top pal and his dad is a top pal.';
    expect((checkAiStory(wordy, 0, 'cricket') as { problems: string[] }).problems).toContain('line-3-long');
  });

  it('rejects blocked words anywhere (lines, title, questions, choices)', () => {
    const inLine = clone();
    inLine.lines[3].text = 'Raj is not dumb.';
    expect((checkAiStory(inLine, 0, 'cricket') as { problems: string[] }).problems.join()).toMatch(/blocked:dumb/);
    const inChoice = clone();
    inChoice.questions[0].wrong[0].text = 'a gun';
    expect(checkAiStory(inChoice, 0, 'cricket').ok).toBe(false);
    const inQuestion = clone();
    inQuestion.questions[1].q = 'Who died?';
    expect(checkAiStory(inQuestion, 0, 'cricket').ok).toBe(false);
  });

  it('needs exactly 2 questions whose answers appear in the line they point at', () => {
    const notInLine = clone();
    notInLine.questions[0].answer.text = 'a green bat';
    expect((checkAiStory(notInLine, 0, 'cricket') as { problems: string[] }).problems).toContain('q0-answer-not-in-line');
    const badLine = clone();
    badLine.questions[1].line = 9;
    expect(checkAiStory(badLine, 0, 'cricket').ok).toBe(false);
    const one = clone();
    one.questions = one.questions.slice(0, 1);
    expect(checkAiStory(one, 0, 'cricket').ok).toBe(false);
    const dup = clone();
    dup.questions[0].wrong[0].text = 'A red bat';
    expect(checkAiStory(dup, 0, 'cricket').ok).toBe(false);
    const oneWrong = clone();
    oneWrong.questions[0].wrong = oneWrong.questions[0].wrong.slice(0, 1);
    expect(checkAiStory(oneWrong, 0, 'cricket').ok).toBe(false);
  });

  it('rejects junk: wrong types, markup, links, digits', () => {
    expect(checkAiStory(null, 0, 'food').ok).toBe(false);
    expect(checkAiStory('a story', 0, 'food').ok).toBe(false);
    for (const text of ['Raj has <b>a</b> bat.', 'See https://x.io now.', 'Raj has 3 bats.']) {
      const s = clone();
      s.lines[0].text = text;
      expect(checkAiStory(s, 4, 'cricket').ok, text).toBe(false);
    }
  });

  it('replaces bad pictures instead of failing', () => {
    expect(cleanEmoji('🐱', '⭐')).toBe('🐱');
    expect(cleanEmoji('cat', '⭐')).toBe('⭐');
    expect(cleanEmoji('<img>', '⭐')).toBe('⭐');
    expect(cleanEmoji(42, '⭐')).toBe('⭐');
  });

  it('drops any pictures Claude puts beside story lines (lines are text only, so pictures can’t give answers away)', () => {
    const r = checkAiStory(GOOD, 0, 'cricket');
    expect(r.ok).toBe(true);
    if (r.ok) for (const l of r.story.lines) expect(Object.keys(l)).toEqual(['text']);
  });

  it('answerInLine matches whole words, ignoring case', () => {
    expect(answerInLine('in the net', 'The ball is in the net!')).toBe(true);
    expect(answerInLine('nap', 'Then Ben naps in the sun.')).toBe(true);
    expect(answerInLine('a red bat', 'Raj has a red bat.')).toBe(true);
    expect(answerInLine('net', 'Raj has a nettle.')).toBe(false);
    expect(answerInLine('', 'x')).toBe(false);
  });
});

describe('story request', () => {
  it('asks only for the patterns the child can read, with length limits and the topic', () => {
    expect(patternCap(0, 4)).toBe(0); // level 1 is CVC only
    expect(patternCap(2, 1)).toBe(1); // capped by what's unlocked
    expect(patternCap(2, 4, true)).toBe(0); // easing
    const req = storyRequest(1, 2, 'space');
    expect(req).toEqual({ kind: 'story', level: 2, patterns: ['cvc', 'digraphs', 'blends'], topic: 'space', maxLines: 5, maxWordsPerLine: 7 });
  });

  it('every topic has an icon', () => {
    for (const t of STORY_TOPICS) expect(TOPIC_ICONS[t]).toBeTruthy();
  });
});

describe('newStory (mock provider)', () => {
  it('valid response → Claude story, cached', async () => {
    const saved: Story[] = [];
    const p = seqProvider([GOOD]);
    const r = await newStory(0, 0, 'cricket', deps(client(p), saved));
    expect(r.source).toBe('claude');
    expect(r.story.title).toBe('Raj and the Bat');
    expect(saved).toHaveLength(1);
    expect(p.calls).toHaveLength(1);
    // Only learning context leaves the device.
    expect(Object.keys(p.calls[0]).sort()).toEqual(['kind', 'level', 'maxLines', 'maxWordsPerLine', 'patterns', 'topic']);
  });

  it('invalid then valid → retries once and uses the second', async () => {
    const bad = clone();
    bad.lines[0].text = 'Raj has a shiny bat.';
    const p = seqProvider([bad, GOOD]);
    const r = await newStory(0, 0, 'cricket', deps(client(p)));
    expect(r.source).toBe('claude');
    expect(p.calls).toHaveLength(2);
  });

  it('invalid twice → built-in story, nothing cached', async () => {
    const bad = clone();
    bad.lines[0].text = 'Raj is stupid.';
    const saved: Story[] = [];
    const p = seqProvider([bad]);
    const r = await newStory(0, 0, 'cricket', deps(client(p), saved));
    expect(r.source).toBe('builtin');
    expect(r.story).toBe(BUILTIN);
    expect(p.calls).toHaveLength(2);
    expect(saved).toHaveLength(0);
  });

  it('offline or helpers off → built-in story without any request', async () => {
    const p = seqProvider([GOOD]);
    const r = await newStory(0, 0, 'cricket', deps(client(p, false)));
    expect(r).toMatchObject({ source: 'builtin', why: 'offline' });
    expect(p.calls).toHaveLength(0);
    const off = createAiClient({ settings: () => ({ ...ON, enabled: false }), online: () => true, identifiers: () => [], proxy: () => p });
    expect((await newStory(0, 0, 'cricket', deps(off))).source).toBe('builtin');
    expect(p.calls).toHaveLength(0);
  });

  it('network failure / bad shape → retry, then built-in', async () => {
    const failing = createMockProvider({ fail: true });
    const c = createAiClient({ settings: () => ON, online: () => true, identifiers: () => [], proxy: () => failing });
    const r = await newStory(0, 0, 'cricket', deps(c));
    expect(r.source).toBe('builtin');
    expect(failing.calls).toHaveLength(2);
    const shapeless = createMockProvider({ responses: { story: { nope: 1 } } });
    const c2 = createAiClient({ settings: () => ON, online: () => true, identifiers: () => [], proxy: () => shapeless });
    expect((await newStory(0, 0, 'cricket', deps(c2))).source).toBe('builtin');
  });

  it('stops retrying once the time budget is spent', async () => {
    let t = 0;
    const p: AiProvider & { calls: number } = {
      name: 'proxy',
      calls: 0,
      async send() {
        this.calls++;
        t += 7500; // first attempt eats most of the budget
        return { story: { title: 'x' } };
      },
    };
    const r = await newStory(0, 0, 'cricket', { ...deps(client(p)), now: () => t });
    expect(r.source).toBe('builtin');
    expect(p.calls).toBe(1);
  });

  it('a failing cache write still shows the story', async () => {
    const r = await newStory(0, 0, 'cricket', { client: client(seqProvider([GOOD])), fallback: () => BUILTIN, save: () => Promise.reject(new Error('full')) });
    expect(r.source).toBe('claude');
  });
});

describe('cached stories', () => {
  it('save, list newest first, dedupe by id, cap, clear', async () => {
    const d = new AppDB('ai-cache-1');
    const story = (checkAiStory(GOOD, 0, 'cricket') as { story: Story }).story;
    await saveAiStory(story, 'cricket', d, 1);
    await saveAiStory(story, 'cricket', d, 2);
    expect(await listAiStories(d)).toHaveLength(1);
    for (let i = 0; i < MAX_CACHED_STORIES + 5; i++) await saveAiStory({ ...story, id: `ai-${i}` }, 'cricket', d, 10 + i);
    const all = await listAiStories(d);
    expect(all).toHaveLength(MAX_CACHED_STORIES);
    expect(all[0].id).toBe(`ai-${MAX_CACHED_STORIES + 4}`);
    expect(all.some((r) => r.id === story.id)).toBe(false); // oldest dropped
    // Nothing about the child is stored with a story.
    expect(Object.keys(all[0]).sort()).toEqual(['createdAt', 'id', 'story', 'topic']);
    await clearAiStories(d);
    expect(await listAiStories(d)).toHaveLength(0);
  });

  it('are re-checked on load and join the story pool at their pattern', () => {
    const good = (checkAiStory(GOOD, 0, 'cricket') as { story: Story }).story;
    const tampered = { ...good, id: 'ai-bad', lines: [...good.lines.slice(0, 3), { text: 'Raj is dumb.', emoji: '🏏' }] };
    const playable = playableCached([{ topic: 'cricket', story: good }, { topic: 'cricket', story: tampered }, { topic: 'x', story: null as unknown as Story }]);
    expect(playable.map((s) => s.id)).toEqual([good.id]);
    expect(storiesFor(0, 0, false, playable).some((s) => s.id === good.id)).toBe(true);
    const digraph = { ...good, id: 'ai-dig', pattern: 'digraphs' as const };
    expect(storiesFor(0, 0, false, [digraph]).some((s) => s.id === 'ai-dig')).toBe(false);
    expect(fallbackStory(0, 0, [], () => 0).pattern).toBe('cvc');
  });
});

describe('kid-safe word list', () => {
  it('catches plurals and endings but not innocent words that contain a blocked word', () => {
    expect(blockedWords('The guns. He died. Killing.')).toEqual(['guns', 'died', 'killing']);
    expect(blockedWords('Check the shell. Shut the van. Hit the ball.')).toEqual([]);
  });

  it('built-in story lines and titles are text only (no pictures to match against the answers)', () => {
    const PICTO = /\p{Extended_Pictographic}/u;
    for (const s of STORIES) {
      for (const l of s.lines) {
        expect(Object.keys(l), s.id).toEqual(['text']);
        expect(PICTO.test(l.text), s.id).toBe(false);
      }
      expect(PICTO.test(s.title), s.id).toBe(false);
    }
  });

  it('built-in stories pass it', () => {
    for (const s of STORIES) {
      const text = [s.title, ...s.lines.map((l) => l.text), ...s.questions.flatMap((q) => [q.q, q.answer.text, ...q.wrong.map((w) => w.text)])].join(' ');
      expect(blockedWords(text), s.id).toEqual([]);
    }
  });
});
