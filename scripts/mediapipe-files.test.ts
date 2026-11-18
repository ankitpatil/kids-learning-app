// File-system checks for the self-hosted MediaPipe files (M4b). Lives outside src/ because the app's
// tsconfig has no Node types; Vitest still runs it.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HAND_MODEL_FILE, LOCAL_MODEL_DIR, MP_VERSION, POSE_MODEL_FILE, WASM_FILES } from '../src/motion/assets';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('self-hosted files', () => {
  it('MP_VERSION matches the installed @mediapipe/tasks-vision package', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    expect(pkg.dependencies['@mediapipe/tasks-vision']).toBe(MP_VERSION);
  });

  it('the wasm files the copy script ships exist in the npm package', () => {
    const shipped = readdirSync(join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm'));
    for (const f of WASM_FILES) expect(shipped).toContain(f);
  });

  it('both models are committed under public/ (real files, not LFS pointers)', () => {
    for (const f of [HAND_MODEL_FILE, POSE_MODEL_FILE]) {
      const p = join(root, 'public', LOCAL_MODEL_DIR, f);
      expect(existsSync(p)).toBe(true);
      expect(statSync(p).size).toBeGreaterThan(1_000_000);
    }
  });

  it('the build keeps MediaPipe files out of the precache and runtime-caches them', () => {
    const cfg = readFileSync(join(root, 'vite.config.ts'), 'utf8');
    expect(cfg).toContain("globIgnores: ['mediapipe/**']");
    expect(cfg).toContain('urlPattern: MEDIAPIPE_CACHE_PATTERN');
    expect(cfg).toContain("handler: 'CacheFirst'");
  });
});
