import { describe, it, expect } from 'vitest';
import { makeEndingItem, endingsAt, sentenceWith, promptSentence } from './generator';
import { ENDING_VERBS, ENDING_NOUNS, ENDING_FRAMES } from '../../content/endings';
import { pickTrack } from '../../engine/tracks';

describe('word endings content (#18)', () => {
  it('every frame has exactly one gap; base words need no spelling change', () => {
    for (const list of Object.values(ENDING_FRAMES)) for (const f of list) expect(f.split('{}').length).toBe(2);
    for (const v of ENDING_VERBS) {
      expect(v.base.endsWith('e')).toBe(false); // no dropped e (bake → baking)
      expect(/[aeiou][bdgmnpt]$/.test(v.base) && !/[aeiou]{2}[a-z]$/.test(v.base)).toBe(false); // no doubling (hop → hopping)
      expect(/[sxz]$|ch$|sh$|y$/.test(v.base) && v.base !== 'play').toBe(false); // plain -s
    }
    for (const n of ENDING_NOUNS) expect(/[sxz]$|ch$|sh$/.test(n.base)).toBe(false);
  });
});

describe('ending items (#18)', () => {
  it('level 1 uses -s and -ing; later levels add -ed', () => {
    expect(endingsAt(0)).toEqual(['s', 'ing']);
    expect(endingsAt(1)).toEqual(['s', 'ed', 'ing']);
    expect(endingsAt(2)).toEqual(['s', 'ed', 'ing']);
  });
  it('word = base + ending; the right ending is a choice; choices match the level', () => {
    for (let k = 0; k < 300; k++) {
      for (const lv of [0, 1, 2]) {
        const it = makeEndingItem(lv);
        expect(it.word).toBe(it.base + it.ending);
        expect(it.choices).toContain(it.ending);
        expect(new Set(it.choices).size).toBe(it.choices.length);
        expect([...it.choices].sort()).toEqual([...endingsAt(lv)].sort());
      }
    }
  });
  it('time clues match the ending', () => {
    for (let k = 0; k < 300; k++) {
      const it = makeEndingItem(2);
      const s = sentenceWith(it, it.word);
      if (it.ending === 'ed') expect(/Yesterday|Last night/.test(s)).toBe(true);
      if (it.ending === 'ing') expect(/ am | are | is /.test(` ${s} `)).toBe(true);
      if (it.emojiCount === 2) expect(it.ending).toBe('s');
    }
  });
  it('scaffolded levels read aloud; the top level does not unless easing', () => {
    expect(makeEndingItem(0).readAloud).toBe(true);
    expect(makeEndingItem(1).readAloud).toBe(true);
    expect(makeEndingItem(2).readAloud).toBe(false);
    expect(makeEndingItem(2, Math.random, true).readAloud).toBe(true);
  });
  it('easing offers two endings; avoid skips the previous word', () => {
    for (let k = 0; k < 100; k++) {
      const it = makeEndingItem(2, Math.random, true);
      expect(it.choices.length).toBe(2);
      expect(it.choices).toContain(it.ending);
      const prev = makeEndingItem(1);
      expect(makeEndingItem(1, Math.random, false, prev.word).word).not.toBe(prev.word);
    }
  });
  it('sentences read naturally', () => {
    const it = { ...makeEndingItem(0), before: 'Yesterday, I', after: '.', base: 'walk' };
    expect(sentenceWith(it, 'walked')).toBe('Yesterday, I walked.');
    expect(promptSentence(it)).toBe('Yesterday, I walk, blank.');
  });
  it('readers reach endings after ee/ai/oa, then tricky words', () => {
    const done = Object.fromEntries(['phonics', 'cvc', 'digraphs', 'blends', 'silentE', 'vowelTeams'].map((id) => [id, { level: 9, mastery: 0.95 }]));
    expect(pickTrack('reading', done)).toBe('endings');
    expect(pickTrack('reading', { ...done, endings: { level: 9, mastery: 0.95 } })).toBe('sightWords');
  });
});
