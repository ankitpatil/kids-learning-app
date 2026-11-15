// Trackers for Move mode (MediaPipe). Loaded lazily, only when Move mode is on, so touch players never
// download them. Video frames are processed on this device and never leave it.
import type { HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

// The JS comes from the npm package (bundled into a lazy chunk). The wasm runtime and the model files are
// fetched from their public hosts the first time Move mode starts (wasm ~9 MB, hand ~8 MB, pose lite ~6 MB;
// too big to precache). Only these files are downloaded; nothing about the child is sent.
const MP_VERSION = '0.10.14';
export const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
export const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
export const POSE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/** Landmark index of the index fingertip — the "finger cursor" in hand mode. */
export const INDEX_TIP = 8;
/** Most people tracked at once in body mode (the player plus a couple of onlookers). */
export const MAX_PEOPLE = 3;

const vision = () => import('@mediapipe/tasks-vision');

/** Try the GPU first, fall back to the CPU. */
async function withDelegate<T>(make: (delegate: 'GPU' | 'CPU') => Promise<T>): Promise<T> {
  try {
    return await make('GPU');
  } catch {
    return await make('CPU');
  }
}

/** Memoise a loader but allow a retry after a failure (e.g. came back online). */
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    if (!pending) {
      pending = load();
      pending.catch(() => {
        pending = null;
      });
    }
    return pending;
  };
}

export const loadHandTracker = once<HandLandmarker>(async () => {
  const { FilesetResolver, HandLandmarker } = await vision();
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  return withDelegate((delegate) =>
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.4,
      minHandPresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    }),
  );
});

export const loadPoseTracker = once<PoseLandmarker>(async () => {
  const { FilesetResolver, PoseLandmarker } = await vision();
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  return withDelegate((delegate) =>
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numPoses: MAX_PEOPLE,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }),
  );
});
