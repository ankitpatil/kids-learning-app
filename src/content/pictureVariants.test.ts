import { describe, expect, it } from 'vitest';
import { ICON_VARIANTS, iconVariants, pickIcon } from './pictureVariants';
import { WORDS } from './words';
import { ENDING_NOUNS, ENDING_VERBS } from './endings';
import { LETTERS } from '../games/phonicsPop/letters';
import { hasIcon } from '../icons/icons';
import { makeReadItem, makeBuildItem, PICTURE_TRACKS } from '../games/wordDetective/generator';
import { makePhonicsItem } from '../games/phonicsPop/generator';
import { makeEndingItem } from '../games/wordBuilder/generator';
import { makeQuickItem } from '../engine/quickItems';
import { makePopItem } from '../games/popAnswer/generator';

const SVGS = import.meta.glob('/public/icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const bundled = new Set(Object.keys(SVGS).map((p) => p.replace('/public/icons/', '').replace('.svg', '')));

/** Seeded rng (mulberry32) so failures reproduce. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Which word each picture shows (main icon → word), per content set. */
const wordEntries = Object.values(WORDS).flat().map((w) => ({ word: w.word, icon: w.icon }));
const letterEntries = Object.values(LETTERS).map((l) => ({ word: l.word, icon: l.icon }));
const endingEntries = [...ENDING_VERBS, ...ENDING_NOUNS].map((e) => ({ word: e.base, icon: e.icon }));

describe('picture variants (I2b)', () => {
  it('every variant is a bundled SVG and every key is a main icon used in content', () => {
    const variants = Object.values(ICON_VARIANTS).flat();
    expect(variants.filter((n) => !bundled.has(n) || !hasIcon(n))).toEqual([]);
    const mains = new Set([...wordEntries, ...letterEntries, ...endingEntries].map((e) => e.icon));
    expect(Object.keys(ICON_VARIANTS).filter((k) => !mains.has(k))).toEqual([]);
    for (const [k, v] of Object.entries(ICON_VARIANTS)) {
      expect(v.length, k).toBeGreaterThan(0);
      expect(v.length, k).toBeLessThanOrEqual(2);
      expect(new Set([k, ...v]).size, k).toBe(v.length + 1);
    }
  });

  it('most common words have 2–3 pictures', () => {
    const varied = wordEntries.filter((w) => iconVariants(w.icon).length > 1);
    expect(varied.length / wordEntries.length).toBeGreaterThan(0.75);
  });

  it('no two different words share a picture (or a variant) within a content set', () => {
    for (const [name, set] of [['words', wordEntries], ['letters', letterEntries], ['endings', endingEntries]] as const) {
      const owner = new Map<string, string>();
      for (const e of set) {
        for (const icon of iconVariants(e.icon)) {
          const prev = owner.get(icon);
          expect(prev === undefined || prev === e.word, `${name}: ${icon} shows ${prev} and ${e.word}`).toBe(true);
          owner.set(icon, e.word);
        }
      }
    }
  });

  it('a variant is never also a variant of another main icon', () => {
    const seen = new Map<string, string>();
    for (const [k, v] of Object.entries(ICON_VARIANTS)) {
      for (const n of v) {
        expect(seen.get(n), n).toBeUndefined();
        expect(n in ICON_VARIANTS, n).toBe(false);
        seen.set(n, k);
      }
    }
  });

  it('pickIcon covers every variant, and leaves pictures without variants alone (no rng call)', () => {
    const rng = seeded(1);
    const got = new Set(Array.from({ length: 200 }, () => pickIcon('cat-face', rng)));
    expect([...got].sort()).toEqual(iconVariants('cat-face').sort());
    let calls = 0;
    expect(pickIcon('om-milk-jug', () => (calls++, 0.5))).toBe('om-milk-jug');
    expect(calls).toBe(0);
  });
});

describe('games pick a variant per item, and keep it', () => {
  it('Word Detective Read it: random across items, one picture per word, answer is the shown picture', () => {
    const rng = seeded(7);
    const answersForCat = new Set<string>();
    for (let i = 0; i < 600; i++) {
      const track = PICTURE_TRACKS[i % PICTURE_TRACKS.length];
      const item = makeReadItem(track, i % 3, rng, i % 5 === 0);
      // The answer picture is one of the target word's variants and is on screen exactly once.
      const target = wordEntries.find((w) => w.word === item.word)!;
      expect(iconVariants(target.icon)).toContain(item.answer);
      expect(item.pictures.filter((p) => p.icon === item.answer)).toHaveLength(1);
      expect(item.pictures.find((p) => p.icon === item.answer)!.word).toBe(item.word);
      // Never two variants of the same word (or the same picture twice).
      expect(new Set(item.pictures.map((p) => p.word)).size).toBe(item.pictures.length);
      expect(new Set(item.pictures.map((p) => p.icon)).size).toBe(item.pictures.length);
      for (const p of item.pictures) expect(bundled.has(p.icon), p.icon).toBe(true);
      if (item.word === 'cat') answersForCat.add(item.answer);
    }
    expect(answersForCat.size).toBeGreaterThan(1);
  });

  it('Word Detective Build it shows a variant of the word', () => {
    const rng = seeded(3);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const item = makeBuildItem('cvc', 0, rng);
      const target = wordEntries.find((w) => w.word === item.word)!;
      expect(iconVariants(target.icon)).toContain(item.icon);
      if (item.word === 'dog') seen.add(item.icon);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('Phonics Pop, Word Builder, Placement and Pop the Answer pick variants', () => {
    const rng = seeded(11);
    const phonics = new Set<string>();
    const endings = new Set<string>();
    const quick = new Set<string>();
    const pop = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const p = makePhonicsItem(0, rng);
      expect(iconVariants(LETTERS[p.target].icon)).toContain(p.icon);
      if (p.target === 's') phonics.add(p.icon);
      const e = makeEndingItem(2, rng);
      const src = [...ENDING_VERBS, ...ENDING_NOUNS].find((x) => x.base === e.base)!;
      expect(iconVariants(src.icon)).toContain(e.icon);
      endings.add(`${e.base}:${e.icon}`);
      const q = makeQuickItem('cvc', 0, rng);
      const qw = wordEntries.find((w) => w.word === q.answer)!;
      expect(iconVariants(qw.icon)).toContain(q.icon);
      if (q.answer === 'cat') quick.add(q.icon!);
      const pi = makePopItem('cvc', 0, rng);
      if (pi.answer === 'cat') pop.add(pi.icon!);
    }
    expect(phonics.size).toBeGreaterThan(1);
    expect(new Set([...endings].filter((x) => x.startsWith('jump:'))).size).toBeGreaterThan(0);
    expect(endings.size).toBeGreaterThan(ENDING_VERBS.length + ENDING_NOUNS.length);
    expect(quick.size).toBeGreaterThan(1);
    expect(pop.size).toBeGreaterThan(1);
  });

  it('Pop the Answer: a new variant of the same question is the same item (no-repeat key)', () => {
    const ids = new Map<string, Set<string>>();
    const rng = seeded(5);
    for (let i = 0; i < 300; i++) {
      const it = makePopItem('cvc', 0, rng);
      if (!ids.has(it.answer)) ids.set(it.answer, new Set());
      ids.get(it.answer)!.add(it.id);
    }
    for (const [word, set] of ids) expect(set.size, word).toBe(1);
  });
});
