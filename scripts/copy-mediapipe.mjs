// Copies the MediaPipe wasm runtime from node_modules into public/mediapipe/wasm so it is served from
// our own origin (Move mode offline, M4b). Runs automatically before `npm run dev` and `npm run build`.
// The copied files are git-ignored; the models in public/mediapipe/models are committed.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const dest = join(root, 'public', 'mediapipe', 'wasm');

mkdirSync(dest, { recursive: true });
const files = readdirSync(src).filter((f) => /\.(js|wasm)$/.test(f));
for (const f of files) copyFileSync(join(src, f), join(dest, f));
console.log(`copy-mediapipe: ${files.length} files → public/mediapipe/wasm`);
