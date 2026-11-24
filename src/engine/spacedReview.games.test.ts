// #25c: spaced review in Phonics Pop, Word Builder and Story Sums.
// Every logged id (the game's own, or Pop the Answer's for letters) must round-trip:
// rebuild the item from the id → the same id and the same answer.
import { describe, it, expect } from 'vitest';
import { baseItemId, reviewKey, dueCards, type ReviewAttempt } from './spacedReview';
import { maxLevel } from './tracks';
import { makePhonicsItem, parsePhonicsId, PHONICS_MAX_LEVEL } from '../games/phonicsPop/generator';
import { lettersUpTo } from '../games/phonicsPop/letters';
import { makeEndingItem, parseEndingId } from '../games/wordBuilder/generator';
import { makeWordProblem, parseWordProblemId, solve } from '../games/wordProblems/generator';
import { THINGS } from '../content/wordProblems';
import { makePopItem } from '../games/popAnswer/generator';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('Phonics Pop: a logged id round-trips', () => {
  it('its own ids, every level', () => {
    for (let level = 0; level <= PHONICS_MAX_LEVEL; level++)
      for (let s = 0; s < 60; s++) {
        const it = makePhonicsItem(level, seeded(s * 13 + level));
        const again = makePhonicsItem(level, seeded(s + 900), false, undefined, it.id);
        expect(again.id).toBe(it.id);
        expect(again.target).toBe(it.target);
        expect(again.choices).toContain(again.target);
        expect(again.choices.length).toBe(it.choices.length);
      }
  });
  it('Pop the Answer letter ids come back as the same letter', () => {
    for (let level = 0; level <= PHONICS_MAX_LEVEL; level++)
      for (let s = 0; s < 30; s++) {
        const pop = makePopItem('phonics', level, seeded(s * 7 + level));
        const id = baseItemId(pop.id);
        expect(parsePhonicsId(id)).toBe(pop.answer);
        expect(makePhonicsItem(level, seeded(s), false, undefined, id).target).toBe(pop.answer);
        expect(reviewKey(pop.id)).toBe(reviewKey(`phonics-${pop.answer}`));
      }
  });
  it('a letter not taught yet at that level is ignored (a normal item instead)', () => {
    const late = lettersUpTo(PHONICS_MAX_LEVEL).find((l) => !lettersUpTo(0).includes(l))!;
    const it = makePhonicsItem(0, seeded(1), false, undefined, `phonics-${late}`);
    expect(lettersUpTo(0)).toContain(it.target);
  });
  it('rejects ids that are not letters', () => {
    for (const bad of ['phonics-x', 'phonics-', 'phonics-ab', 'sight-said', 'phonics-B']) expect(parsePhonicsId(bad)).toBeUndefined();
  });
});

describe('Word Builder: a logged id round-trips', () => {
  it('its own ids, every level', () => {
    for (let level = 0; level <= maxLevel('endings'); level++)
      for (let s = 0; s < 80; s++) {
        const it = makeEndingItem(level, seeded(s * 17 + level));
        const p = parseEndingId(it.id);
        expect(p).toEqual({ base: it.base, ending: it.ending, plural: it.iconCount === 2, frame: expect.any(String) });
        const again = makeEndingItem(level, seeded(s + 900), false, undefined, it.id);
        expect(again.id).toBe(it.id);
        expect(again.word).toBe(it.word);
        expect(again.ending).toBe(it.ending);
        expect(again.iconCount).toBe(it.iconCount);
        expect(again.choices).toContain(again.ending);
      }
  });
  it('keeps the same word even if it was the last one (avoid is ignored for a spaced item)', () => {
    const it = makeEndingItem(1, seeded(3));
    expect(makeEndingItem(1, seeded(4), false, it.word, it.id).word).toBe(it.word);
  });
  it('an -ed word at a level without -ed is ignored', () => {
    const it = makeEndingItem(0, seeded(5), false, undefined, 'ending-jumped-Yesterday, I {}.');
    expect(it.ending).not.toBe('ed');
  });
  it('rejects ids that do not make a sentence', () => {
    for (const bad of [
      'ending-jumped-Not a frame {}.',
      'ending-jumps-Yesterday, I {}.', // -s word in an -ed sentence
      'ending-cats-Every day, Sam {}.', // noun in a verb sentence
      'ending-jumps-I see two {}.', // verb as a plural
      'ending-zzzs-I see two {}.',
      'wp-addTo-mango-3-4',
    ])
      expect(parseEndingId(bad)).toBeUndefined();
  });
});

describe('Story Sums: a logged id round-trips', () => {
  it('thing names are unique (the id names the thing)', () => {
    expect(new Set(THINGS.map((t) => t.one)).size).toBe(THINGS.length);
  });
  it('its own ids, every level', () => {
    for (let level = 0; level <= maxLevel('wordProblems'); level++)
      for (let s = 0; s < 80; s++) {
        const it = makeWordProblem(level, seeded(s * 19 + level));
        const again = makeWordProblem(level, seeded(s + 900), false, undefined, it.id);
        expect(again.id).toBe(it.id);
        expect(again.answer).toBe(it.answer);
        expect(again.answer).toBe(solve(again));
        expect(again.mode).toBe(it.mode);
        if (again.mode !== 'equation') expect(again.choices).toContain(again.answer);
        else expect(again.equations.some((e) => e.a === again.a && e.b === again.b && e.op === again.op)).toBe(true);
      }
  });
  it('rejects ids that are not valid stories', () => {
    const bird = THINGS.find((t) => t.comes);
    for (const bad of [
      'wp-addTo-unicornium-3-4',
      'wp-takeFrom-mango-3-3', // nothing left
      'wp-addTo-mango-15-9', // past 20
      'wp-addTo-mango-0-4',
      'wp-multiply-mango-3-4',
      ...(bird ? [`wp-putTogether-${bird.one}-3-4`] : []),
    ])
      expect(parseWordProblemId(bad)).toBeUndefined();
  });
});

describe('due cards for these games', () => {
  const DAY = 86_400_000;
  const t0 = new Date(2026, 10, 20, 10).getTime();
  const a = (skillId: string, itemId: string, correct: boolean, at: number, level = 1): ReviewAttempt => ({ skillId, itemId, level, correct, hintUsed: false, at });
  it('a miss yesterday is due today, with an id the game can rebuild', () => {
    const log = [
      a('phonics', 'pop-phonics-b', false, t0),
      a('endings', 'ending-jumped-Yesterday, I {}.', false, t0, 2),
      a('wordProblems', 'wp-takeFrom-mango-7-3', false, t0),
    ];
    const cards = dueCards(log, t0 + DAY);
    expect(cards.map((c) => c.skillId).sort()).toEqual(['endings', 'phonics', 'wordProblems']);
    const by = Object.fromEntries(cards.map((c) => [c.skillId, c]));
    expect(parsePhonicsId(by.phonics.itemId)).toBe('b');
    expect(parseEndingId(by.endings.itemId)?.base).toBe('jump');
    expect(makeEndingItem(by.endings.level, seeded(1), false, undefined, by.endings.itemId).word).toBe('jumped');
    expect(parseWordProblemId(by.wordProblems.itemId)).toMatchObject({ kind: 'takeFrom', a: 7, b: 3 });
  });
  it('a Pop letter miss and a Phonics Pop miss are one card', () => {
    const log = [a('phonics', 'pop-phonics-d', false, t0), a('phonics', 'phonics-d', false, t0 + 1000)];
    expect(dueCards(log, t0 + DAY, ['phonics'])).toHaveLength(1);
  });
});
