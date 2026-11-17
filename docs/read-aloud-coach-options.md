# Read-aloud coach — speech recognition options (AI4)

Written 2026-11-16 by an autonomous build run. No code. **Decision needed from Ankit** (see BACKLOG "Needs Ankit").

## What the feature needs

A child (5–7) reads one short decodable sentence aloud ("Sam got a big red hat."). The app should notice which words came out right and gently help with the one that didn't. Requirements from SPEC.md:

- **No third-party data sharing.** A child's voice is the most identifying thing we could send anywhere. AI requests must never carry recordings (already enforced by `sanitizeRequest`).
- Works on the devices the kids use (tablet and/or laptop/TV in Move mode), ideally offline after first use.
- Gentle failure: a recognizer mistake must never punish the child.
- Child never waits more than ~2 s on anything.

Important fact for all options: we **already know the sentence** the child is reading. So the job is not open transcription, it's "did they say these 5 words, in order?" That makes a simple word-alignment check in code (edit distance on words, with homophone and plural tolerance) the right checker regardless of which recognizer produces the transcript.

## Option A — Browser Web Speech recognition (`SpeechRecognition`)

- **Default mode (cloud):** in Chrome, recognition is done on Google's servers — the child's audio leaves the device and goes to a third party. Safari's `webkitSpeechRecognition` uses Apple's Siri service (may be server-side). Firefox has no recognition at all. **Ruled out by SPEC privacy rules** in this mode.
- **On-device mode:** Chrome added on-device recognition (`processLocally = true` / on-device-only mode, plus `available()` / `install()` for language packs, ~60 MB per language). At launch it is **desktop only** (Windows, Mac, Linux; ChromeOS later; **not Android, not iPad**).
- Pros: zero bundle size for us, fast, streaming partial results, no model hosting.
- Cons: only some browsers/devices; behaviour and accuracy vary by browser version; we can't tune it; tuned for adult speech; tends to "correct" misreadings into real words. Can't be tested in Vitest beyond a mock.

## Option B — On-device model in the page (WASM / WebGPU)

- **Whisper tiny.en** (39 M params) via transformers.js (ONNX Runtime Web). Download ≈ 40 MB with 8-bit weights, ≈ 120–150 MB full precision; cached after first use (like the Move-mode models). Speed: WebGPU is roughly 5–10× faster than WASM; on WASM expect ~1–3 s for a 3–5 s sentence on a recent tablet/laptop (estimate — must be measured on the family's devices). Safari has limited WebGPU, so iPad would run the WASM path.
- **Moonshine tiny** (≈ 27 M params, built for short live clips, compute scales with clip length rather than a fixed 30 s window) — smaller and faster than Whisper tiny for single sentences; less mature browser tooling.
- Accuracy on children: off-the-shelf models are trained mostly on adults and do noticeably worse on 5–7-year-olds. A 2025 study fine-tuned Whisper tiny.en on children's speech (MyST) and reached ~12–16 % WER — i.e. even tuned, roughly 1 word in 8 is wrong. Zero-shot is worse. So any check must be lenient.
- Whisper "prompting" with the expected sentence improves recognition but biases it toward hearing the right answer — bad for a checker. Use it lightly or not at all.
- Pros: **audio never leaves the device**, works offline after first download, same behaviour on every browser, testable pipeline (we can feed recorded clips in tests later).
- Cons: 40 MB+ first download, battery/CPU cost on older tablets, extra lazy-loaded dependency, still imperfect on kids' speech.

## Option C — Claude-side checking of the transcript

- Claude never gets audio (SPEC forbids sending recordings). It would only receive the transcript from A or B plus the expected sentence and judge it / write a friendly coaching line.
- Adds nothing to recognition accuracy — garbage transcript in, garbage judgment out — and needs the network + proxy, so it fails offline and adds latency.
- The judging part is better done deterministically in code (word alignment): instant, offline, testable, free.
- Possible small role later: a "Why?"-style tip for the word the child stumbled on ("ch says /ch/ like chin"), going through the existing checked `whyHint` path. Optional, same rules as AI3.

## Recommendation

**Option B: on-device Whisper tiny.en (8-bit, ≈ 40 MB) via transformers.js, lazy-loaded behind a Grown-ups "🎤 Read-aloud coach" setting (off by default), with a deterministic word-alignment checker in code.** Evaluate Moonshine tiny as a smaller drop-in during the build if its browser package is stable.

Why: it's the only option that keeps the child's voice on the device on every browser (including iPad), works offline, and lets us test the checker. Option A's on-device mode is a nice fast path on desktop Chrome and could be added later as "use the browser's on-device recognizer if `available()`", never the cloud mode. Option C isn't a recognizer; keep Claude for optional hints only.

Design rules if approved:
1. Never block progress on the mic. Reading aloud is a bonus step; "Skip" is always there.
2. Lenient matching: count a word right if it's close (edit distance ≤ 1 for words ≥ 4 letters, plurals, homophones). Only coach a word when the recognizer is confident it heard something different; otherwise praise.
3. Positive framing: "I heard you read 4 of 5 words! Let's try *ship* together." Never "wrong".
4. Mic only while the 🎤 button is held/active; audio kept in memory only, discarded after checking, never stored or sent.
5. Measure on the family's actual tablet/laptop before shipping (load time, seconds per sentence, rough accuracy on the kids' voices).

## Questions for Ankit

1. Approve Option B (≈ 40 MB one-time download per device, on-device only)? Or prefer desktop-only Chrome on-device (Option A) to avoid the download?
2. Which device do the kids read on most (iPad / Android tablet / laptop)? This decides WASM vs WebGPU and whether A is even possible.
3. OK to ask for microphone permission at all (parent turns it on in Grown-ups)?

## Sources
- MDN, `SpeechRecognition.processLocally`: https://developer.mozilla.org/docs/Web/API/SpeechRecognition/processLocally
- MDN, Using the Web Speech API: https://developer.mozilla.org/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
- Chromium "Intent to Ship: On-device Web Speech API": https://groups.google.com/a/chromium.org/g/blink-dev/c/VNOok2dbmHM
- Browser speech recognition comparison (Whisper/Moonshine sizes, WebGPU vs WASM): https://offlinetts.com/blog/browser-speech-recognition-whisper-comparison/
- Whisper tiny.en ONNX weights: https://huggingface.co/onnx-community/whisper-tiny.en/tree/main
- Moonshine: https://github.com/usefulsensors/moonshine
- Adapting Whisper for children's ASR on edge devices (arXiv 2507.14451): https://arxiv.org/abs/2507.14451
