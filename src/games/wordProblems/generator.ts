// Story sums (backlog #20): spoken one-step word problems → pick the answer, pick the equation,
// or build it (pick + / −, then the answer). Story kinds follow Common Core 1.OA.1 / NCERT Class 1–2:
// add to (result unknown), take from (result unknown), put together (total unknown).
import { PEOPLE, THINGS, noun, type Person, type Thing } from '../../content/wordProblems';
import { getLevel, maxLevel } from '../../engine/tracks';
import { numberWord } from '../../engine/numberWords';
import type { Rng } from '../feedMonster/generator';

export type Kind = 'addTo' | 'takeFrom' | 'putTogether';
export type Mode = 'answer' | 'equation' | 'build';
export type Op = '+' | '-';

export interface Equation {
  a: number;
  op: Op;
  b: number;
  result: number;
}

export interface WordProblem {
  id: string;
  kind: Kind;
  a: number;
  b: number;
  op: Op;
  answer: number;
  person: Person;
  /** Second person (friend who gives, or the other child in put-together stories). */
  other: Person;
  thing: Thing;
  /** Story lines shown on screen (digits). */
  lines: string[];
  question: string;
  /** The same story and question for speech (number words). */
  spokenLines: string[];
  spokenQuestion: string;
  mode: Mode;
  /** Number choices (answer and build modes). */
  choices: number[];
  /** Equation choices (equation mode). */
  equations: Equation[];
  /** Show the objects as pictures (scaffold / easing). */
  showPictures: boolean;
}

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}
function int(rng: Rng, lo: number, hi: number) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}
function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Level 1 = pick the answer (with pictures), 2 = pick the equation, 3 = build it. */
export function modeAt(level: number): Mode {
  const modes: Mode[] = ['answer', 'equation', 'build'];
  return modes[Math.max(0, Math.min(level, maxLevel('wordProblems')))];
}

/** Story kinds in play: the first level keeps to "get more" and "take away". */
export function kindsAt(level: number): Kind[] {
  return getLevel('wordProblems', level).representation === 'abstract' ? ['addTo', 'takeFrom', 'putTogether'] : ['addTo', 'takeFrom'];
}

export const opOf = (k: Kind): Op => (k === 'takeFrom' ? '-' : '+');
export const solve = (e: Pick<Equation, 'a' | 'op' | 'b'>) => (e.op === '+' ? e.a + e.b : e.a - e.b);
export const eqText = (e: Equation) => `${e.a} ${e.op === '+' ? '+' : '−'} ${e.b} = ${e.result}`;
export const eqSpoken = (e: Equation) => `${numberWord(e.a)} ${e.op === '+' ? 'plus' : 'minus'} ${numberWord(e.b)} equals ${numberWord(e.result)}`;

/** Numbers for a story: every count ≥ 1, the answer ≥ 1 and ≤ range. */
export function numbersFor(kind: Kind, range: number, rng: Rng): { a: number; b: number } {
  if (kind === 'takeFrom') {
    const a = int(rng, 3, range);
    const b = int(rng, 1, Math.min(a - 1, 10));
    return { a, b };
  }
  const a = int(rng, 2, range - 1);
  const b = int(rng, 1, Math.min(range - a, 10));
  return { a, b };
}

/** Story text with a number formatter, so the same story can be shown (digits) and spoken (words). */
export function storyText(kind: Kind, a: number, b: number, p: Person, o: Person, t: Thing, variant: number, N: (n: number) => string): { lines: string[]; question: string } {
  const has = (who: Person, n: number) => `${who.name} has ${N(n)} ${noun(t, n)}.`;
  if (kind === 'putTogether') {
    return { lines: [has(p, a), has(o, b)], question: `How many ${t.many} do they have in all?` };
  }
  const start = t.comes ? `${p.name} sees ${N(a)} ${noun(t, a)} in a tree.` : has(p, a);
  if (kind === 'addTo') {
    if (t.comes) return { lines: [start, `${N(b)} more ${noun(t, b)} ${b === 1 ? 'comes' : 'come'}.`], question: `How many ${t.many} are there now?` };
    const more = [`${cap(p.he)} gets ${N(b)} more.`, `${o.name} gives ${p.him} ${N(b)} more.`, `${cap(p.he)} finds ${N(b)} more.`][variant % 3];
    return { lines: [start, more], question: `How many ${t.many} does ${p.name} have now?` };
  }
  // takeFrom
  if (t.leave === 'eat') return { lines: [start, `${cap(p.he)} eats ${N(b)}.`], question: `How many ${t.many} are left?` };
  if (t.leave === 'fly') return { lines: [start, `${N(b)} ${noun(t, b)} ${b === 1 ? 'flies' : 'fly'} away.`], question: `How many ${t.many} are left?` };
  return { lines: [start, `${cap(p.he)} gives ${N(b)} to ${o.name}.`], question: `How many ${t.many} does ${p.name} have now?` };
}

/** The result of using the wrong operation (the most telling mistake), or null if it isn't a valid count. */
export function wrongOpResult(it: Pick<WordProblem, 'a' | 'b' | 'op'>): number | null {
  if (it.op === '-') return it.a + it.b;
  const r = Math.abs(it.a - it.b);
  return r > 0 ? r : null;
}

/** Number choices (all ≥ 1: every story answer is at least 1). Far: clearly different (≥ 2 away). Near: ±1 and the wrong-operation result. */
export function answerChoices(answer: number, wrongOp: number | null, near: boolean, count: number, max: number, rng: Rng): number[] {
  const out = new Set<number>([answer]);
  const cands = near ? shuffle([answer + 1, answer - 1, ...(wrongOp !== null ? [wrongOp] : [])], rng) : [];
  // Put the wrong-operation result first when it's there: it is the mistake we most want to catch.
  if (near && wrongOp !== null) cands.unshift(wrongOp);
  for (const c of cands) if (out.size < count && c >= 1 && c <= max + 10) out.add(c);
  let guard = 0;
  while (out.size < count && guard++ < 200) {
    const c = int(rng, 1, Math.max(max, answer + 3));
    if ([...out].every((x) => Math.abs(x - c) >= 2) || (near && c !== answer)) out.add(c);
  }
  return shuffle([...out], rng);
}

/**
 * Equation choices, all true number facts so we never show a wrong sum: the right one, the
 * same numbers with the other sign, and one with a different number from the story.
 */
export function equationChoices(it: Pick<WordProblem, 'a' | 'b' | 'op'>, count: number, rng: Rng): Equation[] {
  const right: Equation = { a: it.a, op: it.op, b: it.b, result: solve(it) };
  const big = Math.max(it.a, it.b), small = Math.min(it.a, it.b);
  const flip: Equation = it.op === '+' ? { a: big, op: '-', b: small, result: big - small } : { a: it.a, op: '+', b: it.b, result: it.a + it.b };
  const out = [right, flip];
  if (count > 2) {
    // A different second number from the story (still a true fact with a count ≥ 1).
    const nb = [it.b + 1, it.b - 1].find((n) => n >= 1 && (it.op === '+' || n < it.a)) ?? it.b + 1;
    const other: Equation = { a: it.a, op: it.op, b: nb, result: solve({ a: it.a, op: it.op, b: nb }) };
    out.push(other);
  }
  return shuffle(out, rng);
}

export function makeWordProblem(level: number, rng: Rng = Math.random, ease = false, avoid?: string): WordProblem {
  const cfg = getLevel('wordProblems', level);
  const range = ease ? Math.min(10, cfg.range) : cfg.range;
  const mode: Mode = ease ? 'answer' : modeAt(level);
  const kinds = ease ? (['addTo', 'takeFrom'] as Kind[]) : kindsAt(level);
  let it: WordProblem;
  let guard = 0;
  do {
    const kind = pick(kinds, rng);
    const thing = pick(kind === 'putTogether' ? THINGS.filter((t) => !t.comes) : THINGS, rng);
    const person = pick(PEOPLE, rng);
    const other = pick(PEOPLE.filter((x) => x.name !== person.name), rng);
    const { a, b } = numbersFor(kind, range, rng);
    const op = opOf(kind);
    const answer = solve({ a, op, b });
    const variant = int(rng, 0, 2);
    const shown = storyText(kind, a, b, person, other, thing, variant, String);
    const spoken = storyText(kind, a, b, person, other, thing, variant, numberWord);
    const base = { a, b, op };
    const near = cfg.distractors === 'near' && !ease;
    it = {
      id: `wp-${kind}-${thing.one}-${a}-${b}`,
      kind, a, b, op, answer, person, other, thing,
      lines: shown.lines.map(cap),
      question: shown.question,
      spokenLines: spoken.lines.map(cap),
      spokenQuestion: spoken.question,
      mode,
      choices: mode === 'equation' ? [] : answerChoices(answer, wrongOpResult(base), near, ease ? 2 : mode === 'build' ? 4 : 3, range, rng),
      equations: mode === 'equation' ? equationChoices(base, ease ? 2 : 3, rng) : [],
      showPictures: cfg.representation !== 'abstract' || ease,
    };
  } while (it.id === avoid && guard++ < 20);
  return it;
}

/** Spoken strategy hint after a wrong answer (never says the answer). */
export function hintFor(it: WordProblem): string {
  const a = numberWord(it.a), b = numberWord(it.b);
  if (it.kind === 'takeFrom') return `Start at ${a}, | and count back ${b}.`;
  return it.showPictures ? `Count all the ${it.thing.many}. | Or, start at ${a}, | and count on ${b}.` : `Start at ${a}, | and count on ${b}.`;
}

/** Spoken hint after the wrong sign (or wrong equation): what the story's action means. */
export function signHint(it: WordProblem): string {
  if (it.kind === 'takeFrom') return `Some ${it.thing.many} go away, so there are fewer. | Going away means take away. | Minus!`;
  if (it.kind === 'putTogether') return `We put ${it.person.name}'s and ${it.other.name}'s ${it.thing.many} together. | Together means plus!`;
  return `${it.thing.comes ? 'More come' : `${it.person.name} gets more`}, so there are more. | Getting more means plus!`;
}

/** The full story + question, spoken. */
export function spokenStory(it: WordProblem): string {
  return `${it.spokenLines.join(' | ')} || ${it.spokenQuestion}`;
}
