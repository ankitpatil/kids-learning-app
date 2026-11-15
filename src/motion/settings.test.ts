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

  it('treats junk or missing storage as off', () => {
    const kv = memory();
    kv.setItem('motion-settings', '{nope');
    expect(loadMotionSettings(kv).enabled).toBe(false);
    kv.setItem('motion-settings', JSON.stringify({ enabled: 'yes' }));
    expect(loadMotionSettings(kv).enabled).toBe(false);
    expect(loadMotionSettings(null).enabled).toBe(false);
  });
});
