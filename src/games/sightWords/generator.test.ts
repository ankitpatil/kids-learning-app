import { describe, it, expect } from 'vitest';
import { makeSightItem, wordsFor } from './generator';
import { SIGHT_WORDS, SIGHT_CONFUSABLES } from '../../content/sightWords';
import { getTrack, pickTrack } from '../../engine/tracks';

describe('sight-word content (#17)', () => {
  it('three levels, no word repeated across levels, every word has an example using it', () => {
    expect(SIGHT_WORDS.length).toBe(getTrack('sightWords').levels.length);
    const all = SIGHT_WORDS.flat().map((w) => w.word);
    expect(new Set(all).size).toBe(all.length);
    for (const w of SIGHT_WORDS.flat()) {
      const words = w.example.toLowerCase().replace(/[^a-z' ]/g, '').split(' ');
      expect(words).toContain(w.word.toLowerCase());
    }
  });
  it('every word has at least one look-alike, never itself', () => {
    for (const w of SIGHT_WORDS.flat()) {
      const c = SIGHT_CONFUSABLES[w.word];
      expect(c && c.length).toBeTruthy();
      expect(c).not.toContain(w.word);
    }
  });
});

describe('sight-word items (#17)', () => {
  it('answer is among unique choices; 3 far / 4 near / 2 easy', () => {
    for (let k = 0; k < 200; k++) {
      const far = makeSightItem(0);
      const near = makeSightItem(1);
      const easy = makeSightItem(2, Math.random, true);
      for (const it of [far, near, easy]) {
        expect(it.choices).toContain(it.word);
        expect(new Set(it.choices).size).toBe(it.choices.length);
      }
      expect(far.choices.length).toBe(3);
      expect(near.choices.length).toBe(4);
      expect(easy.choices.length).toBe(2);
    }
  });
  it('near levels lead with look-alikes (was → saw)', () => {
    let hits = 0;
    for (let k = 0; k < 100; k++) {
      const it = makeSightItem(1);
      if (it.choices.some((c) => (SIGHT_CONFUSABLES[it.word] ?? []).includes(c))) hits++;
    }
    expect(hits).toBe(100);
  });
  it('far level avoids look-alikes', () => {
    for (let k = 0; k < 200; k++) {
      const it = makeSightItem(0);
      for (const c of it.choices) if (c !== it.word) expect(SIGHT_CONFUSABLES[it.word]).not.toContain(c);
    }
  });
  it('later levels mostly use their own list, with some review of earlier words', () => {
    const own = new Set(SIGHT_WORDS[2].map((w) => w.word));
    let review = 0;
    for (let k = 0; k < 400; k++) if (!own.has(makeSightItem(2).word)) review++;
    expect(review).toBeGreaterThan(40);
    expect(review).toBeLessThan(200);
    expect(wordsFor(0).every((w) => SIGHT_WORDS[0].includes(w))).toBe(true);
  });
  it('avoid skips the previous word', () => {
    for (let k = 0; k < 100; k++) expect(makeSightItem(0, Math.random, false, 'the').word).not.toBe('the');
  });
  it('readers reach tricky words after word endings, before sentences', () => {
    const done = Object.fromEntries(['phonics', 'cvc', 'digraphs', 'blends', 'silentE', 'vowelTeams', 'endings'].map((id) => [id, { level: 9, mastery: 0.95 }]));
    expect(pickTrack('reading', done)).toBe('sightWords');
    expect(pickTrack('reading', { ...done, sightWords: { level: 9, mastery: 0.95 } })).toBe('sentences');
  });
});
