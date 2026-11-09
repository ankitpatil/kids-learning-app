import { describe, it, expect } from 'vitest';
import { makeHopItem, checkHops, frogAt, hopMode, maxHops, smallChoices, splitText, HOP_TRACKS } from './generator';
import { maxLevel, getTrack } from '../../engine/tracks';

const many = (fn: () => void, n = 300) => {
  for (let i = 0; i < n; i++) fn();
};

describe('hopMode (CPA progression)', () => {
  it('within 10: hops on the line, then equation only', () => {
    expect(hopMode('add10', 0)).toBe('hop');
    expect(hopMode('add10', 1)).toBe('hop');
    expect(hopMode('add10', 2)).toBe('choose');
    expect(hopMode('sub10', 2)).toBe('choose');
  });
  it('within 20: make-10 strategy, then equation only', () => {
    expect(hopMode('add20', 0)).toBe('make10');
    expect(hopMode('sub20', 0)).toBe('make10');
    expect(hopMode('add20', 1)).toBe('choose');
  });
  it('easing always falls back to counting hops', () => {
    for (const t of HOP_TRACKS) expect(hopMode(t, maxLevel(t), true)).toBe('hop');
  });
  it('all four tracks are playable', () => {
    for (const t of HOP_TRACKS) expect(getTrack(t).playable).toBe(true);
  });
});

describe('makeHopItem', () => {
  it('answers are right and stay on the line for every track and level', () => {
    for (const t of HOP_TRACKS) {
      for (let lvl = 0; lvl <= maxLevel(t); lvl++) {
        many(() => {
          const it = makeHopItem(t, lvl);
          expect(it.answer).toBe(it.op === '+' ? it.a + it.b : it.a - it.b);
          expect(it.b).toBeGreaterThanOrEqual(1);
          expect(it.answer).toBeGreaterThanOrEqual(1);
          expect(Math.max(it.a, it.answer)).toBeLessThanOrEqual(it.lineMax);
          expect(it.op).toBe(t.startsWith('sub') ? '-' : '+');
        });
      }
    }
  });

  it('within-10 levels never go past 10 (or 5 at level 0)', () => {
    many(() => {
      const a0 = makeHopItem('add10', 0);
      expect(a0.answer).toBeLessThanOrEqual(5);
      expect(a0.lineMax).toBe(10);
      const s1 = makeHopItem('sub10', 1);
      expect(s1.a).toBeLessThanOrEqual(10);
    });
  });

  it('make-10 items always cross ten and split b into to-ten + rest', () => {
    many(() => {
      const add = makeHopItem('add20', 0);
      expect(add.a).toBeLessThan(10);
      expect(add.answer).toBeGreaterThan(10);
      expect(add.a + add.toTen).toBe(10);
      expect(add.toTen + add.rest).toBe(add.b);
      expect(add.rest).toBeGreaterThanOrEqual(1);
      expect(add.splitChoices).toContain(add.toTen);
      expect(add.choices).toContain(add.answer);

      const sub = makeHopItem('sub20', 0);
      expect(sub.a).toBeGreaterThan(10);
      expect(sub.answer).toBeLessThan(10);
      expect(sub.a - sub.toTen).toBe(10);
      expect(sub.toTen + sub.rest).toBe(sub.b);
      expect(sub.rest).toBeGreaterThanOrEqual(1);
    });
  });

  it('splitText shows the strategy', () => {
    const seq = [0, 0.99, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    let i = 0;
    const it = makeHopItem('add20', 0, () => seq[i++ % seq.length]);
    expect(it.a).toBe(5);
    expect(it.b).toBe(9);
    expect(splitText(it)).toBe('5 + 5 + 4');
  });

  it('choose mode has 4 distinct choices including the answer; hop mode has none', () => {
    many(() => {
      const it = makeHopItem('add20', 1);
      expect(it.mode).toBe('choose');
      expect(new Set(it.choices).size).toBe(4);
      expect(it.choices).toContain(it.answer);
      expect(makeHopItem('add10', 0).choices).toEqual([]);
    });
  });

  it('easing gives short hops', () => {
    many(() => {
      const it = makeHopItem('sub20', 1, Math.random, true);
      expect(it.mode).toBe('hop');
      expect(it.b).toBeLessThanOrEqual(3);
    });
  });

  it('avoids repeating the previous item', () => {
    let k = 0;
    const vals = [0, 0, 0, 0, 0.9, 0.9, 0.9, 0.9];
    const rng = () => vals[k++ % vals.length];
    const first = makeHopItem('add10', 1, () => 0);
    const second = makeHopItem('add10', 1, rng, false, first.id);
    expect(second.id).not.toBe(first.id);
  });
});

describe('checking hops', () => {
  const item = makeHopItem('add10', 1, () => 0.5);
  it('classifies hops', () => {
    expect(checkHops(item, item.b)).toBe('correct');
    expect(checkHops(item, item.b - 1)).toBe('too-few');
    expect(checkHops(item, item.b + 1)).toBe('too-many');
  });
  it('frog moves right for plus and left for minus, and never off the line', () => {
    expect(frogAt(item, item.b)).toBe(item.answer);
    const s = makeHopItem('sub10', 1, () => 0.5);
    expect(frogAt(s, s.b)).toBe(s.answer);
    expect(frogAt(s, maxHops(s))).toBe(0);
    expect(frogAt(item, maxHops(item))).toBe(item.lineMax);
  });
});

describe('smallChoices', () => {
  it('returns 4 distinct values in 1..9 including the answer', () => {
    for (let a = 1; a <= 9; a++) {
      const c = smallChoices(a, Math.random);
      expect(new Set(c).size).toBe(4);
      expect(c).toContain(a);
      c.forEach((v) => expect(v >= 1 && v <= 9).toBe(true));
    }
  });
});
