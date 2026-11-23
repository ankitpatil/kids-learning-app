// Spaced review (#25, SPEC "Reading": spaced review 1, 3, 7 days). Pure: works from the attempts log,
// so nothing new is stored and it never drifts from what the child actually answered.
//
// A missed word/fact goes in box 1 (back tomorrow). On or after its due day, a day with only right
// answers moves it on: box 1 → back in 3 days → box 2 → back in 7 days → done. Any miss sends it back
// to box 1. Right answers before the due day (seen anyway in normal play) don't move it — that's
// not spaced recall. Days are local calendar days, so "tomorrow" means after a night's sleep.
import type { SlotKind } from './roundMix';

export const REVIEW_DAYS = [1, 3, 7] as const;
/** How far back to read attempts: long enough for a full 1 + 3 + 7 cycle plus missed days. */
export const LOOKBACK_DAYS = 45;
/** At most this many spaced items in one round (the rest wait for the next round). */
export const MAX_SPACED_PER_ROUND = 2;

export interface ReviewAttempt {
  skillId: string;
  itemId: string;
  level: number;
  correct: boolean;
  hintUsed: boolean;
  at: number;
}

export interface ReviewCard {
  skillId: string;
  /** What is being remembered: `word:ship` for word games, otherwise the item id. */
  key: string;
  /** The word, for word keys. */
  word?: string;
  /** Latest item id seen for this key (e.g. "build-ship"), without Pop/Dino wrappers. */
  itemId: string;
  /** Level it was last asked at. */
  level: number;
  /** 0 = back in 1 day, 1 = 3 days, 2 = 7 days. */
  box: number;
  /** Local day number when it's due (see `localDay`). */
  dueDay: number;
}

const WRAPPERS = ['pop-', 'dino-'];
/** Item kinds whose id is `<kind>-<word>`: the word is what's remembered, whatever the mode. */
const WORD_KINDS = ['read', 'build', 'magic', 'sentence', 'sight'];

/** Drop Pop the Answer / Dinosaur Maze wrappers so their answers count for the base item. */
export function baseItemId(itemId: string): string {
  let id = itemId;
  for (let changed = true; changed; ) {
    changed = false;
    for (const w of WRAPPERS)
      if (id.startsWith(w)) {
        id = id.slice(w.length);
        changed = true;
      }
  }
  return id;
}

/** `read-ship`, `build-ship` → `word:ship`; other ids are their own key. */
export function reviewKey(itemId: string): string {
  const id = baseItemId(itemId);
  const dash = id.indexOf('-');
  if (dash > 0 && WORD_KINDS.includes(id.slice(0, dash))) return `word:${id.slice(dash + 1)}`;
  return id;
}

/** Local calendar day number (days since 1970-01-01 in local time; DST-safe). */
export function localDay(t: number): number {
  const d = new Date(t);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/** Replay the attempts log into the open review cards (keyed `${skillId}|${key}`). */
export function buildCards(attempts: ReviewAttempt[]): Map<string, ReviewCard> {
  const sorted = [...attempts].sort((a, b) => a.at - b.at);
  // Group by key, then by day: one result per key per day.
  const days = new Map<string, Map<number, ReviewAttempt[]>>();
  for (const a of sorted) {
    const id = `${a.skillId}|${reviewKey(a.itemId)}`;
    const byDay = days.get(id) ?? new Map<number, ReviewAttempt[]>();
    const day = localDay(a.at);
    byDay.set(day, [...(byDay.get(day) ?? []), a]);
    days.set(id, byDay);
  }
  const cards = new Map<string, ReviewCard>();
  for (const [id, byDay] of days) {
    for (const [day, list] of [...byDay.entries()].sort((x, y) => x[0] - y[0])) {
      const last = list[list.length - 1];
      const key = reviewKey(last.itemId);
      const base = {
        skillId: last.skillId,
        key,
        word: key.startsWith('word:') ? key.slice(5) : undefined,
        itemId: baseItemId(last.itemId),
        level: last.level,
      };
      const card = cards.get(id);
      if (list.some((a) => !a.correct)) {
        cards.set(id, { ...base, box: 0, dueDay: day + REVIEW_DAYS[0] });
      } else if (card && day >= card.dueDay && list.every((a) => !a.hintUsed)) {
        const box = card.box + 1;
        if (box >= REVIEW_DAYS.length) cards.delete(id);
        else cards.set(id, { ...base, box, dueDay: day + REVIEW_DAYS[box] });
      }
    }
  }
  return cards;
}

/**
 * Cards due today for these tracks: most overdue first, then the newest misses (lower box) first.
 * `tracks` limits it to what the current game can ask.
 */
export function dueCards(attempts: ReviewAttempt[], now: number, tracks?: readonly string[]): ReviewCard[] {
  const today = localDay(now);
  return [...buildCards(attempts).values()]
    .filter((c) => c.dueDay <= today && (!tracks || tracks.includes(c.skillId)))
    .sort((a, b) => a.dueDay - b.dueDay || a.box - b.box || a.key.localeCompare(b.key));
}

/**
 * Put up to `n` spaced items into a round plan. They take review slots first (never the first item,
 * which stays an easy warm-up), then current slots in the middle; never the last item or a stretch.
 */
export function placeSpaced(plan: SlotKind[], n: number): SlotKind[] {
  const out = [...plan];
  let left = Math.min(n, MAX_SPACED_PER_ROUND);
  const take = (want: SlotKind, from: number, to: number) => {
    for (let i = from; i <= to && left > 0; i++)
      if (out[i] === want) {
        out[i] = 'spaced';
        left--;
      }
  };
  take('review', 1, out.length - 2);
  take('current', 2, out.length - 2);
  return out;
}

/** Hand out due cards one at a time within a round: skips one the child just saw. */
export function takeCard(queue: ReviewCard[], avoidWord?: string): ReviewCard | undefined {
  const i = queue.findIndex((c) => !c.word || c.word !== avoidWord);
  if (i < 0) return undefined;
  return queue.splice(i, 1)[0];
}

/** What's said before an item: a bonus cue for stretch, a friendly "again" for spaced review. */
export function spacedLead(kind: SlotKind): string {
  if (kind === 'stretch') return 'Bonus challenge! || ';
  if (kind === 'spaced') return 'Remember this one? || ';
  return '';
}
