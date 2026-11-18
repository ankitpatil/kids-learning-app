import { describe, expect, it } from 'vitest';
import {
  MEDIAPIPE_CACHE_PATTERN,
  MP_VERSION,
  WASM_FILES,
  loadFromSources,
  trackerSources,
} from './assets';

describe('trackerSources', () => {
  it('tries the self-hosted copy first, relative to the app folder', () => {
    const [local, remote] = trackerSources('https://kids.example.app/index.html');
    expect(local.kind).toBe('local');
    expect(local.wasmBase).toBe('https://kids.example.app/mediapipe/wasm');
    expect(local.handModel).toBe('https://kids.example.app/mediapipe/models/hand_landmarker.task');
    expect(local.poseModel).toBe('https://kids.example.app/mediapipe/models/pose_landmarker_lite.task');
    expect(remote.kind).toBe('remote');
    expect(remote.wasmBase).toContain(`tasks-vision@${MP_VERSION}`);
  });

  it('works when the app lives in a sub-folder or the URL has a hash route', () => {
    const [local] = trackerSources('https://host.test/apps/learn/#/play');
    expect(local.wasmBase).toBe('https://host.test/apps/learn/mediapipe/wasm');
  });

  it('every local URL matches the service-worker runtime-cache rule; remote ones do not', () => {
    const [local, remote] = trackerSources('https://kids.example.app/');
    for (const f of WASM_FILES) expect(MEDIAPIPE_CACHE_PATTERN.test(`${local.wasmBase}/${f}`)).toBe(true);
    expect(MEDIAPIPE_CACHE_PATTERN.test(local.handModel)).toBe(true);
    expect(MEDIAPIPE_CACHE_PATTERN.test(local.poseModel)).toBe(true);
    expect(MEDIAPIPE_CACHE_PATTERN.test(remote.handModel)).toBe(false);
    expect(MEDIAPIPE_CACHE_PATTERN.test(`${remote.wasmBase}/vision_wasm_internal.wasm`)).toBe(false);
    expect(MEDIAPIPE_CACHE_PATTERN.test('https://kids.example.app/assets/index-abc.js')).toBe(false);
  });
});

describe('loadFromSources', () => {
  const sources = trackerSources('https://kids.example.app/');

  it('uses the local copy when it loads', async () => {
    const tried: string[] = [];
    const got = await loadFromSources(sources, async (s) => {
      tried.push(s.kind);
      return s.kind;
    });
    expect(got).toBe('local');
    expect(tried).toEqual(['local']);
  });

  it('falls back to the CDN when the local copy fails', async () => {
    const got = await loadFromSources(sources, async (s) => {
      if (s.kind === 'local') throw new Error('404');
      return s.kind;
    });
    expect(got).toBe('remote');
  });

  it('rethrows the last error when every source fails (e.g. offline before first use)', async () => {
    await expect(
      loadFromSources(sources, async (s) => {
        throw new Error(`${s.kind} failed`);
      }),
    ).rejects.toThrow('remote failed');
  });
});
