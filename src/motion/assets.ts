// Where Move mode gets its MediaPipe wasm runtime and models (M4b).
// Self-hosted copies under `public/mediapipe/` come first so Move mode works offline after first use
// (the service worker runtime-caches them; they are too big to precache). The public CDNs are a fallback
// only, e.g. for a dev server started without `npm run copy-mediapipe`.

/** Must match the @mediapipe/tasks-vision version in package.json (checked by a test). */
export const MP_VERSION = '0.10.14';

/** Folder (relative to the app) holding the self-hosted files. */
export const LOCAL_DIR = 'mediapipe';
export const LOCAL_WASM_DIR = `${LOCAL_DIR}/wasm`;
export const LOCAL_MODEL_DIR = `${LOCAL_DIR}/models`;

/** wasm runtime files copied from node_modules at build time (SIMD + no-SIMD; the browser loads one pair). */
export const WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
] as const;

export const HAND_MODEL_FILE = 'hand_landmarker.task';
export const POSE_MODEL_FILE = 'pose_landmarker_lite.task';

export const REMOTE_WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
export const REMOTE_HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
export const REMOTE_POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export interface TrackerSource {
  /** 'local' = self-hosted (offline-capable), 'remote' = public CDN fallback. */
  kind: 'local' | 'remote';
  wasmBase: string;
  handModel: string;
  poseModel: string;
}

/** Strip trailing slashes so `${base}/file` never doubles them. */
const trim = (url: string) => url.replace(/\/+$/, '');

/**
 * Sources to try, in order. `appBase` is the URL of the app's folder (e.g. `document.baseURI`), so the
 * relative `base: './'` build works at any path.
 */
export function trackerSources(appBase: string): TrackerSource[] {
  const root = trim(new URL('.', appBase).href);
  return [
    {
      kind: 'local',
      wasmBase: `${root}/${LOCAL_WASM_DIR}`,
      handModel: `${root}/${LOCAL_MODEL_DIR}/${HAND_MODEL_FILE}`,
      poseModel: `${root}/${LOCAL_MODEL_DIR}/${POSE_MODEL_FILE}`,
    },
    {
      kind: 'remote',
      wasmBase: REMOTE_WASM_BASE,
      handModel: REMOTE_HAND_MODEL_URL,
      poseModel: REMOTE_POSE_MODEL_URL,
    },
  ];
}

/** Service-worker runtime-cache rule: same-origin files under `/mediapipe/` (wasm, js, .task). */
export const MEDIAPIPE_CACHE_PATTERN = /\/mediapipe\/(wasm|models)\/[^/]+\.(js|wasm|task)$/;

/** Try each source in order; return the first that loads. Rethrows the last error if all fail. */
export async function loadFromSources<T>(
  sources: TrackerSource[],
  load: (source: TrackerSource) => Promise<T>,
): Promise<T> {
  let lastError: unknown = new Error('no tracker sources');
  for (const source of sources) {
    try {
      return await load(source);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}
