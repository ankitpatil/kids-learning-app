import { describe, it, expect } from 'vitest';
import { makePhonicsItem, choiceCount, phonicsWhyContext, PHONICS_MAX_LEVEL } from './generator';
import { whyRequest, leaksAnswer, checkWhyHint } from '../../ai/whyHint';
import { sanitizeRequest } from '../../ai/request';

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

describe('phonicsWhyContext (AI3c)', () => {
  it('every request passes the whitelist; naming the target letter is a leak', () => {
    for (let level = 0; level <= PHONICS_MAX_LEVEL; level++) {
      for (let i = 0; i < 15; i++) {
        const it = makePhonicsItem(level);
        const ctx = phonicsWhyContext(it, level, it.choices.find((c) => c !== it.target));
        expect(ctx.answer).toBe(it.target);
        expect(sanitizeRequest(whyRequest(ctx))).toMatchObject({ kind: 'why', subject: 'reading', track: 'phonics', item: { answer: it.target } });
        const L = it.target;
        expect(leaksAnswer(`It is ${L}.`, ctx)).toBe(true);
        expect(leaksAnswer(`Pop the ${L.toUpperCase()} balloon.`, ctx)).toBe(true);
        expect(leaksAnswer(`Listen: /${L}/.`, ctx)).toBe(true);
        expect(leaksAnswer(`${it.word.split('').join('-')}.`, ctx)).toBe(true);
        // Saying the picture word is fine (it's spoken anyway).
        if (!['a', 'i', 'o'].includes(L)) expect(leaksAnswer(`Say ${it.word} slowly. Hear the first sound?`, ctx)).toBe(false);
      }
    }
  });

  it('catches letter names and capitals, not letters inside words', () => {
    const ctx = (t: string) => phonicsWhyContext({ id: 'x', target: t, word: LETTERS[t].word, emoji: '', choices: [t] }, 0);
    expect(leaksAnswer('Find the letter ess.', ctx('s'))).toBe(true);
    expect(leaksAnswer('It looks like a bee with a big tummy.', ctx('b'))).toBe(true);
    expect(leaksAnswer('Capital T has a hat.', ctx('t'))).toBe(true);
    expect(leaksAnswer('Say sun slowly. What sound comes first?', ctx('s'))).toBe(false);
    expect(leaksAnswer("Look at the sun. It's hot!", ctx('s'))).toBe(false);
    expect(checkWhyHint('Say sun slowly. Hear the first sound?', ctx('s'))).toEqual({ ok: true, text: 'Say sun slowly. | Hear the first sound?' });
    expect(checkWhyHint('Sun starts with S.', ctx('s')).ok).toBe(false);
  });
});
