import { describe, it, expect } from 'vitest';
import { makeCountItem, checkCount } from './generator';
import { COUNT_MAX_BY_LEVEL } from '../../engine/skills';

function seq(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('makeCountItem', () => {
  it('stays within level range with enough supply', () => {
    for (let level = 0; level < COUNT_MAX_BY_LEVEL.length; level++) {
      for (let k = 0; k < 200; k++) {
        const it = makeCountItem(level);
        expect(it.target).toBeGreaterThanOrEqual(1);
        expect(it.target).toBeLessThanOrEqual(COUNT_MAX_BY_LEVEL[level]);
        expect(it.supply).toBeGreaterThan(it.target);
      }
    }
  });

  it('ease keeps target in the lower half', () => {
    for (let k = 0; k < 200; k++) {
      expect(makeCountItem(5, Math.random, true).target).toBeLessThanOrEqual(15);
    }
  });

  it('avoids repeating the previous target', () => {
    // level 1 range is 2..5; rng 0 would pick 2, which we ask to avoid
    const it = makeCountItem(1, seq([0, 0]), false, 2);
    expect(it.target).toBe(3);
  });

  it('clamps out-of-range levels', () => {
    expect(makeCountItem(99).target).toBeLessThanOrEqual(20);
    expect(makeCountItem(-1).target).toBeLessThanOrEqual(3);
  });
});

describe('checkCount', () => {
  it('classifies', () => {
    const item = { id: 'x', target: 4, supply: 7 };
    expect(checkCount(item, 4)).toBe('correct');
    expect(checkCount(item, 2)).toBe('too-few');
    expect(checkCount(item, 6)).toBe('too-many');
  });
});

import { makeFeedItem, checkFeed } from './generator';
describe('makeFeedItem', () => {
  it('count items behave like before', () => {
    for (let k = 0; k < 100; k++) {
      const it = makeFeedItem('count', 3);
      expect(it.have).toBe(0);
      expect(it.need).toBe(it.total);
      expect(it.mode).toBe('feed');
    }
  });

  it('missing-number items add up and stay in range', () => {
    for (let level = 0; level <= 2; level++) {
      for (let k = 0; k < 300; k++) {
        const ease = k % 4 === 0;
        const it = makeFeedItem('missing', level, Math.random, ease);
        expect(it.have + it.need).toBe(it.total);
        expect(it.have).toBeGreaterThanOrEqual(1);
        expect(it.need).toBeGreaterThanOrEqual(1);
        expect(it.total).toBeLessThanOrEqual(level === 2 ? 20 : 10);
        if (level === 2) expect(it.total).toBeGreaterThan(10);
        if (ease) expect(it.need).toBeLessThanOrEqual(3);
        expect(it.supply).toBeGreaterThan(it.need);
      }
    }
  });

  it('pictorial level feeds with ten-frames; abstract levels pick a number (unless easing)', () => {
    expect(makeFeedItem('missing', 0).mode).toBe('feed');
    expect(makeFeedItem('missing', 0).frames).toBe(true);
    const a = makeFeedItem('missing', 1);
    expect(a.mode).toBe('choose');
    expect(a.choices).toContain(a.need);
    expect(new Set(a.choices).size).toBe(a.choices.length);
    expect(makeFeedItem('missing', 1, Math.random, true).mode).toBe('feed');
  });

  it('checkFeed', () => {
    const it = makeFeedItem('missing', 1);
    expect(checkFeed(it, it.need)).toBe('correct');
    expect(checkFeed(it, it.need + 1)).toBe('too-many');
  });
});
