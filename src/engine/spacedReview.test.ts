import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import {
  baseItemId, reviewKey, localDay, buildCards, dueCards, placeSpaced, takeCard, spacedLead,
  MAX_SPACED_PER_ROUND, type ReviewAttempt, type ReviewCard,
} from './spacedReview';
import { planRound } from './roundMix';
import { AppDB, logAttempt, dueReviews } from '../store/db';
import { makeSightItem } from '../games/sightWords/generator';
import { makeWordItem, indexForItemId } from '../games/wordDetective/generator';

/** Local noon on day `n` after 1 Nov 2026 (noon keeps clear of DST edges). */
const day = (n: number, hour = 12) => new Date(2026, 10, 1 + n, hour).getTime();
const A = (n: number, itemId: string, correct: boolean, extra: Partial<ReviewAttempt> = {}): ReviewAttempt => ({
  skillId: 'sightWords', itemId, level: 1, correct, hintUsed: false, at: day(n), ...extra,
});
const due = (atts: ReviewAttempt[], n: number, tracks?: string[]) => dueCards(atts, day(n), tracks).map((c) => c.key);

describe('keys', () => {
  it('strips Pop / Dinosaur Maze wrappers', () => {
    expect(baseItemId('pop-sight-said')).toBe('sight-said');
    expect(baseItemId('dino-pop-read-ship')).toBe('read-ship');
    expect(baseItemId('count-7')).toBe('count-7');
  });
  it('word items share one key whatever the mode; others keep their id', () => {
    expect(reviewKey('read-ship')).toBe('word:ship');
    expect(reviewKey('build-ship')).toBe('word:ship');
    expect(reviewKey('pop-sight-said')).toBe('word:said');
    expect(reviewKey('magic-cape')).toBe('word:cape');
    expect(reviewKey('missing-3+5')).toBe('missing-3+5');
  });
  it('localDay counts calendar days, not 24 h blocks', () => {
    expect(localDay(day(1, 23)) - localDay(day(0, 1))).toBe(1);
    expect(localDay(day(0, 0)) ).toBe(localDay(day(0, 23)));
  });
});

describe('1 / 3 / 7-day schedule', () => {
  it('a miss comes back the next day, not the same day', () => {
    const atts = [A(0, 'sight-said', false), A(0, 'sight-said', true)];
    expect(due(atts, 0)).toEqual([]);
    expect(due(atts, 1)).toEqual(['word:said']);
    expect(due(atts, 5)).toEqual(['word:said']); // stays due until answered
  });

  it('right on day 1 → back on day 4; right then → day 11; right then → done', () => {
    let atts = [A(0, 'sight-said', false), A(1, 'sight-said', true)];
    expect(due(atts, 3)).toEqual([]);
    expect(due(atts, 4)).toEqual(['word:said']);
    atts = [...atts, A(4, 'sight-said', true)];
    expect(due(atts, 10)).toEqual([]);
    expect(due(atts, 11)).toEqual(['word:said']);
    atts = [...atts, A(11, 'sight-said', true)];
    expect(buildCards(atts).size).toBe(0);
    expect(due(atts, 30)).toEqual([]);
  });

  it('a miss at any box starts over at 1 day', () => {
    const atts = [A(0, 'sight-said', false), A(1, 'sight-said', true), A(4, 'sight-said', false), A(4, 'sight-said', true)];
    const [card] = [...buildCards(atts).values()];
    expect(card.box).toBe(0);
    expect(due(atts, 5)).toEqual(['word:said']);
  });

  it('right answers before the due day do not move the word on', () => {
    const atts = [A(0, 'sight-said', false), A(1, 'sight-said', true), A(2, 'sight-said', true)];
    const [card] = [...buildCards(atts).values()];
    expect(card.box).toBe(1);
    expect(due(atts, 4)).toEqual(['word:said']);
  });

  it('a right answer with a hint is not a pass', () => {
    const atts = [A(0, 'sight-said', false), A(1, 'sight-said', true, { hintUsed: true })];
    expect([...buildCards(atts).values()][0].box).toBe(0);
  });

  it('never-missed items get no card; answers in other modes count (Pop, build vs read)', () => {
    const atts: ReviewAttempt[] = [
      A(0, 'sight-the', true),
      A(0, 'pop-sight-was', false, { skillId: 'sightWords' }),
      A(0, 'read-ship', false, { skillId: 'digraphs' }),
      A(1, 'build-ship', true, { skillId: 'digraphs' }),
    ];
    const cards = buildCards(atts);
    expect([...cards.keys()].sort()).toEqual(['digraphs|word:ship', 'sightWords|word:was']);
    expect(cards.get('digraphs|word:ship')!.box).toBe(1);
    expect(cards.get('digraphs|word:ship')!.itemId).toBe('build-ship');
    expect(cards.get('sightWords|word:was')!.itemId).toBe('sight-was');
  });

  it('filters by track and puts the most overdue first', () => {
    const atts = [
      A(0, 'sight-was', false),
      A(3, 'sight-said', false),
      A(2, 'read-ship', false, { skillId: 'digraphs' }),
    ];
    expect(due(atts, 6)).toEqual(['word:was', 'word:ship', 'word:said']);
    expect(due(atts, 6, ['sightWords'])).toEqual(['word:was', 'word:said']);
  });

  it('unsorted input gives the same result', () => {
    const atts = [A(4, 'sight-said', true), A(0, 'sight-said', false), A(1, 'sight-said', true)];
    expect(due(atts, 11)).toEqual(['word:said']);
  });
});

describe('placing spaced items in a round', () => {
  it('takes review slots first, never the first or last item, at most 2', () => {
    for (let k = 0; k < 50; k++) {
      const plan = planRound(8);
      const out = placeSpaced(plan, 5);
      expect(out.filter((x) => x === 'spaced')).toHaveLength(MAX_SPACED_PER_ROUND);
      expect(out[0]).toBe('review');
      expect(out[7]).toBe('current');
      expect(out.filter((x) => x === 'stretch')).toHaveLength(1);
      // The non-first review slot became spaced.
      expect(out.filter((x) => x === 'review')).toHaveLength(1);
    }
  });
  it('no due items → plan unchanged', () => {
    const plan = planRound(8);
    expect(placeSpaced(plan, 0)).toEqual(plan);
  });
  it('one due item uses one slot', () => {
    expect(placeSpaced(planRound(8), 1).filter((x) => x === 'spaced')).toHaveLength(1);
  });
  it('takeCard skips the word just shown and removes what it hands out', () => {
    const c = (word: string) => ({ word, key: `word:${word}` }) as ReviewCard;
    const q = [c('was'), c('said')];
    expect(takeCard(q, 'was')!.word).toBe('said');
    expect(q.map((x) => x.word)).toEqual(['was']);
    expect(takeCard(q, 'was')).toBeUndefined();
    expect(takeCard(q)!.word).toBe('was');
  });
  it('spaced items get a gentle lead-in', () => {
    expect(spacedLead('spaced')).toMatch(/Remember/);
    expect(spacedLead('current')).toBe('');
  });
});

describe('generators make the wanted word', () => {
  it('Sight-Word Catch', () => {
    for (let k = 0; k < 20; k++) {
      const it = makeSightItem(0, Math.random, false, undefined, 'said');
      expect(it.word).toBe('said');
      expect(it.choices).toContain('said');
    }
    expect(makeSightItem(0, Math.random, false, undefined, 'zzz').word).not.toBe('zzz');
  });
  it('Word Detective: read, build, magic e and sentences; in the mode it was missed', () => {
    for (let k = 0; k < 20; k++) {
      expect(makeWordItem('digraphs', 0, indexForItemId('read-ship', 1), Math.random, false, undefined, 'ship')).toMatchObject({ kind: 'read', word: 'ship' });
      expect(makeWordItem('digraphs', 0, indexForItemId('build-ship', 0), Math.random, false, undefined, 'ship')).toMatchObject({ kind: 'build', word: 'ship' });
      expect(makeWordItem('silentE', 2, 0, Math.random, false, undefined, 'cap')).toMatchObject({ kind: 'read', word: 'cap' });
      expect(makeWordItem('silentE', 2, 0, Math.random, false, undefined, 'cape')).toMatchObject({ kind: 'read', word: 'cape' });
      expect(makeWordItem('sentences', 1, 0, Math.random, false, undefined, 'kite')).toMatchObject({ kind: 'sentence', word: 'kite' });
    }
    expect(makeWordItem('cvc', 0, 0, Math.random, false, undefined, 'zzz').word).not.toBe('zzz');
  });
});

describe('dueReviews (store)', () => {
  it('reads this child’s recent attempts only', async () => {
    const d = new AppDB('spaced-1');
    const now = day(2);
    await logAttempt({ profileId: 'a', skillId: 'sightWords', itemId: 'sight-said', level: 0, correct: false, hintUsed: false, timeMs: 1, at: day(0) }, d);
    await logAttempt({ profileId: 'b', skillId: 'sightWords', itemId: 'sight-was', level: 0, correct: false, hintUsed: false, timeMs: 1, at: day(0) }, d);
    await logAttempt({ profileId: 'a', skillId: 'sightWords', itemId: 'sight-of', level: 0, correct: false, hintUsed: false, timeMs: 1, at: day(-90) }, d);
    const cards = await dueReviews('a', ['sightWords'], now, d);
    expect(cards.map((c) => c.word)).toEqual(['said']);
    expect(await dueReviews('a', ['cvc'], now, d)).toEqual([]);
  });
});
