// Screen-time cap (#29): a daily play-time limit per child and an optional bedtime, set by a grown-up.
// Pure logic + a small per-device settings store (localStorage). Time played is the same active time as the
// parent dashboard (answers, idle gaps capped), counted per child for the local calendar day.
import { activeMs, dayStart, type DashAttempt } from './dashboard';

/** Minutes of play per child per day; 0 = no limit. */
export const DAILY_CHOICES = [0, 15, 20, 30, 45, 60, 90] as const;
/** Bedtime as minutes after midnight; null = none. */
export const BEDTIME_CHOICES = [null, 19 * 60, 19 * 60 + 30, 20 * 60, 20 * 60 + 30, 21 * 60] as const;
/** Play opens again at this time in the morning (minutes after midnight). */
export const WAKE_MIN = 6 * 60;
/** "Almost time" from this many minutes left. */
export const SOON_MIN = 5;
/** One tap on "more time" gives this many minutes (today only). */
export const EXTRA_STEP_MIN = 15;
const LATEST_BEDTIME = 23 * 60 + 59;

export interface ScreenTimeSettings {
  dailyMinutes: number;
  bedtime: number | null;
  /** Extra minutes a grown-up gave for one local day (`YYYY-MM-DD`); adds to the limit and pushes bedtime back. */
  extra: { day: string; minutes: number } | null;
}

export const DEFAULT_SCREEN_TIME: ScreenTimeSettings = { dailyMinutes: 0, bedtime: null, extra: null };

export type TimeState =
  | { state: 'off' }
  | { state: 'ok' | 'soon'; minutesLeft: number | null }
  | { state: 'up'; reason: 'minutes' | 'bedtime' };

/** Local calendar day as `YYYY-MM-DD`. */
export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Extra minutes that apply on the day of `now`. */
export function extraToday(s: ScreenTimeSettings, now: number): number {
  return s.extra && s.extra.day === dayKey(now) ? s.extra.minutes : 0;
}

/**
 * "More time today": afterwards there are at least `step` more minutes from now, under both the daily limit
 * (for a child who has played `playedMin` today) and bedtime — even if the limit was passed long ago.
 * Resets yesterday's extra.
 */
export function addExtra(s: ScreenTimeSettings, now: number, playedMin = 0, step = EXTRA_STEP_MIN): ScreenTimeSettings {
  let need = extraToday(s, now) + step;
  if (s.dailyMinutes) need = Math.max(need, Math.ceil(playedMin - s.dailyMinutes) + step);
  const m = clockMin(now);
  if (s.bedtime !== null && m >= WAKE_MIN) need = Math.max(need, m - s.bedtime + step);
  return { ...s, extra: { day: dayKey(now), minutes: Math.min(need, 600) } };
}

/** Today's active play minutes for one child (answers since local midnight). */
export function minutesToday(attempts: DashAttempt[], now: number): number {
  const start = dayStart(now);
  return activeMs(attempts.filter((a) => a.at >= start && a.at <= now)) / 60000;
}

/** Minutes after local midnight. */
function clockMin(now: number): number {
  const d = new Date(now);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Where this child stands right now. Bedtime counts from bedtime (+ today's extra) until WAKE_MIN;
 * the daily limit is `dailyMinutes` + today's extra.
 */
export function timeState(s: ScreenTimeSettings, playedMin: number, now: number): TimeState {
  if (!s.dailyMinutes && s.bedtime === null) return { state: 'off' };
  const extra = extraToday(s, now);
  const lefts: number[] = [];
  if (s.bedtime !== null) {
    const m = clockMin(now);
    const bed = Math.min(s.bedtime + extra, LATEST_BEDTIME);
    if (m < WAKE_MIN || m >= bed) return { state: 'up', reason: 'bedtime' };
    lefts.push(bed - m);
  }
  if (s.dailyMinutes) {
    const left = s.dailyMinutes + extra - playedMin;
    if (left <= 0) return { state: 'up', reason: 'minutes' };
    lefts.push(left);
  }
  const minutesLeft = Math.max(1, Math.ceil(Math.min(...lefts)));
  return { state: minutesLeft <= SOON_MIN ? 'soon' : 'ok', minutesLeft };
}

/** What the friendly bedtime screen says (and reads when tapped). */
export function restLine(reason: 'minutes' | 'bedtime'): string {
  return reason === 'bedtime'
    ? 'It is bedtime! | Sleep well, and come back in the morning!'
    : 'Time to rest your eyes! | Great playing today. | Come back tomorrow!';
}

const fmt = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h % 12 || 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};
export const bedtimeLabel = (m: number | null) => (m === null ? 'No bedtime' : fmt(m));
export const dailyLabel = (m: number) => (m ? `${m} min a day` : 'No limit');

// ---- per-device settings (localStorage) ----

type KV = Pick<Storage, 'getItem' | 'setItem'>;
const KEY = 'screen-time';
export const SCREEN_TIME_EVENT = 'screen-time-change';
const store = (): KV | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

/** Validates anything read back: unknown choices fall back to "off". */
export function normalizeScreenTime(raw: unknown): ScreenTimeSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SCREEN_TIME };
  const r = raw as Record<string, unknown>;
  const daily = (DAILY_CHOICES as readonly unknown[]).includes(r.dailyMinutes) ? (r.dailyMinutes as number) : 0;
  const bedtime = (BEDTIME_CHOICES as readonly unknown[]).includes(r.bedtime) ? (r.bedtime as number | null) : null;
  const e = r.extra as Record<string, unknown> | null | undefined;
  const extra =
    e && typeof e === 'object' && typeof e.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.day) && typeof e.minutes === 'number' && e.minutes > 0
      ? { day: e.day, minutes: Math.min(Math.round(e.minutes), 600) }
      : null;
  return { dailyMinutes: daily, bedtime, extra };
}

export function loadScreenTime(kv: KV | null = store()): ScreenTimeSettings {
  try {
    return normalizeScreenTime(JSON.parse(kv?.getItem(KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_SCREEN_TIME };
  }
}

export function saveScreenTime(s: ScreenTimeSettings, kv: KV | null = store()): void {
  try {
    kv?.setItem(KEY, JSON.stringify(normalizeScreenTime(s)));
  } catch {
    /* storage unavailable */
  }
  try {
    globalThis.dispatchEvent?.(new Event(SCREEN_TIME_EVENT));
  } catch {
    /* no window (tests) */
  }
}
