import { describe, it, expect } from 'vitest';
import { makeCompareItem, comparePair, compareAnswer, compareReason, compareHint, comparePraise, comparePrompt, type CompareKind } from './compare';
import { checkFeed } from './generator';
import { getTrack, maxLevel, pickTrack } from '../../engine/tracks';
import { gameGroup, stretchOption, reviewOptions } from '../../engine/roundMix';
import { makeQuickItem } from '../../engine/quickItems';

const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};
const tens = (n: number) => Math.floor(n / 10);
const ones = (n: number) => n % 10;

describe('comparePair', () => {
  const kinds: CompareKind[] = ['far', 'swap', 'sameTens', 'tensTrap'];
  it('always gives two different 2-digit numbers, smaller first', () => {
    for (const k of kinds) {
      for (let i = 0; i < 400; i++) {
        const [a, b] = comparePair(k);
        expect(a).toBeGreaterThanOrEqual(10);
        expect(b).toBeLessThanOrEqual(99);
        expect(a).toBeLessThan(b);
      }
    }
  });
  it('each kind has its shape', () => {
    for (let i = 0; i < 300; i++) {
      const [a, b] = comparePair('swap');
      expect(b).toBe(ones(a) * 10 + tens(a));
      const [c, d] = comparePair('sameTens');
      expect(tens(c)).toBe(tens(d));
      const [e, f] = comparePair('tensTrap');
      expect(tens(f)).toBe(tens(e) + 1);
      expect(ones(f)).toBeLessThan(ones(e)); // the bigger number has fewer loose cookies
      const [g, h] = comparePair('far');
      expect(tens(h) - tens(g)).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('makeCompareItem', () => {
  it('level 0 is far apart with the picture; level 1 near with picture; level 2 near, numbers only', () => {
    for (let i = 0; i < 200; i++) {
      const a = makeCompareItem(0);
      expect(a.kind).toBe('far');
      expect(a.picture).toBe(true);
      const b = makeCompareItem(1);
      expect(b.kind).not.toBe('far');
      expect(b.picture).toBe(true);
      const c = makeCompareItem(2);
      expect(c.kind).not.toBe('far');
      expect(c.picture).toBe(false);
    }
  });
  it('the answer is the bigger number for "more" and the smaller for "fewer"', () => {
    for (let i = 0; i < 300; i++) {
      const it = makeCompareItem(i % 3);
      expect(it.left).not.toBe(it.right);
      expect(it.choices).toEqual([it.left, it.right]);
      expect(it.need).toBe(compareAnswer(it));
      expect(it.need).toBe(it.ask === 'more' ? Math.max(it.left, it.right) : Math.min(it.left, it.right));
      expect(checkFeed(it, it.need)).toBe('correct');
      const other = it.left === it.need ? it.right : it.left;
      expect(checkFeed(it, other)).not.toBe('correct');
    }
  });
  it('asks both "more" and "fewer", and both sides hold the answer', () => {
    const asks = new Set<string>();
    const sides = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const it = makeCompareItem(1);
      asks.add(it.ask);
      sides.add(it.need === it.left ? 'L' : 'R');
    }
    expect(asks).toEqual(new Set(['more', 'fewer']));
    expect(sides).toEqual(new Set(['L', 'R']));
  });
  it('easing gives a far pair with the picture, asking "more"', () => {
    for (let i = 0; i < 100; i++) {
      const it = makeCompareItem(2, Math.random, true);
      expect(it.kind).toBe('far');
      expect(it.picture).toBe(true);
      expect(it.ask).toBe('more');
    }
  });
  it('near levels include swapped digits like 34 / 43', () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 300; i++) kinds.add(makeCompareItem(2).kind);
    expect(kinds).toEqual(new Set(['swap', 'sameTens', 'tensTrap']));
  });
});

describe('compare speech', () => {
  it('explains tens first when the tens differ', () => {
    const r = compareReason({ left: 34, right: 43, ask: 'more' });
    expect(r).toContain('Look at the boxes first');
    expect(r).toContain('forty three has four boxes, thirty four has three boxes');
    expect(r).toContain('forty three is more than thirty four');
  });
  it('explains ones when the tens match', () => {
    const r = compareReason({ left: 37, right: 34, ask: 'fewer' });
    expect(r).toContain('Both have three boxes');
    expect(r).toContain('thirty seven has seven cookies, thirty four has four cookies');
    expect(r).toContain('thirty four is less than thirty seven');
  });
  it('uses singulars', () => {
    expect(compareReason({ left: 11, right: 31, ask: 'more' })).toContain('eleven has one box.');
    expect(compareReason({ left: 21, right: 20, ask: 'more' })).toContain('twenty one has one cookie,');
  });
  it('prompt, hint and praise use number words', () => {
    const it = makeCompareItem(1, seq([0.1, 0.5, 0.9, 0.3, 0.2, 0.7]));
    expect(comparePrompt(it)).toMatch(it.ask === 'more' ? /more cookies/ : /fewer cookies/);
    expect(comparePrompt(it)).not.toMatch(/\d/);
    expect(compareHint(it)).toMatch(/Try again!$/);
    expect(comparePraise(it)).toMatch(/^Yes!/);
  });
});

describe('compare2d track wiring', () => {
  it('is playable with 3 levels, after tens & ones', () => {
    expect(getTrack('compare2d').playable).toBe(true);
    expect(maxLevel('compare2d')).toBe(2);
    const m = { level: 9, mastery: 0.95 };
    const before = { count: m, add10: m, sub10: m, missing: m, add20: m, sub20: m };
    expect(pickTrack('math', { ...before, placeValue: { level: 2, mastery: 0.5 } })).toBe('placeValue');
    expect(pickTrack('math', { ...before, placeValue: m })).toBe('compare2d');
  });
  it('joins Feed the Monster rounds: tens & ones stretches into it, it reviews tens & ones', () => {
    expect(gameGroup('compare2d')).toEqual(['count', 'missing', 'placeValue', 'compare2d']);
    expect(stretchOption('placeValue', 2, {})).toEqual({ kind: 'stretch', trackId: 'compare2d', level: 0 });
    const m = { level: 2, mastery: 0.95 };
    expect(reviewOptions('compare2d', 0, { placeValue: m })).toContainEqual({ kind: 'review', trackId: 'placeValue', level: 2 });
  });
  it('placement quick items exist for every level', () => {
    for (let l = 0; l <= 2; l++) {
      const q = makeQuickItem('compare2d', l);
      expect(q.choices).toContain(q.answer);
    }
  });
});
