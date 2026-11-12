import { describe, it, expect } from 'vitest';
import { STORIES, PATTERNS } from '../../content/stories';
import {
  undecodable,
  wordPattern,
  isSightWord,
  unlockedPattern,
  storiesFor,
  pickStory,
  readMode,
  makeQuestion,
  questionSpeech,
} from './generator';
import { tokenize, wordIndexAt, estimateWordStarts, estimateDuration } from '../../audio/readAlong';
import { pickTrack, maxLevel } from '../../engine/tracks';

describe('story content (#19)', () => {
  it('ids are unique and every pattern has stories', () => {
    expect(new Set(STORIES.map((s) => s.id)).size).toBe(STORIES.length);
    for (const p of PATTERNS) expect(STORIES.some((s) => s.pattern === p)).toBe(true);
  });
  it('every word is a tricky word or decodable at the story pattern (or easier)', () => {
    for (const s of STORIES) expect([s.id, undecodable(s)]).toEqual([s.id, []]);
  });
  it('each story uses its own pattern at least once (labels are not too generous)', () => {
    for (const s of STORIES) {
      const words = s.lines.flatMap((l) => l.text.match(/[A-Za-z']+/g) ?? []);
      expect([s.id, words.some((w) => !isSightWord(w) && wordPattern(w) === PATTERNS.indexOf(s.pattern))]).toEqual([s.id, true]);
    }
  });
  it('questions: 2 per story, answer word appears in the pointed line, choices distinct', () => {
    for (const s of STORIES) {
      expect(s.questions.length).toBe(2);
      for (const q of s.questions) {
        expect(q.line).toBeGreaterThanOrEqual(0);
        expect(q.line).toBeLessThan(s.lines.length);
        const key = q.answer.text.split(' ').pop()!.toLowerCase();
        expect([s.id, q.q, s.lines[q.line].text.toLowerCase().includes(key)]).toEqual([s.id, q.q, true]);
        const texts = [q.answer, ...q.wrong].map((c) => c.text);
        expect(new Set(texts).size).toBe(texts.length);
        expect(q.wrong.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
  it('content breadth: at least 6 stories per pattern, titles unique', () => {
    for (const p of PATTERNS) expect([p, STORIES.filter((s) => s.pattern === p).length >= 6]).toEqual([p, true]);
    expect(new Set(STORIES.map((s) => s.title)).size).toBe(STORIES.length);
  });
  it('stories are short (≤ 5 lines, ≤ 9 words a line)', () => {
    for (const s of STORIES) {
      expect(s.lines.length).toBeLessThanOrEqual(5);
      for (const l of s.lines) expect(tokenize(l.text).length).toBeLessThanOrEqual(9);
    }
  });
});

describe('decodability checker', () => {
  it('classifies words by pattern', () => {
    expect(wordPattern('cat')).toBe(0);
    expect(wordPattern('naps')).toBe(0);
    expect(wordPattern('ship')).toBe(1);
    expect(wordPattern('shell')).toBe(1);
    expect(wordPattern('frog')).toBe(2);
    expect(wordPattern('jump')).toBe(2);
    expect(wordPattern('kite')).toBe(3);
    expect(wordPattern('white')).toBe(3);
    expect(wordPattern('boat')).toBe(4);
    expect(wordPattern('feels')).toBe(4);
    expect(wordPattern('cow')).toBe(-1);
    expect(wordPattern('sea')).toBe(-1);
  });
  it('knows tricky words and their -s forms', () => {
    expect(isSightWord('The')).toBe(true);
    expect(isSightWord('wants')).toBe(true);
    expect(isSightWord('pig')).toBe(false);
  });
});

describe('which stories are open', () => {
  it('CVC is always open; a pattern opens after level 1 or mastery', () => {
    expect(unlockedPattern({})).toBe(0);
    expect(unlockedPattern({ digraphs: { level: 0, mastery: 0.4 } })).toBe(0);
    expect(unlockedPattern({ digraphs: { level: 1, mastery: 0.4 } })).toBe(1);
    expect(unlockedPattern({ blends: { level: 0, mastery: 0.95 } })).toBe(2);
    expect(unlockedPattern({ vowelTeams: { level: 1, mastery: 0.5 }, digraphs: { level: 0, mastery: 0 } })).toBe(4);
  });
  it('level caps the pattern; unlocked caps it further', () => {
    const pats = (l: number, u: number) => new Set(storiesFor(l, u).map((s) => s.pattern));
    expect(pats(0, 4)).toEqual(new Set(['cvc']));
    expect(pats(1, 4)).toEqual(new Set(['cvc', 'digraphs', 'blends']));
    expect(pats(2, 4)).toEqual(new Set(PATTERNS));
    expect(pats(2, 1)).toEqual(new Set(['cvc', 'digraphs']));
    expect(pats(2, 4).size).toBe(5);
    expect(new Set(storiesFor(2, 4, true).map((s) => s.pattern))).toEqual(new Set(['cvc']));
  });
  it('pickStory never goes past the cap and avoids recent stories', () => {
    for (let k = 0; k < 300; k++) {
      const s = pickStory(1, 1, Math.random, false, ['josh-ship']);
      expect(['cvc', 'digraphs']).toContain(s.pattern);
      expect(s.id).not.toBe('josh-ship');
    }
  });
  it('stories come after sentences and are the last reading track', () => {
    const done = Object.fromEntries(['phonics', 'cvc', 'digraphs', 'blends', 'silentE', 'vowelTeams', 'endings', 'sightWords', 'sentences'].map((id) => [id, { level: 9, mastery: 0.95 }]));
    expect(pickTrack('reading', done)).toBe('stories');
    expect(maxLevel('stories')).toBe(2);
  });
});

describe('read mode and questions', () => {
  it('level 0 reads aloud, level 1 offers read-to-me, level 2 is read-it-yourself; easing reads aloud', () => {
    expect(readMode(0)).toBe('auto');
    expect(readMode(1)).toBe('button');
    expect(readMode(2)).toBe('self');
    expect(readMode(2, true)).toBe('auto');
  });
  it('choices include the answer; easing leaves two', () => {
    for (const s of STORIES)
      for (const qi of [0, 1]) {
        const q = makeQuestion(s, qi);
        expect(q.choices).toContainEqual(q.answer);
        expect(q.choices.length).toBe(1 + s.questions[qi].wrong.length);
        const e = makeQuestion(s, qi, Math.random, true);
        expect(e.choices.length).toBe(2);
        expect(e.choices).toContainEqual(e.answer);
      }
  });
  it('level 0 speech reads the choices; later levels only the question', () => {
    const q = makeQuestion(STORIES[0], 0, () => 0);
    expect(questionSpeech(q, 0)).toMatch(/^What did Sam get\? .+, .+ or .+\?$/);
    expect(questionSpeech(q, 1)).toBe('What did Sam get?');
  });
});

describe('read-along timing', () => {
  it('tokenizes words with offsets', () => {
    const t = tokenize('Snap! The frog gets the bug.');
    expect(t.map((x) => x.word)).toEqual(['Snap', 'The', 'frog', 'gets', 'the', 'bug']);
    expect(t[1].start).toBe(6);
  });
  it('maps boundary char indexes to words', () => {
    const t = tokenize('Sam has a cat.');
    expect(wordIndexAt(t, 0)).toBe(0);
    expect(wordIndexAt(t, 4)).toBe(1);
    expect(wordIndexAt(t, 5)).toBe(1);
    expect(wordIndexAt(t, 10)).toBe(3);
    expect(wordIndexAt(t, 99)).toBe(3);
  });
  it('estimated word starts rise, pause after punctuation, and slow down at lower rates', () => {
    const s = estimateWordStarts('Bam! Bam bam.');
    expect(s[0]).toBe(0);
    expect(s[1] - s[0]).toBeGreaterThan(s[2] - s[1]);
    const slow = estimateWordStarts('Sam has a cat.', 0.5);
    const fast = estimateWordStarts('Sam has a cat.', 1);
    expect(slow[3]).toBeGreaterThan(fast[3]);
    expect(estimateDuration('Sam has a cat.')).toBeGreaterThan(estimateWordStarts('Sam has a cat.')[3]);
  });
});
