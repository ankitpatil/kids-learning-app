import { describe, it, expect } from 'vitest';
import { makePhonicsItem, choiceCount, PHONICS_MAX_LEVEL } from './generator';
import { LETTERS, lettersUpTo, CONFUSABLES } from './letters';
import { maxLevel as trackMax } from '../../engine/tracks';

describe('letters', () => {
  it('every taught letter has a picture word starting with it', () => {
    for (const l of lettersUpTo(PHONICS_MAX_LEVEL)) {
      expect(LETTERS[l]).toBeDefined();
      expect(LETTERS[l].word[0]).toBe(l);
    }
  });

  it('levels are cumulative and never repeat a letter', () => {
    const all = lettersUpTo(PHONICS_MAX_LEVEL);
    expect(new Set(all).size).toBe(all.length);
    expect(lettersUpTo(0)).toEqual(['s', 'a', 't', 'p']);
    expect(lettersUpTo(1).length).toBe(6);
  });
});

describe('makePhonicsItem', () => {
  it('only uses unlocked letters, includes the target, right number of unique choices', () => {
    for (let level = 0; level <= PHONICS_MAX_LEVEL; level++) {
      const pool = lettersUpTo(level);
      for (let k = 0; k < 300; k++) {
        const ease = k % 3 === 0;
        const it = makePhonicsItem(level, Math.random, ease);
        expect(pool).toContain(it.target);
        expect(it.choices).toContain(it.target);
        expect(new Set(it.choices).size).toBe(it.choices.length);
        expect(it.choices.length).toBe(Math.min(choiceCount(level, ease), pool.length));
        it.choices.forEach((c) => expect(pool).toContain(c));
      }
    }
  });

  it('includes the look-alike partner from level 4 up', () => {
    for (let k = 0; k < 300; k++) {
      const it = makePhonicsItem(5);
      const partner = CONFUSABLES[it.target];
      if (partner && lettersUpTo(5).includes(partner)) expect(it.choices).toContain(partner);
    }
  });

  it('ease mode never shows the look-alike partner', () => {
    for (let k = 0; k < 300; k++) {
      const it = makePhonicsItem(6, Math.random, true);
      const partner = CONFUSABLES[it.target];
      if (partner) expect(it.choices).not.toContain(partner);
    }
  });

  it('avoids repeating the previous target', () => {
    for (let k = 0; k < 200; k++) expect(makePhonicsItem(0, Math.random, false, 's').target).not.toBe('s');
  });

  it('top level drills confusable letters most of the time', () => {
    let conf = 0;
    for (let k = 0; k < 1000; k++) if (CONFUSABLES[makePhonicsItem(PHONICS_MAX_LEVEL).target]) conf++;
    expect(conf).toBeGreaterThan(500);
  });
});

describe('phonics levels line up with the track (round mix #14b)', () => {
  it('PHONICS_MAX_LEVEL matches the track level count', () => {
    expect(PHONICS_MAX_LEVEL).toBe(trackMax('phonics'));
  });
});
