// #25b: spaced review for math facts in Feed the Monster and Number Line Hop.
// Every logged id (the game's own, or a Pop the Answer / Dinosaur Maze wrapper) must round-trip:
// rebuild the item from the id → the same id and the same answer.
import { describe, it, expect } from 'vitest';
import { baseItemId, quickMathId, reviewKey, dueCards, type ReviewAttempt } from './spacedReview';
import { maxLevel } from './tracks';
import { makeHopItem, parseHopId, HOP_TRACKS, type HopTrack } from '../games/numberLine/generator';
import { makeFeedItem, makePlaceValueItem, parseFeedId } from '../games/feedMonster/generator';
import { makeCompareItem, pairKind, compareAnswer } from '../games/feedMonster/compare';
import { makePopItem } from '../games/popAnswer/generator';

/** Small seeded RNG so failures are reproducible. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

type FeedTrack = 'count' | 'missing' | 'placeValue' | 'compare2d';
const FEED: FeedTrack[] = ['count', 'missing', 'placeValue', 'compare2d'];

function rebuildFeed(trackId: FeedTrack, level: number, id: string) {
  if (trackId === 'compare2d') return makeCompareItem(level, seeded(9), false, undefined, id);
  if (trackId === 'placeValue') return makePlaceValueItem(level, seeded(9), false, undefined, id);
  return makeFeedItem(trackId, level, seeded(9), false, undefined, id);
}

function makeFeed(trackId: FeedTrack, level: number, rng: () => number) {
  if (trackId === 'compare2d') return makeCompareItem(level, rng);
  if (trackId === 'placeValue') return makePlaceValueItem(level, rng);
  return makeFeedItem(trackId, level, rng);
}

describe('quickMathId: Pop / Dinosaur Maze math ids → home game ids', () => {
  it('maps whole facts', () => {
    expect(quickMathId('add10-3 + 4 = ?-7')).toBe('add10-3+4');
    expect(quickMathId('add10-🍎🍎🍎 + 🍏🍏🍏🍏\n3 + 4 = ?-7')).toBe('add10-3+4');
    expect(quickMathId('sub20-15 − 7 = ?-8')).toBe('sub20-15-7');
    expect(quickMathId('sub10-🍎🍎🍏🍏🍏\n5 − 3 = ?-2')).toBe('sub10-5-3');
    expect(quickMathId('missing-3 + __ = 8-5')).toBe('missing-3+5');
    expect(quickMathId('missing-🍎🍎🍎 + ❓ = 8-5')).toBe('missing-3+5');
    expect(quickMathId('count-🍪🍪🍪-3')).toBe('count-3');
    expect(quickMathId('placeValue-3 tens and 4 ones-34')).toBe('pv-34');
    expect(quickMathId('placeValue-📦📦📦 🍪🍪🍪🍪-34')).toBe('pv-34');
  });
  it('leaves other ids alone', () => {
    expect(quickMathId('compare2d-⚖️-43')).toBe('compare2d-⚖️-43');
    expect(quickMathId('count-7')).toBe('count-7');
    expect(quickMathId('add10-3+4')).toBe('add10-3+4');
    expect(quickMathId('sight-said')).toBe('sight-said');
  });
  it('only applies to wrapped ids (a game id is never rewritten)', () => {
    expect(baseItemId('pop-add10-3 + 4 = ?-7')).toBe('add10-3+4');
    expect(baseItemId('dino-pop-count-🍪🍪-2')).toBe('count-2');
    expect(baseItemId('missing-3+5')).toBe('missing-3+5');
    expect(reviewKey('pop-sub10-5 − 3 = ?-2')).toBe(reviewKey('sub10-5-3'));
  });
});

describe('Number Line Hop: a logged id round-trips', () => {
  it('its own ids, every track and level', () => {
    for (const t of HOP_TRACKS)
      for (let level = 0; level <= maxLevel(t); level++)
        for (let s = 0; s < 40; s++) {
          const it = makeHopItem(t, level, seeded(s * 31 + level));
          const again = makeHopItem(t, level, seeded(s + 500), false, undefined, it.id);
          expect(again.id).toBe(it.id);
          expect(again.answer).toBe(it.answer);
          expect(again.mode).toBe(it.mode);
        }
  });
  it('Pop the Answer ids come back as the same fact', () => {
    for (const t of HOP_TRACKS)
      for (let level = 0; level <= maxLevel(t); level++)
        for (let s = 0; s < 40; s++) {
          const pop = makePopItem(t, level, seeded(s * 7 + level));
          const id = baseItemId(pop.id);
          const parsed = parseHopId(id);
          expect(parsed, `${pop.id} → ${id}`).toBeDefined();
          const again = makeHopItem(t, level, seeded(s), false, undefined, id);
          expect(again.id).toBe(id);
          expect(String(again.answer)).toBe(pop.answer);
        }
  });
  it('a make-10 level plays a fact that does not cross ten as plain hops (never a broken split)', () => {
    const it = makeHopItem('add20', 0, seeded(1), false, undefined, 'add20-12+3');
    expect(it.id).toBe('add20-12+3');
    expect(it.mode).toBe('hop');
    expect(it.lineMax).toBe(20);
    const sub = makeHopItem('sub20', 0, seeded(1), false, undefined, 'sub20-15-7');
    expect(sub.mode).toBe('make10');
    expect(sub.toTen + sub.rest).toBe(7);
  });
  it('ignores ids that are not valid hop facts or belong to another track', () => {
    expect(parseHopId('add10-3-4')).toBeUndefined(); // minus on an add track
    expect(parseHopId('sub10-3-4')).toBeUndefined(); // below zero
    expect(parseHopId('add20-15+9')).toBeUndefined(); // off the line
    expect(parseHopId('count-3')).toBeUndefined();
    const it = makeHopItem('add10' as HopTrack, 2, seeded(3), false, undefined, 'sub10-5-3');
    expect(it.trackId).toBe('add10');
    expect(it.op).toBe('+');
  });
});

describe('Feed the Monster: a logged id round-trips', () => {
  it('its own ids, every track and level', () => {
    for (const t of FEED)
      for (let level = 0; level <= maxLevel(t); level++)
        for (let s = 0; s < 40; s++) {
          const it = makeFeed(t, level, seeded(s * 13 + level));
          expect(parseFeedId(it.id)?.trackId, it.id).toBe(t);
          const again = rebuildFeed(t, level, it.id);
          expect(again.id).toBe(it.id);
          expect(again.need).toBe(it.need);
          expect(again.mode).toBe(it.mode);
          if (again.mode === 'choose') expect(again.choices).toContain(again.need);
        }
  });
  it('Pop the Answer ids (all but ⚖️ compare) come back as the same fact', () => {
    for (const t of ['count', 'missing', 'placeValue'] as const)
      for (let level = 0; level <= maxLevel(t); level++)
        for (let s = 0; s < 40; s++) {
          const pop = makePopItem(t, level, seeded(s * 5 + level));
          const id = baseItemId(pop.id);
          expect(parseFeedId(id)?.trackId, `${pop.id} → ${id}`).toBe(t);
          const again = rebuildFeed(t, level, id);
          expect(again.id).toBe(id);
          expect(String(t === 'placeValue' || t === 'count' ? again.total : again.need)).toBe(pop.answer);
          if (again.mode === 'choose') expect(again.choices).toContain(again.need);
        }
    // Pop's compare items carry no pair, so they are left out of Feed the Monster's spaced review.
    const cmp = makePopItem('compare2d', 0, seeded(2));
    expect(parseFeedId(baseItemId(cmp.id))).toBeUndefined();
  });
  it('a compare pair keeps its question and answer; sides may swap', () => {
    const it = makeCompareItem(2, seeded(4), false, undefined, 'cmp-29-31-fewer');
    expect(it.id).toBe('cmp-29-31-fewer');
    expect(compareAnswer(it)).toBe(29);
    expect(it.kind).toBe('tensTrap');
    expect(pairKind(34, 43)).toBe('swap');
    expect(pairKind(34, 37)).toBe('sameTens');
    expect(pairKind(21, 75)).toBe('far');
  });
  it('a missing-number fact past this level (missed in Pop at a higher level) still gets fair choices', () => {
    const it = makeFeedItem('missing', 1, seeded(5), false, undefined, 'missing-8+7');
    expect(it.total).toBe(15);
    expect(it.choices).toContain(7);
    expect(new Set(it.choices).size).toBe(it.choices.length);
  });
  it('ignores invalid or other-track ids', () => {
    expect(parseFeedId('count-0')).toBeUndefined();
    expect(parseFeedId('missing-15+9')).toBeUndefined();
    expect(parseFeedId('pv-7')).toBeUndefined();
    expect(parseFeedId('cmp-43-34-more')).toBeUndefined();
    expect(parseFeedId('add10-3+4')).toBeUndefined();
    const it = makeFeedItem('missing', 0, seeded(1), false, undefined, 'count-4');
    expect(it.trackId).toBe('missing');
  });
});

describe('schedule across games', () => {
  const day = (n: number) => new Date(2026, 10, 1 + n, 12).getTime();
  const A = (n: number, skillId: string, itemId: string, correct: boolean): ReviewAttempt => ({ skillId, itemId, level: 1, correct, hintUsed: false, at: day(n) });
  it('a fact missed in Pop the Answer is due in Number Line Hop and cleared there', () => {
    const atts = [A(0, 'add10', 'pop-add10-3 + 4 = ?-7', false)];
    const cards = dueCards(atts, day(1), ['add10']);
    expect(cards.map((c) => c.itemId)).toEqual(['add10-3+4']);
    expect(parseHopId(cards[0].itemId)).toEqual({ trackId: 'add10', a: 3, b: 4 });
    // Right in Number Line Hop on the due day → moves to the 3-day box (not due on day 2).
    atts.push(A(1, 'add10', 'add10-3+4', true));
    expect(dueCards(atts, day(2), ['add10'])).toEqual([]);
    expect(dueCards(atts, day(4), ['add10']).map((c) => c.box)).toEqual([1]);
  });
});
