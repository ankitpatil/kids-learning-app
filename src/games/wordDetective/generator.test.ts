import { describe, it, expect } from 'vitest';
import { NEAR_TILE, splitGraphemes, makeReadItem, makeBuildItem, makeWordItem, makeMagicItem, makeSentenceItem, fillSentence, wrongSlots, PICTURE_TRACKS, MAGIC_E_LEVEL, EASY_SENTENCE_PATTERN } from './generator';
import { wordPattern, isSightWord, tokenizeWords } from '../stories/generator';
import { PATTERNS } from '../../content/stories';
import { blockedWords } from '../../content/kidSafe';
import { WORDS, MAGIC_E, SENTENCES } from '../../content/words';

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
    for (const t of PICTURE_TRACKS) {
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
    for (const t of PICTURE_TRACKS) {
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

describe('magic e switch (#16)', () => {
  it('shows the short or the long word; pictures always include both of the pair', () => {
    const seen = new Set<string>();
    for (let k = 0; k < 200; k++) {
      const it = makeMagicItem();
      const pair = MAGIC_E.find((p) => p.short === it.magic!.short)!;
      expect([pair.short, pair.long]).toContain(it.word);
      const emojis = it.pictures.map((p) => p.emoji);
      expect(emojis).toContain(pair.shortEmoji);
      expect(emojis).toContain(pair.longEmoji);
      expect(it.answer).toBe(it.word === pair.long ? pair.longEmoji : pair.shortEmoji);
      expect(it.pictures.length).toBe(3);
      expect(new Set(emojis).size).toBe(3);
      seen.add(it.word === pair.long ? 'long' : 'short');
    }
    expect(seen.size).toBe(2);
  });
  it('easing keeps just the pair; avoid skips the last pair', () => {
    for (let k = 0; k < 50; k++) {
      expect(makeMagicItem(Math.random, true).pictures.length).toBe(2);
      const it = makeMagicItem(Math.random, false, 'kite');
      expect(it.magic!.short).not.toBe('kit');
    }
  });
  it('silentE alternates magic switches and builds from the magic-e level up', () => {
    const a = makeWordItem('silentE', MAGIC_E_LEVEL, 0);
    const b = makeWordItem('silentE', MAGIC_E_LEVEL, 1);
    expect(a.kind === 'read' && a.magic).toBeTruthy();
    expect(b.kind).toBe('build');
    const c = makeWordItem('silentE', 1, 0);
    expect(c.kind === 'read' && !c.magic).toBe(true);
  });
  it('every pair is short + e = long', () => {
    for (const p of MAGIC_E) expect(p.short + 'e').toBe(p.long);
  });
});

describe('finish the sentence (#16)', () => {
  it('content: one blank each; answer and look-alikes are distinct', () => {
    for (const s of SENTENCES) {
      expect(s.text.split('_').length).toBe(2);
      expect(s.near.length).toBeGreaterThanOrEqual(2);
      expect(new Set([s.answer, ...s.near]).size).toBe(s.near.length + 1);
    }
    expect(new Set(SENTENCES.map((s) => s.answer)).size).toBe(SENTENCES.length);
  });
  it('level 0 = picture + 2 choices; level 1 = no picture + 3 choices; easing = picture + 2', () => {
    for (let k = 0; k < 100; k++) {
      const l0 = makeSentenceItem(0);
      const l1 = makeSentenceItem(1);
      const easy = makeSentenceItem(1, Math.random, true);
      for (const it of [l0, l1, easy]) {
        expect(it.choices).toContain(it.word);
        expect(new Set(it.choices).size).toBe(it.choices.length);
      }
      expect(l0.choices.length).toBe(2);
      expect(l0.emoji).toBeTruthy();
      expect(l1.choices.length).toBe(3);
      expect(l1.emoji).toBeUndefined();
      expect(easy.choices.length).toBe(2);
      expect(easy.emoji).toBeTruthy();
    }
  });
  it('fills the blank back into a readable sentence', () => {
    for (const s of SENTENCES) {
      const it = makeSentenceItem(0, Math.random, false);
      expect(fillSentence(it, it.word)).toBe(SENTENCES.find((x) => x.answer === it.word)!.text.replace('_', it.word));
    }
  });
  it('avoid skips the previous sentence; the sentences track always makes sentence items', () => {
    for (let k = 0; k < 50; k++) expect(makeSentenceItem(0, Math.random, false, 'mud').word).not.toBe('mud');
    for (let i = 0; i < 4; i++) expect(makeWordItem('sentences', 0, i).kind).toBe('sentence');
  });
});

describe('finish the sentence: C2 bank', () => {
  const wordsOf = (s: (typeof SENTENCES)[number]) => [...tokenizeWords(s.text.replace('_', ' ')), s.answer, ...s.near];
  it('has about three times the original 13 sentences, spread over every pattern', () => {
    expect(SENTENCES.length).toBeGreaterThanOrEqual(39);
    for (const p of PATTERNS) expect(SENTENCES.filter((s) => s.pattern === p).length).toBeGreaterThanOrEqual(4);
    expect(new Set(SENTENCES.map((s) => s.text)).size).toBe(SENTENCES.length);
  });
  it('every word (sentence, answer, look-alikes) is a tricky word or decodable at the sentence level', () => {
    for (const s of SENTENCES) {
      const cap = PATTERNS.indexOf(s.pattern);
      const bad = wordsOf(s).filter((w) => !isSightWord(w) && !(wordPattern(w) >= 0 && wordPattern(w) <= cap));
      expect(bad, s.text).toEqual([]);
    }
  });
  it('the declared pattern is the hardest one used (not over-labelled)', () => {
    for (const s of SENTENCES) {
      const hardest = Math.max(...wordsOf(s).filter((w) => !isSightWord(w)).map(wordPattern));
      expect(PATTERNS[hardest], s.text).toBe(s.pattern);
    }
  });
  it('answers are decodable words, not tricky words; everything is kid-safe', () => {
    for (const s of SENTENCES) {
      expect(wordPattern(s.answer), s.answer).toBeGreaterThanOrEqual(0);
      expect(blockedWords(wordsOf(s).join(' ')), s.text).toEqual([]);
      expect(s.emoji).toBeTruthy();
    }
  });
  it('easing only uses short-vowel / blend sentences', () => {
    for (let k = 0; k < 300; k++) {
      const it = makeSentenceItem(1, Math.random, true);
      const s = SENTENCES.find((x) => x.answer === it.word)!;
      expect(PATTERNS.indexOf(s.pattern)).toBeLessThanOrEqual(EASY_SENTENCE_PATTERN);
    }
    expect(SENTENCES.filter((s) => PATTERNS.indexOf(s.pattern) <= EASY_SENTENCE_PATTERN).length).toBeGreaterThanOrEqual(15);
  });
});
