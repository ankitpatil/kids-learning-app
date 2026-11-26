// Soft streak (#27b): counts the *days a child has played*. A missed day only pauses it — the count
// never goes back down, so a weekend away or a sick day never takes anything from the child.
// Days are local calendar days (`localDay` from spacedReview: a UTC day number built from the local
// Y/M/D), so 23-hour and 25-hour DST days and late-evening play all count as the right day.
import { localDay } from './spacedReview';

export interface Streak {
  /** Distinct local days with at least one answer. Never decreases. */
  days: number;
  /** Played at least once today. */
  today: boolean;
  /** Local day number of the last play day (undefined = never played). */
  lastDay?: number;
}

/** Build the streak from answer timestamps (any order). */
export function streakFrom(times: Iterable<number>, now: number = Date.now()): Streak {
  const days = new Set<number>();
  const todayN = localDay(now);
  for (const t of times) {
    if (!Number.isFinite(t)) continue;
    const d = localDay(t);
    if (d > todayN) continue; // clock went backwards / bad data: don't count future days
    days.add(d);
  }
  let lastDay: number | undefined;
  for (const d of days) if (lastDay === undefined || d > lastDay) lastDay = d;
  return { days: days.size, today: days.has(todayN), lastDay };
}

/** Short label for the badge, e.g. "5 play days". */
export function streakLabel(s: Streak): string {
  return `${s.days} play ${s.days === 1 ? 'day' : 'days'}`;
}

/** What a tap on the badge says. Always encouraging; a pause is never called a loss. */
export function streakLine(s: Streak): string {
  if (s.days === 0) return 'Play a game to start your play days!';
  const count = `You played on ${s.days} ${s.days === 1 ? 'day' : 'days'}!`;
  return s.today ? `${count} | You played today. Yay!` : `${count} | Play a game to add today!`;
}
