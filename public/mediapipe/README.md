# MediaPipe files for Move mode (self-hosted, M4b)

Served from our own origin so Move mode works offline after first use. The service worker caches them the
first time Move mode starts (runtime cache `mediapipe-v1`); they are not precached because of their size.

- `models/hand_landmarker.task` — MediaPipe Hand Landmarker (float16, v1), from
  `storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/`. Apache License 2.0.
- `models/pose_landmarker_lite.task` — MediaPipe Pose Landmarker lite (float16, v1), from
  `storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/`. Apache License 2.0.
- `wasm/` — not committed: copied from `node_modules/@mediapipe/tasks-vision/wasm` (Apache License 2.0) by
  `scripts/copy-mediapipe.mjs`, which runs before `npm run dev` and `npm run build`.

When upgrading `@mediapipe/tasks-vision`, update `MP_VERSION` in `src/motion/assets.ts` (a test checks it)
and bump the cache name in `vite.config.ts` so old copies are dropped.
