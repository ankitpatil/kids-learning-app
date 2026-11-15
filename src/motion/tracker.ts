// Hand tracker for Move mode (MediaPipe Hand Landmarker). Loaded lazily, only when Move mode is on,
// so touch players never download it. Video frames are processed on this device and never leave it.
import type { HandLandmarker } from '@mediapipe/tasks-vision';

// The JS comes from the npm package (bundled). The wasm runtime and the model file are fetched from
// their public hosts the first time Move mode starts (they are ~9 MB + ~8 MB; too big to precache).
// Only these files are downloaded; nothing about the child is sent.
const MP_VERSION = '0.10.14';
export const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
export const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

/** Landmark index of the index fingertip — the "finger cursor". */
export const INDEX_TIP = 8;

let pending: Promise<HandLandmarker> | null = null;

export function loadHandTracker(): Promise<HandLandmarker> {
  if (!pending) {
    pending = (async () => {
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      const options = (delegate: 'GPU' | 'CPU') => ({
        baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate },
        runningMode: 'VIDEO' as const,
        numHands: 1,
        minHandDetectionConfidence: 0.4,
        minHandPresenceConfidence: 0.4,
        minTrackingConfidence: 0.4,
      });
      try {
        return await HandLandmarker.createFromOptions(fileset, options('GPU'));
      } catch {
        return await HandLandmarker.createFromOptions(fileset, options('CPU'));
      }
    })();
    pending.catch(() => {
      pending = null; // allow a retry (e.g. came back online)
    });
  }
  return pending;
}
