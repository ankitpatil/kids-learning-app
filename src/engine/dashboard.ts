// Parent dashboard (#23): pure summaries of one child's attempts and track states.
// Everything stays on the device; nothing here is sent anywhere.
import { TRACKS, getLevel, levelAge, AGE_BANDS, MASTERED, type Subject, type TrackDef } from './tracks';

export interface DashAttempt {
  skillId: string;
  itemId: string;
  level: number;
  correct: boolean;
  hintUsed: boolean;
  timeMs: number;
  at: number;
}

export interface DashState {
  skillId: string;
  level: number;
  mastery: number;
  attemptsAtLevel: number;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
/** A gap longer than this between answers counts as a break, not play time. */
export const IDLE_CAP_MS = 2 * 60 * 1000;
/** A track is a weak spot below this success rate (the engine aims for ~80%). */
export const WEAK_RATE = 0.7;
/** …with at least this many recent answers, so one bad round on a new track isn't flagged. */
export const WEAK_MIN_ATTEMPTS = 6;
/** An item missed at least this often recently is listed as a tricky item. */
export const TRICKY_MIN_MISSES = 2;

/** Local-midnight start of the day containing `t`. */
export function dayStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Active play time: answers are grouped into sessions; within a session the time between answers
 * counts (capped at IDLE_CAP_MS), and each session's first answer counts its own answer time.
 */
export function activeMs(attempts: DashAttempt[]): number {
  const sorted = [...attempts].sort((a, b) => a.at - b.at);
  let total = 0;
  for (let i = 0; i < sorted.length; i++) {
    const gap = i === 0 ? Infinity : sorted[i].at - sorted[i - 1].at;
    total += gap <= IDLE_CAP_MS ? gap : Math.min(Math.max(0, sorted[i].timeMs), IDLE_CAP_MS);
  }
  return total;
}

export interface DayMinutes {
  /** Local-midnight timestamp. */
  day: number;
  minutes: number;
  answers: number;
}

/** Minutes played on each of the last `days` days (oldest first, today last). */
export function minutesByDay(attempts: DashAttempt[], now: number, days = 7): DayMinutes[] {
  const today = dayStart(now);
  const out: DayMinutes[] = [];
  for (let k = days - 1; k >= 0; k--) {
    // Step by calendar day (handles DST): midnight k days ago.
    const d = new Date(today);
    d.setDate(d.getDate() - k);
    const start = d.getTime();
    const next = new Date(start);
    next.setDate(next.getDate() + 1);
    const inDay = attempts.filter((a) => a.at >= start && a.at < next.getTime());
    out.push({ day: start, minutes: Math.round(activeMs(inDay) / 60000), answers: inDay.length });
  }
  return out;
}

export interface TrackRow {
  id: string;
  name: string;
  icon: string;
  subject: Subject;
  playable: boolean;
  /** Not started: no state and no answers. */
  started: boolean;
  level: number;
  levels: number;
  levelLabel: string;
  ages: string;
  mastery: number;
  /** Top level reached with mastery above MASTERED. */
  mastered: boolean;
  recentAnswers: number;
  recentCorrect: number;
  /** recentCorrect / recentAnswers, or null with no recent answers. */
  rate: number | null;
  weak: boolean;
}

function rowFor(t: TrackDef, st: DashState | undefined, recent: DashAttempt[]): TrackRow {
  const mine = recent.filter((a) => a.skillId === t.id);
  const level = Math.max(0, Math.min(st?.level ?? 0, t.levels.length - 1));
  const correct = mine.filter((a) => a.correct).length;
  const rate = mine.length ? correct / mine.length : null;
  return {
    id: t.id,
    name: t.name,
    icon: t.icon,
    subject: t.subject,
    playable: t.playable,
    started: !!st || mine.length > 0,
    level,
    levels: t.levels.length,
    levelLabel: getLevel(t.id, level).label,
    ages: AGE_BANDS.find((b) => b.id === levelAge(t.id, level))?.ages ?? '',
    mastery: st?.mastery ?? 0,
    mastered: !!st && level === t.levels.length - 1 && st.mastery > MASTERED,
    recentAnswers: mine.length,
    recentCorrect: correct,
    rate,
    weak: rate !== null && mine.length >= WEAK_MIN_ATTEMPTS && rate < WEAK_RATE,
  };
}

/** One row per track (curriculum order) with current level, mastery and recent success. */
export function trackRows(states: Record<string, DashState | undefined>, recent: DashAttempt[]): TrackRow[] {
  return TRACKS.map((t) => rowFor(t, states[t.id], recent));
}

/** Prefixes added by wrapper games (Dino Maze → Pop the Answer → the base item). */
const WRAPPERS = ['dino-', 'pop-'];
/** Item kinds whose id is `<kind>-<what was asked>`. */
const KINDS: Record<string, string> = {
  read: 'read', build: 'spell', magic: 'read', sentence: 'sentence', phonics: 'sound', sight: 'word',
  count: 'count', missing: 'missing', pv: 'number', cmp: 'compare', time: 'clock', money: 'money', group: 'groups',
  ending: 'ending', wp: 'story sum', story: 'story question',
};

/** Short, readable label for an item id ("pop-sight-said" → "said"; "missing-3+5" → "3 + __ = 8"). */
export function itemLabel(itemId: string): string {
  let id = itemId;
  for (let changed = true; changed; ) {
    changed = false;
    for (const w of WRAPPERS) {
      if (id.startsWith(w)) {
        id = id.slice(w.length);
        changed = true;
      }
    }
  }
  const dash = id.indexOf('-');
  if (dash < 0) return id;
  const kind = id.slice(0, dash);
  const rest = id.slice(dash + 1);
  const m = kind === 'missing' ? /^(\d+)\+(\d+)$/.exec(rest) : null;
  if (m) return `${m[1]} + __ = ${Number(m[1]) + Number(m[2])}`;
  if (kind === 'time') return rest.replace(/^(read|find)-/, '');
  if (kind === 'cmp') {
    const c = /^(\d+)-(\d+)-/.exec(rest);
    if (c) return `${c[1]} vs ${c[2]}`;
  }
  if (kind === 'pv' || kind === 'count') return rest;
  if (kind === 'group') {
    const g = /^(all|each|plates|sum)-(\d+)x(\d+)$/.exec(rest);
    if (g) {
      const [groups, size] = [Number(g[2]), Number(g[3])];
      if (g[1] === 'each') return `share ${groups * size} by ${groups}`;
      if (g[1] === 'plates') return `${groups * size} in ${size}s`;
      return `${groups} groups of ${size}`;
    }
  }
  if (kind === 'money') return rest.replace(/^pay-/, 'pay ').replace(/^change-(\d+)-(\d+)$/, 'change: $2 from $1');
  if (kind === 'story') return rest.replace(/-q(\d+)$/, ' (question $1)').replace(/-/g, ' ');
  if (kind in KINDS) return rest.replace(/-/g, ' ');
  return id.replace(/-/g, ' ');
}

export interface TrickyItem {
  trackId: string;
  label: string;
  misses: number;
  tries: number;
}

/** Items missed at least TRICKY_MIN_MISSES times recently, most missed first (max `limit`). */
export function trickyItems(recent: DashAttempt[], limit = 8): TrickyItem[] {
  const by = new Map<string, TrickyItem>();
  for (const a of recent) {
    const label = itemLabel(a.itemId);
    const key = `${a.skillId}|${label}`;
    const it = by.get(key) ?? { trackId: a.skillId, label, misses: 0, tries: 0 };
    it.tries++;
    if (!a.correct) it.misses++;
    by.set(key, it);
  }
  return [...by.values()]
    .filter((i) => i.misses >= TRICKY_MIN_MISSES)
    .sort((a, b) => b.misses - a.misses || b.misses / b.tries - a.misses / a.tries || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export interface DashboardSummary {
  /** Last 7 days, oldest first. */
  week: DayMinutes[];
  weekMinutes: number;
  weekAnswers: number;
  /** Share of this week's answers that were right (null with no answers). */
  weekRate: number | null;
  /** Share of this week's answers that needed a hint. */
  weekHintRate: number | null;
  tracks: TrackRow[];
  weak: TrackRow[];
  tricky: TrickyItem[];
  /** Most recent answer, or null if never played. */
  lastPlayedAt: number | null;
}

/** Everything the dashboard shows for one child. `attempts` may cover any span; "recent" = last 14 days. */
export function summarize(attempts: DashAttempt[], states: Record<string, DashState | undefined>, now: number): DashboardSummary {
  const week = minutesByDay(attempts, now, 7);
  const weekStart = week[0].day;
  const weekAttempts = attempts.filter((a) => a.at >= weekStart && a.at <= now);
  const recent = attempts.filter((a) => a.at >= now - 14 * DAY_MS && a.at <= now);
  const tracks = trackRows(states, recent);
  const n = weekAttempts.length;
  return {
    week,
    weekMinutes: week.reduce((s, d) => s + d.minutes, 0),
    weekAnswers: n,
    weekRate: n ? weekAttempts.filter((a) => a.correct).length / n : null,
    weekHintRate: n ? weekAttempts.filter((a) => a.hintUsed).length / n : null,
    tracks,
    weak: tracks.filter((t) => t.weak).sort((a, b) => (a.rate ?? 1) - (b.rate ?? 1)),
    tricky: trickyItems(recent),
    lastPlayedAt: attempts.length ? Math.max(...attempts.map((a) => a.at)) : null,
  };
}
