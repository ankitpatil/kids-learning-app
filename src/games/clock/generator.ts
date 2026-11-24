// #22 Tick Tock Clock (time track). Two modes, by the level's representation:
//   pictorial → 'read' : an analog clock is shown; pick the matching digital time
//   abstract  → 'find' : a digital time is shown (and can be heard); pick the matching clock
// Level range = how many minute positions are used: 1 = o'clock, 2 = o'clock + half past, 12 = every 5 minutes.
// Scaffold: o'clock / half-past levels colour the hands and name them; 5-minute levels add 5, 10, 15… round the face.
import { getLevel } from '../../engine/tracks';
import { numberWord } from '../../engine/numberWords';

export type Rng = () => number;
export type ClockMode = 'read' | 'find';
export const CLOCK_TRACK = 'time';

/** A time on a 12-hour clock: h 1..12, m 0..55 in steps of 5. */
export interface Time {
  h: number;
  m: number;
}

export interface ClockItem {
  id: string;
  mode: ClockMode;
  time: Time;
  /** Choices including the answer (digital times for 'read', clocks for 'find'). */
  choices: Time[];
  /** Coloured, labelled hands ("short hand = hour"). */
  scaffold: boolean;
  /** Show 5, 10, 15 … 55 round the outside of the face. */
  minuteLabels: boolean;
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

/** Wrap an hour into 1..12. */
export const wrapHour = (h: number) => ((((h - 1) % 12) + 12) % 12) + 1;
export const sameTime = (a: Time, b: Time) => a.h === b.h && a.m === b.m;
export const timeKey = (t: Time) => `${t.h}:${String(t.m).padStart(2, '0')}`;

/** Digital text: "3:00", "4:30", "11:05". */
export const timeText = timeKey;

/** Spoken: "three o'clock", "half past four", "eleven oh five", "seven twenty five". */
export function timeWords(t: Time): string {
  const h = numberWord(t.h);
  if (t.m === 0) return `${h} o'clock`;
  if (t.m === 30) return `half past ${h}`;
  return `${h} ${t.m < 10 ? `oh ${numberWord(t.m)}` : numberWord(t.m)}`;
}

/** Hand angles in degrees clockwise from 12. The hour hand moves on as the minutes pass (half past 3 = between 3 and 4). */
export function handAngles(t: Time): { hour: number; minute: number } {
  return { hour: ((t.h % 12) * 30 + t.m * 0.5) % 360, minute: (t.m * 6) % 360 };
}

/** Number on the face the minute hand points at (0 → 12). */
export const minuteNumber = (m: number) => (m === 0 ? 12 : m / 5);

/** Minutes a level can use. */
export function minutesFor(range: number): number[] {
  if (range <= 1) return [0];
  if (range <= 2) return [0, 30];
  return Array.from({ length: 12 }, (_, i) => i * 5);
}

export function clockMode(level: number, ease = false): ClockMode {
  if (ease) return 'read';
  return getLevel(CLOCK_TRACK, level).representation === 'abstract' ? 'find' : 'read';
}

/**
 * Wrong choices for `t`.
 *  far  : hours at least 3 away (with any minute the level uses)
 *  near : the classic slips — hour one off (half past 3 read as 4:30), the other minute (3:00 / 3:30),
 *         5 minutes off, and reading the minute hand's number as minutes (3:20 read as 3:04).
 */
export function clockDistractors(t: Time, minutes: number[], near: boolean, count: number, rng: Rng): Time[] {
  const out: Time[] = [];
  // `slip` choices may use a minute the level doesn't (3:04); every other choice uses the level's minutes.
  const add = (c: Time, slip = false) => {
    if (out.length >= count || c.h < 1 || c.h > 12) return;
    if (!slip && !minutes.includes(c.m)) return;
    if (sameTime(c, t) || out.some((o) => sameTime(o, c))) return;
    out.push(c);
  };
  if (near) {
    const cands: Time[] = [
      { h: wrapHour(t.h + 1), m: t.m },
      { h: wrapHour(t.h - 1), m: t.m },
      ...minutes.filter((m) => m !== t.m && Math.abs(m - t.m) <= (minutes.length > 2 ? 5 : 30)).map((m) => ({ h: t.h, m })),
    ];
    // Minute hand on the 4 read as "4 minutes" — only a real slip when it differs from the minutes.
    const slip = minuteNumber(t.m);
    const slips: Time[] = minutes.length > 2 && t.m >= 10 && slip !== t.m ? [{ h: t.h, m: slip }] : [];
    // Half past: the hour-after slip first; then the minute-number slip; then the rest in random order.
    if (t.m === 30) add(cands[0]);
    for (const c of slips) add(c, true);
    for (const c of shuffle(cands, rng)) add(c);
  }
  for (let guard = 0; out.length < count && guard < 200; guard++) {
    const h = int(rng, 1, 12);
    const d = Math.min(Math.abs(h - t.h), 12 - Math.abs(h - t.h));
    if (!near && d < 3) continue;
    add({ h, m: minutes[int(rng, 0, minutes.length - 1)] });
  }
  return out;
}

/**
 * Read a logged id (`time-read-3:30`, `time-find-11:05`) back into its time (#25d spaced review),
 * checked against the level it's asked at: that level's mode, and a minute the level uses.
 * Undefined otherwise (e.g. an eased o'clock item logged at a "find" level).
 */
export function parseClockId(itemId: string, level: number): Time | undefined {
  const m = /^time-(read|find)-(\d{1,2}):(\d\d)$/.exec(itemId);
  if (!m) return undefined;
  const h = +m[2], min = +m[3];
  if (m[1] !== clockMode(level) || h < 1 || h > 12) return undefined;
  if (!minutesFor(getLevel(CLOCK_TRACK, level).range).includes(min)) return undefined;
  return { h, m: min };
}

/**
 * One item. `want` (#25d): an item id to ask again — the same time with fresh look-alike choices;
 * ignored unless it fits this level (see `parseClockId`).
 */
export function makeClockItem(level: number, rng: Rng = Math.random, ease = false, avoid?: string, want?: string): ClockItem {
  const cfg = getLevel(CLOCK_TRACK, level);
  const mode = clockMode(level, ease);
  const minutes = ease ? [0] : minutesFor(cfg.range);
  const near = !ease && cfg.distractors === 'near';
  const wanted = want && !ease ? parseClockId(want, level) : undefined;
  const pick = (): Time => ({ h: int(rng, 1, 12), m: minutes[int(rng, 0, minutes.length - 1)] });
  let time = wanted ?? pick();
  for (let i = 0; !wanted && i < 8 && `time-${mode}-${timeKey(time)}` === avoid; i++) time = pick();
  // Read: 3 big choices up to half past, 4 for 5 minutes. Find: 3 clocks (they're big).
  const count = mode === 'find' || minutes.length <= 2 ? 2 : 3;
  const choices = shuffle([time, ...clockDistractors(time, minutes, near, count, rng)], rng);
  return {
    id: `time-${mode}-${timeKey(time)}`,
    mode,
    time,
    choices,
    scaffold: ease || cfg.scaffold,
    minuteLabels: minutes.length > 2 && (ease || cfg.scaffold),
  };
}

/** Spoken prompt for the item. */
export function clockPrompt(it: ClockItem): string {
  if (it.mode === 'read') return 'What time does the clock show?';
  return `Find the clock that shows ${timeWords(it.time)}!`;
}

/**
 * Canned hint after a miss. It points at the hand the child got wrong:
 * the hour was off → the short hand; the minutes were off → the long hand.
 */
export function clockHint(it: ClockItem, picked?: Time): string {
  const t = it.time;
  const hourOff = !picked || picked.h !== t.h;
  const minOff = !picked || picked.m !== t.m;
  const shortHand =
    t.m === 0 ? `The short hand points to the ${numberWord(t.h)}.` : `The short hand is just past the ${numberWord(t.h)}.`;
  const longHand =
    t.m === 0
      ? 'The long hand points up to the twelve. | That means o\'clock!'
      : t.m === 30
        ? 'The long hand points down to the six. | That means half past!'
        : `The long hand points to the ${numberWord(minuteNumber(t.m))}. | Count by fives!`;
  if (hourOff && !minOff) return `The short hand shows the hour. | ${shortHand}`;
  if (minOff && !hourOff) return `The long hand shows the minutes. | ${longHand}`;
  return `${shortHand} | ${longHand}`;
}

/** Count-by-fives strip up to the minutes (20 → [5, 10, 15, 20]), shown as a hint on 5-minute levels. */
export function fivesTo(m: number): number[] {
  return Array.from({ length: m / 5 }, (_, i) => (i + 1) * 5);
}
