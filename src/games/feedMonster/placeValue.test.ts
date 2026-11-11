import { describe, it, expect } from 'vitest';
import { makePlaceValueItem, placeValueChoices, checkPlaceValue, isPlaceValue } from './generator';
import { numberWord, tensOnesWords } from '../../engine/numberWords';
import { getTrack, pickTrack } from '../../engine/tracks';
import { gameGroup, stretchOption } from '../../engine/roundMix';

describe('numberWord', () => {
  it('speaks 0–100', () => {
    expect(numberWord(0)).toBe('zero');
    expect(numberWord(13)).toBe('thirteen');
    expect(numberWord(20)).toBe('twenty');
    expect(numberWord(34)).toBe('thirty four');
    expect(numberWord(70)).toBe('seventy');
    expect(numberWord(99)).toBe('ninety nine');
    expect(numberWord(100)).toBe('one hundred');
    expect(numberWord(101)).toBe('101');
  });
  it('tens and ones phrase handles singulars', () => {
    expect(tensOnesWords(3, 4)).toBe('three tens and four ones');
    expect(tensOnesWords(1, 1)).toBe('one ten and one one');
    expect(tensOnesWords(5, 0)).toBe('five tens and zero ones');
  });
});

describe('makePlaceValueItem', () => {
  it('stays in each level range and adds up', () => {
    const maxBy = [49, 99, 99];
    for (let level = 0; level <= 2; level++) {
      for (let k = 0; k < 300; k++) {
        const it = makePlaceValueItem(level);
        expect(isPlaceValue(it)).toBe(true);
        expect(it.tens * 10 + it.ones).toBe(it.total);
        expect(it.need).toBe(it.total);
        expect(it.have).toBe(0);
        expect(it.total).toBeGreaterThanOrEqual(10);
        expect(it.total).toBeLessThanOrEqual(maxBy[level]);
        expect(it.ones).toBeGreaterThanOrEqual(0);
        expect(it.ones).toBeLessThanOrEqual(9);
      }
    }
  });

  it('feed mode has enough boxes and cookies, but never 10+ loose cookies', () => {
    for (let k = 0; k < 300; k++) {
      const it = makePlaceValueItem(k % 2);
      expect(it.mode).toBe('feed');
      expect(it.boxSupply).toBeGreaterThanOrEqual(it.tens);
      expect(it.boxSupply).toBeLessThanOrEqual(9);
      expect(it.supply).toBeGreaterThanOrEqual(it.ones);
      expect(it.supply).toBeLessThanOrEqual(9);
    }
  });

  it('CPA knobs: guide at level 0, none at level 1, pick-the-number at level 2', () => {
    expect(makePlaceValueItem(0).split).toBe(true);
    expect(makePlaceValueItem(1).split).toBe(false);
    const a = makePlaceValueItem(2);
    expect(a.mode).toBe('choose');
    expect(a.choices).toContain(a.total);
    expect(new Set(a.choices).size).toBe(4);
  });

  it('easing: small tens, feed mode, guide on', () => {
    for (let k = 0; k < 200; k++) {
      const it = makePlaceValueItem(2, Math.random, true);
      expect(it.tens).toBeLessThanOrEqual(3);
      expect(it.mode).toBe('feed');
      expect(it.split).toBe(true);
    }
  });

  it('avoids repeating the previous number', () => {
    const zero = () => 0; // tens 1, ones 0 → 10
    expect(makePlaceValueItem(0, zero).total).toBe(10);
    expect(makePlaceValueItem(0, zero, false, 10).total).toBe(11);
  });
});

describe('placeValueChoices', () => {
  it('near choices include swapped digits and ±10', () => {
    const c = placeValueChoices(3, 4, true, () => 0.5);
    expect(c).toContain(34);
    expect(c).toContain(43);
    expect(c).toContain(44);
    expect(c).toContain(24);
  });
  it('stay two-digit and distinct', () => {
    for (let k = 0; k < 300; k++) {
      const tens = 1 + (k % 9);
      const ones = k % 10;
      const c = placeValueChoices(tens, ones, k % 2 === 0);
      expect(new Set(c).size).toBe(4);
      expect(c).toContain(tens * 10 + ones);
      for (const v of c) {
        expect(v).toBeGreaterThanOrEqual(10);
        expect(v).toBeLessThanOrEqual(99);
      }
    }
  });
});

describe('checkPlaceValue', () => {
  const it34 = { tens: 3, ones: 4 };
  it('classifies the mistake', () => {
    expect(checkPlaceValue(it34, 3, 4)).toBe('correct');
    expect(checkPlaceValue(it34, 4, 3)).toBe('swapped');
    expect(checkPlaceValue(it34, 2, 4)).toBe('tens');
    expect(checkPlaceValue(it34, 3, 5)).toBe('ones');
    expect(checkPlaceValue(it34, 1, 1)).toBe('both');
    expect(checkPlaceValue({ tens: 2, ones: 2 }, 2, 3)).toBe('ones');
  });
});

describe('tens & ones track wiring', () => {
  it('is playable and played by Feed the Monster', () => {
    expect(getTrack('placeValue').playable).toBe(true);
    expect(gameGroup('placeValue')).toEqual(['count', 'missing', 'placeValue']);
  });
  it('comes after subtract within 20 in the math sequence', () => {
    const m = { level: 9, mastery: 0.95 };
    expect(pickTrack('math', { count: m, add10: m, sub10: m, missing: m, add20: m, sub20: m })).toBe('placeValue');
  });
  it('top of missing number stretches into tens & ones', () => {
    expect(stretchOption('missing', 2, {})).toEqual({ kind: 'stretch', trackId: 'placeValue', level: 0 });
  });
});
