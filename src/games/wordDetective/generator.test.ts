import { describe, it, expect } from 'vitest';
import { NEAR_TILE, splitGraphemes, makeReadItem, makeBuildItem, makeWordItem, wrongSlots, WORD_TRACKS } from './generator';
import { WORDS } from '../../content/words';

describe('splitGraphemes', () => {
  it('keeps digraphs and vowel teams together', () => {
    expect(splitGraphemes('ship')).toEqual(['sh', 'i', 'p']);
    expect(splitGraphemes('duck')).toEqual(['d', 'u', 'ck']);
    expect(splitGraphemes('chair')).toEqual(['ch', 'ai', 'r']);
    expect(splitGraphemes('sheep')).toEqual(['sh', 'ee', 'p']);
    expect(splitGraphemes('kite')).toEqual(['k', 'i', 't', 'e']);
    expect(splitGraphemes('yo-yo')).toEqual(['y', 'o', 'y', 'o']);
  });
  it('tiles rebuild every word', () => {
    for (const list of Object.values(WORDS)) for (const w of list) expect(splitGraphemes(w.word).join('')).toBe(w.word.replace('-', ''));
  });
});

describe('read items', () => {
  it('answer is among unique pictures; size by level/ease; near uses same pattern', () => {
    for (const t of WORD_TRACKS) {
      for (let k = 0; k < 100; k++) {
        const far = makeReadItem(t, 0);
        const near = makeReadItem(t, 1);
        const easy = makeReadItem(t, 1, Math.random, true);
        for (const it of [far, near, easy]) {
          expect(it.pictures.map((p) => p.emoji)).toContain(it.answer);
          expect(new Set(it.pictures.map((p) => p.emoji)).size).toBe(it.pictures.length);
        }
        expect(far.pictures.length).toBe(3);
        expect(near.pictures.length).toBe(4);
        expect(easy.pictures.length).toBe(2);
        const words = new Set(WORDS[t].map((w) => w.word));
        near.pictures.forEach((p) => expect(words.has(p.word)).toBe(true));
      }
    }
  });
});

describe('build items', () => {
  it('tiles contain all slots plus the right number of decoys that are not in the word', () => {
    for (const t of WORD_TRACKS) {
      for (let k = 0; k < 100; k++) {
        const far = makeBuildItem(t, 0);
        const near = makeBuildItem(t, 1);
        const easy = makeBuildItem(t, 1, Math.random, true);
        expect(far.tiles.length).toBe(far.slots.length + 1);
        expect(near.tiles.length).toBe(near.slots.length + 2);
        expect(easy.tiles.length).toBe(easy.slots.length);
        expect(easy.prefilled).toBe(1);
        for (const it of [far, near, easy]) {
          const counts = (arr: string[]) => arr.reduce<Record<string, number>>((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {});
          const tc = counts(it.tiles), sc = counts(it.slots);
          for (const [g, n] of Object.entries(sc)) expect(tc[g]).toBeGreaterThanOrEqual(n);
        }
      }
    }
  });
  it('near decoys target the taught pattern (e.g. ship gets ch or s)', () => {
    for (let k = 0; k < 200; k++) {
      const it = makeBuildItem('digraphs', 1);
      const alts = it.slots.filter((g) => g.length > 1).flatMap((g) => NEAR_TILE[g] ?? []);
      if (!alts.length) continue;
      const decoys = it.tiles.filter((x) => !it.slots.includes(x));
      expect(decoys.some((d) => alts.includes(d))).toBe(true);
    }
  });
  it('wrongSlots', () => {
    const it = makeBuildItem('digraphs', 0);
    expect(wrongSlots(it, it.slots)).toEqual([]);
    const bad = [...it.slots];
    bad[0] = 'zz';
    expect(wrongSlots(it, bad)).toEqual([0]);
  });
});

describe('makeWordItem', () => {
  it('alternates read and build', () => {
    expect(makeWordItem('cvc', 0, 0).kind).toBe('read');
    expect(makeWordItem('cvc', 0, 1).kind).toBe('build');
  });
});
