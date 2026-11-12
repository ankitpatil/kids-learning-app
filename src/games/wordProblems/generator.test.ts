import { describe, it, expect } from 'vitest';
import {
  makeWordProblem, modeAt, kindsAt, solve, eqText, eqSpoken, numbersFor, storyText, wrongOpResult,
  answerChoices, equationChoices, hintFor, signHint, spokenStory, type Kind,
} from './generator';
import { PEOPLE, THINGS } from '../../content/wordProblems';
import { getTrack, pickTrack } from '../../engine/tracks';
import { gameGroup, stretchOption } from '../../engine/roundMix';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('story sums: track', () => {
  it('is playable with 3 levels and comes after More or fewer in math', () => {
    expect(getTrack('wordProblems').playable).toBe(true);
    expect(getTrack('wordProblems').levels).toHaveLength(3);
    const m = { level: 9, mastery: 0.95 };
    const done = Object.fromEntries(['count', 'add10', 'sub10', 'missing', 'add20', 'sub20', 'placeValue', 'compare2d'].map((id) => [id, m]));
    expect(pickTrack('math', done)).toBe('wordProblems');
  });
  it('is its own round-mix group (stretch stays inside the track)', () => {
    expect(gameGroup('wordProblems')).toEqual(['wordProblems']);
    expect(stretchOption('wordProblems', 0, {})).toEqual({ kind: 'stretch', trackId: 'wordProblems', level: 1 });
    expect(stretchOption('wordProblems', 2, {})).toBeNull();
  });
  it('levels go answer → equation → build; first level only get-more / take-away', () => {
    expect([0, 1, 2].map(modeAt)).toEqual(['answer', 'equation', 'build']);
    expect(modeAt(9)).toBe('build');
    expect(kindsAt(0)).toEqual(['addTo', 'takeFrom']);
    expect(kindsAt(1)).toContain('putTogether');
  });
});

describe('story sums: numbers and text', () => {
  it('numbers stay in range, every count ≥ 1, answer ≥ 1', () => {
    const rng = seeded(3);
    for (const kind of ['addTo', 'takeFrom', 'putTogether'] as Kind[]) {
      for (const range of [10, 20]) {
        for (let i = 0; i < 300; i++) {
          const { a, b } = numbersFor(kind, range, rng);
          const ans = kind === 'takeFrom' ? a - b : a + b;
          expect(a).toBeGreaterThanOrEqual(1);
          expect(b).toBeGreaterThanOrEqual(1);
          expect(b).toBeLessThanOrEqual(10);
          expect(ans).toBeGreaterThanOrEqual(1);
          expect(ans).toBeLessThanOrEqual(range);
          expect(a).toBeLessThanOrEqual(range);
        }
      }
    }
  });

  it('writes the classic stories with singular / plural right', () => {
    const riya = PEOPLE.find((p) => p.name === 'Riya')!;
    const sam = PEOPLE.find((p) => p.name === 'Liam')!;
    const mango = THINGS.find((t) => t.one === 'mango')!;
    const bird = THINGS.find((t) => t.one === 'bird')!;
    const balloon = THINGS.find((t) => t.one === 'balloon')!;
    expect(storyText('addTo', 5, 3, riya, sam, mango, 0, String)).toEqual({ lines: ['Riya has 5 mangoes.', 'She gets 3 more.'], question: 'How many mangoes does Riya have now?' });
    expect(storyText('addTo', 5, 3, riya, sam, mango, 1, String).lines[1]).toBe('Liam gives her 3 more.');
    expect(storyText('takeFrom', 7, 2, riya, sam, mango, 0, String).lines[1]).toBe('She eats 2.');
    expect(storyText('takeFrom', 6, 1, riya, sam, balloon, 0, String).lines[1]).toBe('1 balloon flies away.');
    expect(storyText('addTo', 4, 1, riya, sam, bird, 0, String).lines).toEqual(['Riya sees 4 birds in a tree.', '1 more bird comes.']);
    expect(storyText('putTogether', 4, 1, riya, sam, mango, 0, String)).toEqual({ lines: ['Riya has 4 mangoes.', 'Liam has 1 mango.'], question: 'How many mangoes do they have in all?' });
  });

  it('generated items: text and speech match, answer solves the story, no birds in put-together', () => {
    const rng = seeded(11);
    for (let level = 0; level <= 2; level++) {
      for (let i = 0; i < 200; i++) {
        const it = makeWordProblem(level, rng);
        expect(it.answer).toBe(solve(it));
        expect(it.lines.every((l) => /^[A-Z0-9]/.test(l))).toBe(true);
        expect(it.spokenLines.every((l) => /^[A-Z]/.test(l) && !/\d/.test(l))).toBe(true);
        expect(spokenStory(it)).not.toMatch(/\d/);
        if (it.kind === 'putTogether') expect(it.thing.comes).toBeFalsy();
        expect(it.mode).toBe(modeAt(level));
        if (it.mode === 'equation') {
          expect(it.equations).toHaveLength(3);
          expect(it.equations.filter((e) => e.a === it.a && e.b === it.b && e.op === it.op)).toHaveLength(1);
        } else {
          expect(it.choices).toContain(it.answer);
          expect(new Set(it.choices).size).toBe(it.choices.length);
          expect(it.choices.length).toBe(it.mode === 'build' ? 4 : 3);
        }
        expect(it.showPictures).toBe(level === 0);
      }
    }
  });

  it('easing gives a picture item within 10 with 2 choices', () => {
    const rng = seeded(5);
    for (let i = 0; i < 100; i++) {
      const it = makeWordProblem(2, rng, true);
      expect(it.mode).toBe('answer');
      expect(it.showPictures).toBe(true);
      expect(it.choices).toHaveLength(2);
      expect(it.choices).toContain(it.answer);
      expect(it.answer).toBeLessThanOrEqual(10);
      expect(it.kind).not.toBe('putTogether');
    }
  });

  it('avoids repeating the previous item', () => {
    const rng = seeded(9);
    const first = makeWordProblem(0, rng);
    for (let i = 0; i < 50; i++) expect(makeWordProblem(0, rng, false, first.id).id).not.toBe(first.id);
  });
});

describe('story sums: choices', () => {
  it('wrong-operation result', () => {
    expect(wrongOpResult({ a: 7, b: 2, op: '-' })).toBe(9);
    expect(wrongOpResult({ a: 5, b: 3, op: '+' })).toBe(2);
    expect(wrongOpResult({ a: 4, b: 4, op: '+' })).toBeNull();
  });
  it('far choices are ≥ 2 apart; near choices include the wrong-operation result', () => {
    const rng = seeded(21);
    for (let i = 0; i < 200; i++) {
      const far = answerChoices(6, 2, false, 3, 10, rng);
      expect(far).toHaveLength(3);
      for (const x of far) for (const y of far) if (x !== y) expect(Math.abs(x - y)).toBeGreaterThanOrEqual(2);
      const near = answerChoices(9, 5, true, 4, 20, rng);
      expect(near).toContain(9);
      expect(near).toContain(5);
      expect(new Set(near).size).toBe(4);
      expect(near.every((n) => n >= 1)).toBe(true);
      expect(far.every((n) => n >= 1)).toBe(true);
    }
  });
  it('equation choices are all true facts and include the flipped sign', () => {
    const rng = seeded(2);
    for (const base of [{ a: 7, b: 2, op: '-' as const }, { a: 3, b: 8, op: '+' as const }, { a: 2, b: 1, op: '-' as const }, { a: 5, b: 1, op: '+' as const }]) {
      const eqs = equationChoices(base, 3, rng);
      expect(eqs).toHaveLength(3);
      expect(new Set(eqs.map(eqText)).size).toBe(3);
      eqs.forEach((e) => {
        expect(e.result).toBe(solve(e));
        expect(e.a).toBeGreaterThanOrEqual(1);
        expect(e.b).toBeGreaterThanOrEqual(1);
        expect(e.result).toBeGreaterThanOrEqual(0);
      });
      expect(eqs.some((e) => e.op !== base.op)).toBe(true);
    }
    expect(eqText({ a: 3, op: '-', b: 1, result: 2 })).toBe('3 − 1 = 2');
    expect(eqSpoken({ a: 8, op: '+', b: 5, result: 13 })).toBe('eight plus five equals thirteen');
  });
});

describe('story sums: hints', () => {
  it('strategy hint never says the answer; sign hint names the action', () => {
    const rng = seeded(4);
    for (let i = 0; i < 200; i++) {
      const it = makeWordProblem(i % 3, rng);
      const h = hintFor(it);
      expect(h).toMatch(it.kind === 'takeFrom' ? /count back/ : /count on/);
      if (it.answer !== it.a && it.answer !== it.b) expect(h).not.toContain(` ${['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'][it.answer]},`);
      expect(signHint(it)).toMatch(it.kind === 'takeFrom' ? /Minus/ : /plus/);
    }
  });
});
