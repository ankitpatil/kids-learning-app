// Trackers for Move mode (MediaPipe). Loaded lazily, only when Move mode is on, so touch players never
// download them. Video frames are processed on this device and never leave it.
import type { HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

// The JS comes from the npm package (bundled into a lazy chunk). The wasm runtime (~9 MB) and the model
// files (hand ~8 MB, pose lite ~6 MB) are self-hosted under `mediapipe/` and runtime-cached by the service
// worker the first time Move mode starts, so it works offline afterwards (M4b). The public CDNs are only a
// fallback. Only these files are downloaded; nothing about the child is sent.
import { loadFromSources, trackerSources, type TrackerSource } from './assets';

const sources = () => trackerSources(typeof document !== 'undefined' ? document.baseURI : location.href);

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
  return loadFromSources(sources(), async (src: TrackerSource) => {
    const fileset = await FilesetResolver.forVisionTasks(src.wasmBase);
    return withDelegate((delegate) =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: src.handModel, delegate },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.4,
        minHandPresenceConfidence: 0.4,
        minTrackingConfidence: 0.4,
      }),
    );
  });
});

export const loadPoseTracker = once<PoseLandmarker>(async () => {
  const { FilesetResolver, PoseLandmarker } = await vision();
  return loadFromSources(sources(), async (src: TrackerSource) => {
    const fileset = await FilesetResolver.forVisionTasks(src.wasmBase);
    return withDelegate((delegate) =>
      PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: src.poseModel, delegate },
        runningMode: 'VIDEO',
        numPoses: MAX_PEOPLE,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      }),
    );
  });
});
