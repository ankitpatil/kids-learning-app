# Recorded phonics/word audio vs TTS — options (#31)

Written 2026-11-28 by an autonomous build run. No code, nothing bought or signed up for. **Decision needed from Ankit** (see BACKLOG "Needs Ankit").

## Where we are

- All speech is the browser's Web Speech API (`speechSynthesis`, `audio/speech.ts`). `voices.ts` ranks voices (Premium/Siri/Natural first, en-US then en-IN, on-device preferred) and Grown-ups can pick one.
- Problems that show up with it: the voice differs on every device (and is robotic on some Android tablets / older laptops); quality depends on which voices the OS has downloaded; it can't say an isolated sound (/s/, /sh/), which is why Phonics Pop says "Which letter does *sun* start with?" instead of the sound itself (`phonicsPop/letters.ts`); word boundary events (read-along highlighting) are unreliable, so `readAlong.ts` estimates word timing.
- Privacy is fine today: on-device voices are preferred, and the only thing a cloud voice ever sees is our own fixed text, never child data.

## What would need audio (inventory, from the content files today)

| Content | Count | Fixed text? |
|---|---|---|
| Picture words (CVC, digraphs, blends, silent-e, vowel teams) | ~62 | yes |
| Sight words (Dolch primer + grade 1) | 54 | yes |
| Sentences ("pop the word that finishes…") | 47 | yes |
| Stories (Story Choose) | 53 | yes |
| Letters / letter-sound picture words | 28 | yes |
| Isolated phonemes (/s/, /a/, /sh/, /ch/, /th/, /ee/, /ai/, /oa/…) | ~40 if added | yes |
| Instructions & praise (narration, off by default) | a few dozen | yes |
| Word problems ("Riya has 5 mangoes…"), clock times, money amounts, pet/sticker names | thousands of combinations | **no — generated** |

So most reading content is a closed, small list (≈ 250 items + ~40 sounds), but math prompts are generated and can't all be pre-recorded. **Any option needs Web Speech (or on-device TTS) as the fallback for generated text.**

Rough size: mono Opus/MP3 at ~32 kbps ≈ 4 KB per second of speech → a word ≈ 3 KB, a sentence ≈ 10 KB, a story ≈ 40–80 KB. All fixed reading content ≈ 3–5 MB; words + sentences + sounds alone < 1 MB.

## Options

### A. Keep Web Speech only (status quo)
- Cost 0, size 0, works offline with on-device voices, already built and tested.
- Voice quality/accent varies by device; no isolated phonemes; highlighting is estimated.

### B. Pre-generate clips at build time with an open neural TTS (Kokoro-82M)
- Run Kokoro (Apache-2.0 weights; ~20 American English voices, e.g. `af_heart`, `af_bella`) **on the developer machine/CI once** via `kokoro-js` or Python, write `public/audio/<id>.opus`, precache the small ones, lazy-cache stories.
- Same warm voice on every device, offline, no account, no cost, no data leaves anywhere (it's our text). Re-run the script when content changes (a test can check every word/sentence/story has a clip, like the icon test).
- Still TTS: isolated phonemes are as weak as browser voices (it pronounces words, not bare sounds). Word timings for read-along highlighting would come from our estimator or a forced-alignment pass. Kokoro does not do en-IN accent; en-US/en-GB only.
- Build-time model download is large (vendor reports ~300 MB for fp32; smaller quantised variants exist) — only on the build machine, never in the app.

### C. On-device neural TTS in the browser (Kokoro-js / Piper / KittenTTS)
- Same voice everywhere and handles generated text too.
- Download per device: Kokoro tens to hundreds of MB; Piper medium voice ~60 MB (low ~16 MB); KittenTTS ~10–25 MB (newer, less proven). Slow on WASM (iPad Safari has limited WebGPU), 200–300 MB RAM; delays of 1–2 s+ before speech break the "never wait > 2 s" rule on older tablets. Piper voice datasets have mixed licences (check each model card).
- Overkill for this app now; revisit only if Web Speech voices are bad on the kids' actual device.

### D. Cloud TTS at build time (Google Cloud, Azure, ElevenLabs…)
- Highest quality and en-IN voices available; text is ours, so no child-data issue.
- **Needs an account with billing enabled** (Google: "You must enable billing"; free tier 1–4 M chars/month — our whole content is < 100 K chars, so likely $0, but overage charges automatically). Spending/accounts are Ankit-only per CLAUDE.md → not doing this autonomously.

### E. Human recordings (family or open recordings)
- Best for **isolated phonemes** — the one thing no TTS does well, and the most useful new audio for a phonics learner ("tap the letter that says /sh/"). ~40 short clips, 2–3 minutes of recording by Ankit or a parent with a phone, in the accent the kids hear at home.
- Open phoneme recordings exist (IPA charts on Wikimedia Commons, UVic IPA handbook audio) but they're linguist recordings of IPA symbols, adult and clinical, with mixed licences (many CC BY-SA, some not open) — not a good fit for kids.
- Recording all words/sentences/stories by hand is a lot of work and must be redone when content changes; not recommended beyond phonemes (and maybe a few praise lines in a family voice).
- Commercial phonics audio packs (Jolly Phonics etc.) cost money and are licence-restricted → ruled out.

## Recommendation

**Hybrid: B + E, with A as the fallback.**
1. **Phonemes by a family voice (E)**: Ankit records ~40 sounds (list to be generated as a checklist with an example word each). Unlocks real "what sound…" items in Phonics Pop / Word Detective Build-it hints.
2. **Fixed reading content pre-generated with Kokoro (B)**: words, sight words, sentences, letters, then stories. Free, offline, same voice on every device. `say`/`tapSay` look up a clip by content id first, fall back to Web Speech (and still respect mute/narration/readsAlone).
3. **Generated text (math prompts) stays on Web Speech (A).**
4. Not now: in-browser neural TTS (C), cloud TTS (D).

Suggested build items once approved: (a) clip player + id lookup + fallback (tests: fallback when a clip is missing, every fixed item has a clip or is on an allow-list), (b) Kokoro generation script + words/sentences, (c) stories with word timings, (d) phoneme items once recordings exist.

## Questions for Ankit

1. OK with a Kokoro (synthetic but consistent) voice for fixed reading content, or keep the device voice? Which voice/accent (en-US default today; Kokoro has no Indian-English voice)?
2. Willing to record ~40 phoneme clips (we'd add a checklist + trimming script; drop raw files in `public/sounds/raw/phonemes/`)? And whose accent should "the sounds" be in?
3. Any device where today's voice is clearly bad? (That's the main reason to consider C.)

## Sources
- kokoro-js (Apache-2.0, voices, WASM/WebGPU): https://www.npmjs.com/package/kokoro-js
- Kokoro guide (browser download sizes, vendor-reported): https://offlinetts.com/blog/kokoro-tts-complete-guide/
- Piper in the browser: https://github.com/Mintplex-Labs/piper-tts-web, sizes/speed: https://romkakn.github.io/voice-reader/offline-neural-tts-browser-piper-webassembly.html
- KittenTTS: https://www.sitepoint.com/super-tiny-ai-kitten-tts-edge-devices/
- Google Cloud TTS pricing (billing required, free tiers): https://cloud.google.com/text-to-speech/pricing
- IPA audio: https://commons.wikimedia.org/wiki/Category:International_Phonetic_Alphabet, https://uvic.ca/humanities/linguistics/resources/ipa/audio/index.php
