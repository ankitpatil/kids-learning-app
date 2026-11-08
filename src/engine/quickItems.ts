// "Quick items": simple tap-the-answer questions any track can produce. Used by the placement
// test today, and reusable for review rounds later.
import { getLevel } from './tracks';
import { WORDS } from '../content/words';
import { makePhonicsItem } from '../games/phonicsPop/generator';

export type Rng = () => number;

export interface QuickItem {
  trackId: string;
  level: number;
  /** Spoken prompt (pre-readers). */
  say: string;
  /** Big visual shown above the choices (emoji or equation text). */
  visual: string;
  choices: string[];
  answer: string;
}

const NUMBER_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
const spoken = (n: number) => (n <= 20 ? NUMBER_WORDS[n] : String(n));

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

/** Answer plus 3 distractors. Near = ±1/±2 (common slips); far = anywhere in range. */
export function numberChoices(answer: number, max: number, near: boolean, rng: Rng): string[] {
  const set = new Set<number>([answer]);
  const offsets = near ? [1, -1, 2, -2, 10, -10] : [];
  for (const o of shuffle(offsets, rng)) {
    if (set.size >= 4) break;
    const v = answer + o;
    if (v >= 0 && v <= max) set.add(v);
  }
  let guard = 0;
  while (set.size < 4 && guard++ < 200) set.add(int(rng, 0, Math.max(max, 4)));
  return shuffle([...set], rng).map(String);
}

function countItem(level: number, rng: Rng): QuickItem {
  const max = getLevel('count', level).range;
  const n = int(rng, Math.max(1, Math.ceil(max / 2)), max);
  return {
    trackId: 'count', level,
    say: 'How many cookies?',
    visual: '🍪'.repeat(n),
    choices: numberChoices(n, max + 2, true, rng),
    answer: String(n),
  };
}

function arithmeticItem(trackId: string, level: number, rng: Rng): QuickItem {
  const cfg = getLevel(trackId, level);
  const max = cfg.range;
  const pictures = cfg.representation === 'pictorial';
  const near = cfg.distractors === 'near';
  const isSub = trackId.startsWith('sub');
  // Within-20 tracks focus on crossing 10 (the hard part); within-10 keeps both parts ≥ 1.
  let a: number, b: number;
  if (max === 20) {
    a = int(rng, 6, 9);
    b = int(rng, 11 - a, 9);
  } else {
    a = int(rng, 1, max - 1);
    b = int(rng, 1, max - a);
  }

  if (trackId === 'missing') {
    const c = a + b;
    return {
      trackId, level,
      say: `${spoken(a)} plus what makes ${spoken(c)}?`,
      visual: `${pictures ? '🍎'.repeat(a) + ' + ❓ = ' + c : `${a} + __ = ${c}`}`,
      choices: numberChoices(b, max, near, rng),
      answer: String(b),
    };
  }
  if (isSub) {
    const total = a + b;
    return {
      trackId, level,
      say: `${spoken(total)} take away ${spoken(b)}`,
      visual: pictures && total <= 10 ? `${'🍎'.repeat(a)}${'🍏'.repeat(b)}\n${total} − ${b} = ?` : `${total} − ${b} = ?`,
      choices: numberChoices(a, max, near, rng),
      answer: String(a),
    };
  }
  return {
    trackId, level,
    say: `${spoken(a)} plus ${spoken(b)}`,
    visual: pictures && a + b <= 10 ? `${'🍎'.repeat(a)} + ${'🍏'.repeat(b)}\n${a} + ${b} = ?` : `${a} + ${b} = ?`,
    choices: numberChoices(a + b, max, near, rng),
    answer: String(a + b),
  };
}

function placeValueItem(level: number, rng: Rng): QuickItem {
  const cfg = getLevel('placeValue', level);
  const tens = int(rng, 1, Math.floor(cfg.range / 10) - 1);
  const ones = int(rng, 1, 9);
  const n = tens * 10 + ones;
  const choices = new Set([String(n), String(ones * 10 + tens), String(tens + ones)]);
  choices.add(String(n + 10 <= 99 ? n + 10 : n - 10));
  return {
    trackId: 'placeValue', level,
    say: `What number is ${tens} tens and ${ones} ones?`,
    visual: cfg.representation === 'pictorial' ? `${'📦'.repeat(tens)} ${'🍪'.repeat(ones)}` : `${tens} tens and ${ones} ones`,
    choices: shuffle([...choices], rng),
    answer: String(n),
  };
}

function compareItem(level: number, rng: Rng): QuickItem {
  const near = getLevel('compare2d', level).distractors === 'near';
  const a = int(rng, 11, 98);
  let b = near ? (a % 10) * 10 + Math.floor(a / 10) : int(rng, 11, 98); // near: swapped digits (34 vs 43)
  if (b === a || b < 10) b = a + (a < 90 ? 7 : -7);
  return {
    trackId: 'compare2d', level,
    say: 'Which number is bigger?',
    visual: '⚖️',
    choices: [String(a), String(b)],
    answer: String(Math.max(a, b)),
  };
}

function wordItem(trackId: string, level: number, rng: Rng): QuickItem {
  const list = WORDS[trackId];
  const w = list[int(rng, 0, list.length - 1)];
  const near = getLevel(trackId, level).distractors === 'near';
  let distractors: string[];
  if (near) distractors = w.near.slice(0, 3);
  else {
    // Far: other words from a different pattern so the choice is easier.
    const others = Object.entries(WORDS).filter(([k]) => k !== trackId).flatMap(([, v]) => v.map((x) => x.word));
    distractors = shuffle(others, rng).filter((x) => x !== w.word).slice(0, 3);
  }
  return {
    trackId, level,
    say: `Tap the word ${w.word}`,
    visual: w.emoji,
    choices: shuffle([w.word, ...distractors], rng),
    answer: w.word,
  };
}

function phonicsQuick(level: number, rng: Rng): QuickItem {
  const it = makePhonicsItem(level, rng);
  return { trackId: 'phonics', level, say: `Which letter does ${it.word} start with?`, visual: it.emoji, choices: it.choices, answer: it.target };
}

export function makeQuickItem(trackId: string, level: number, rng: Rng = Math.random): QuickItem {
  switch (trackId) {
    case 'count': return countItem(level, rng);
    case 'add10': case 'sub10': case 'add20': case 'sub20': case 'missing': return arithmeticItem(trackId, level, rng);
    case 'placeValue': return placeValueItem(level, rng);
    case 'compare2d': return compareItem(level, rng);
    case 'phonics': return phonicsQuick(level, rng);
    case 'cvc': case 'digraphs': case 'blends': case 'silentE': case 'vowelTeams': return wordItem(trackId, level, rng);
    default: throw new Error(`No quick items for ${trackId}`);
  }
}
