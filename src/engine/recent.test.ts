import { describe, it, expect, beforeEach } from 'vitest';
import { fresh, resetRecent } from './recent';

describe('fresh', () => {
  beforeEach(() => resetRecent());

  it('never repeats while the pool has unseen items', () => {
    const pool = Array.from({ length: 30 }, (_, i) => `w${i}`);
    const seen = new Set<string>();
    for (let i = 0; i < 16; i++) {
      const x = fresh('t', () => pool[Math.floor(Math.random() * pool.length)], (s) => s);
      expect(seen.has(x)).toBe(false);
      seen.add(x);
    }
  });

  it('with a tiny pool, cycles instead of repeating back-to-back', () => {
    const pool = ['a', 'b', 'c'];
    let prev = '';
    for (let i = 0; i < 30; i++) {
      const x = fresh('small', () => pool[Math.floor(Math.random() * 3)], (s) => s);
      expect(x).not.toBe(prev);
      prev = x;
    }
  });

  it('a round of 8 words from a 12-word list has no repeats', () => {
    const words = Array.from({ length: 12 }, (_, i) => `word${i}`);
    const round = Array.from({ length: 8 }, () => fresh('cvc', () => words[Math.floor(Math.random() * 12)], (s) => s));
    expect(new Set(round).size).toBe(8);
  });
});
