import { describe, expect, it } from 'vitest';
import { DEFAULT_MOTION_SETTINGS, loadMotionSettings, saveMotionSettings } from './settings';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('motion settings', () => {
  it('is off by default', () => {
    expect(loadMotionSettings(memory())).toEqual(DEFAULT_MOTION_SETTINGS);
    expect(DEFAULT_MOTION_SETTINGS.enabled).toBe(false);
  });

  it('round-trips the toggle', () => {
    const kv = memory();
    saveMotionSettings({ enabled: true }, kv);
    expect(loadMotionSettings(kv).enabled).toBe(true);
    saveMotionSettings({ enabled: false }, kv);
    expect(loadMotionSettings(kv).enabled).toBe(false);
  });

  it('defaults to body tracking and keeps the other field when saving one', () => {
    const kv = memory();
    expect(loadMotionSettings(kv).tracking).toBe('body');
    saveMotionSettings({ tracking: 'hand' }, kv);
    saveMotionSettings({ enabled: true }, kv);
    expect(loadMotionSettings(kv)).toEqual({ enabled: true, tracking: 'hand' });
    kv.setItem('motion-settings', JSON.stringify({ enabled: true, tracking: 'feet' }));
    expect(loadMotionSettings(kv).tracking).toBe('body');
  });

  it('treats junk or missing storage as off', () => {
    const kv = memory();
    kv.setItem('motion-settings', '{nope');
    expect(loadMotionSettings(kv).enabled).toBe(false);
    kv.setItem('motion-settings', JSON.stringify({ enabled: 'yes' }));
    expect(loadMotionSettings(kv).enabled).toBe(false);
    expect(loadMotionSettings(null).enabled).toBe(false);
  });
});

describe('suspending Move mode for a game with its own camera', () => {
  it('toggles and defaults to off', async () => {
    const { isMotionSuspended, setMotionSuspended } = await import('./settings');
    expect(isMotionSuspended()).toBe(false);
    setMotionSuspended(true);
    expect(isMotionSuspended()).toBe(true);
    setMotionSuspended(false);
    expect(isMotionSuspended()).toBe(false);
  });
});
