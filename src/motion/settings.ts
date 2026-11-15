// Move mode: play with hands in front of the camera instead of touch/mouse.
// A per-device choice (a laptop on the TV vs a tablet), stored in localStorage. Off by default.

/** 'body': standing back (TV) — whole-body tracking, raise a hand to claim the turn. 'hand': close to the laptop — fingertip. */
export type TrackingMode = 'body' | 'hand';

export interface MotionSettings {
  enabled: boolean;
  tracking: TrackingMode;
}

export const DEFAULT_MOTION_SETTINGS: MotionSettings = { enabled: false, tracking: 'body' };
const KEY = 'motion-settings';
export const MOTION_EVENT = 'motion-settings-change';

type KV = Pick<Storage, 'getItem' | 'setItem'>;
const store = (): KV | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export function loadMotionSettings(kv: KV | null = store()): MotionSettings {
  try {
    const parsed = JSON.parse(kv?.getItem(KEY) ?? 'null') as Partial<MotionSettings> | null;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_MOTION_SETTINGS };
    return { enabled: parsed.enabled === true, tracking: parsed.tracking === 'hand' ? 'hand' : 'body' };
  } catch {
    return { ...DEFAULT_MOTION_SETTINGS };
  }
}

/** Saves and tells the rest of the app (the motion layer, the home toggle) that it changed. */
export function saveMotionSettings(patch: Partial<MotionSettings>, kv: KV | null = store()): void {
  const s = { ...loadMotionSettings(kv), ...patch };
  try {
    kv?.setItem(KEY, JSON.stringify({ enabled: s.enabled === true, tracking: s.tracking === 'hand' ? 'hand' : 'body' }));
  } catch {
    /* storage unavailable */
  }
  try {
    globalThis.dispatchEvent?.(new Event(MOTION_EVENT));
  } catch {
    /* no window (tests) */
  }
}
