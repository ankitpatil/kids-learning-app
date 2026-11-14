# Backlog

Scheduled runs: take the **first unchecked item**, finish it (with tests), tick it, log in DECISIONS.md and RUNLOG.md.
Keep each item shippable on its own. If an item is too big, split it into sub-items here and do the first.

## Done
- [x] 1. Project scaffold: Vite + React + TS PWA, Vitest, folder structure
- [x] 2. Local progress store (Dexie): profiles, attempts, skill states; `storage.persist()`
- [x] 3. Adaptive engine v1 (weighted moving average, level up/down, 2-miss easing) + unit tests
- [x] 4. Speech helper (Web Speech API wrapper, mute toggle)
- [x] 5. Game: **Feed the Monster** (counting 1–20, levels by max number) wired to engine
- [x] 6. Home screen with subject picker, star counter, round-end reward screen
- [x] 7. Game: **Phonics Pop** (hear a letter sound, pop the matching letter balloon). Levels: 5 letters → all 26; separate b/d, p/q confusables at higher level

## Next
Reprioritised 2026-11-08 for the actual learner: knows basic words and +/- (≈ US Grade 1 / CBSE Class 1–2). See SPEC.md "Skill tracks". One item per run.

- [x] 8. **Skill tracks + difficulty knobs refactor**: replace flat `levels` with per-level config `{range, representation: 'concrete'|'pictorial'|'abstract', distractors: 'far'|'near', scaffold: boolean}`; define the math and reading track lists from SPEC (ids only + configs for existing games). Keep existing Feed the Monster / Phonics Pop behaviour and saved progress working; tests for config lookup
- [x] 9. **Placement test** per subject: ~10 items, binary search across the track sequence (skip-ahead), sets starting level for each track; also a parent "starting point" picker (Beginner / Knows letters & counting / Reads words & adds). Tests for the search logic
- [x] 10. **Feed the Monster: add-on & missing-number modes**: "I have 3, feed me up to 8" (3 + __ = 8), within 10 then 20; ten-frame pictorial mode, then abstract equation mode (CPA). Tests
- [x] 11. Game: **Number Line Hop**: + / − within 20; levels: visible line & counting hops → make-10 strategy (8 + 5 = 8 + 2 + 3) → equation only. Tests
- [x] 12. Game: **Word Detective** (replaces Word Pop): alternates 🔍 Read it (written word, no audio → tap picture) and 🧩 Build it (picture + spoken word → grapheme tiles with decoys); tracks CVC → digraphs (sh, ch, th, ck) → blends (st, fl, tr…); near distractors are minimal pairs (ship/chip/shop). Word lists as data. Tests
- [x] 13. Profile picker / create profile (nickname + avatar emoji), multi-child on one device; each profile has its own track levels
- [x] 14a. Round mix engine (70/20/10 current/review/stretch, review/stretch drawn from tracks the same game plays) + tests; wired into Feed the Monster, Number Line Hop, Word Detective
- [x] 14b. Round mix in the single-track games: Phonics Pop, Sight-Word Catch, Word Builder (review = level below, stretch = level above; reuse `engine/roundMix`)
- [x] 15a. **Tens & ones**: Feed the Monster with boxes of 10 + loose cookies (numbers to 100); level 3 = "3 tens and 4 ones" → pick the number. Tests
- [x] 15b. **Compare 2-digit numbers** (bigger/smaller, close numbers and swapped digits like 34/43), using the tens & ones picture as a hint. Tests
- [x] 16. Word Detective: silent-e (cap → cape, kit → kite) and vowel teams (ee, ai, oa); then "pop the word that finishes the sentence". Tests
- [x] 17. Game: **Sight-Word Catch** with tricky/irregular words (said, was, the, of, they…; Dolch primer + first grade lists)
- [x] 18. Game: **Word Builder** for endings: drag -s / -ed / -ing onto a base word to match a picture/sentence (jump → jumped / jumping)
- [x] 19. **Story Choose**: short decodable stories (only unlocked patterns), read-along highlighting, 1–2 comprehension questions
- [x] 20. **Word problems**: spoken 1-step stories ("Riya has 5 mangoes, gets 3 more…") → pick or build the equation; Indian + US names/objects
### Priority: Claude-powered content and features (added 2026-11-12 by Ankit — do these first; see SPEC.md "AI features")
- [x] C1. **More decodable stories (build-time content)**: write ~40 more stories into `content/stories.ts` (target ~55 total), spread across all patterns (CVC, digraphs, blends, magic e, ee/ai/oa) and themes kids like (cricket, monsoon, Diwali, animals, space, school, food). Mix Indian + US names. Every story must pass the existing decodability test; add tests for theme/pattern coverage (≥ 6 stories per pattern) and no duplicate titles. Content only, no runtime AI
- [x] AI1. **AI plumbing + parent settings** (no API key needed to build): parent gate (hold 3 s, then a simple multiplication) → Settings screen with **"Claude helpers" toggle (off by default)**, proxy URL and family passcode stored locally. `src/ai/client.ts` with a provider interface: `mock` (canned responses, used in tests and whenever AI is off/offline) and `proxy` (POST to the family proxy). Privacy filter: requests carry only level/pattern/topic/item data — never nickname, profile id or recordings (test this). `proxy/` folder: Cloudflare Worker source (stateless: checks the family passcode, rate-limits, fixed model + system prompt on the server side, never logs request bodies) + README for Ankit to deploy. **Do not deploy it and never put an API key in the repo or the client**
- [x] AI2. **Personalized stories (live)**: in Story Choose, a "✨ New story" button (only when Claude helpers are on and online). Child picks a topic by icon (cricket, animals, space, food, family, festival). Request: unlocked patterns + level + topic + length limits. Every response must pass the decodability checker, length/word limits and a kid-safe word blocklist, with 2 comprehension questions whose answers appear in the text; retry once, then fall back to a built-in story silently. Cache good stories on the device (Dexie) so they replay offline; parent can clear them. Tests with the mock provider (valid, invalid → fallback, offline → fallback)
- [x] C2. **More word problems + sentences (build-time content)**: grow `content/wordProblems.ts` story templates ×3 (more objects, names, settings incl. Indian everyday life) and the finish-the-sentence bank ×3. Tests: every generated equation is a true fact; sentence answers are decodable at their level
- [ ] C3. **Silly stories** (added 2026-11-14 by Ankit — do this first; see SPEC.md "Stories"): give every built-in story in `content/stories.ts` a funny/silly situation and a punchline last line (rewrite the weak ones, keep the strong ones), and add ~10 new silly stories across all patterns. Keep every story decodable, keep 2 questions per story with answers in the line they point at, and keep lines text only (no pictures). Tests: existing decodability/coverage tests pass; every story's last line ends with "!" or "?" (a cheap proxy for a punchline); no duplicate titles
- [ ] AI3. **"Why?" helper (live)**: after 2 misses on an item, if Claude helpers are on, fetch a fresh, level-appropriate explanation (spoken, ≤ 2 short sentences) in place of the canned hint; must not state the answer (math: answer number not in the text; reading: target word not spelled out) — checked in code, else use the built-in hint. Short timeout (2 s) so the child never waits. Tests with the mock provider
- [ ] AI4. **Read-aloud coach: options write-up** (no code): compare speech-recognition choices for checking a child reading a sentence aloud — browser Web Speech recognition (note: Chrome sends audio to Google's servers), on-device WASM models (e.g. Whisper tiny: download size, speed on a tablet), and Claude-side checking of the transcript. Recommend one, then move the decision to "Needs Ankit"

### Then
- [ ] I1. **Bundled icons + fonts** (added 2026-11-12 by Ankit): stop relying on system emoji, which look different on iOS, Android and Windows. Add `<Icon name="cat" />` backed by **Fluent Emoji** SVGs (MIT, flat or 3D style; pick one and log it in DECISIONS.md), bundling only the icons the app uses (~250, target ≤ 2 MB) and precaching them for offline use. Content files (`words`, `stories`, `endings`, `wordProblems`, `stickers`, tracks) refer to icon *names*, not raw emoji; keep an emoji fallback for any name without an SVG. Self-host the Nunito and Andika fonts (OFL) instead of the current unloaded fallbacks. Test: every icon name used in content resolves to a bundled file
- [ ] I2. **Fill icon gaps + picture variety**: use **OpenMoji** extras (CC BY-SA; add credit in an About/credits note and README) for words and objects Fluent lacks, and restore any words dropped for lack of a picture. Give common words 2–3 picture variants (different source or style) chosen at random per item so kids read the word rather than spot the picture. List anything still missing (e.g. Indian everyday objects) under "Needs Ankit" for custom illustrations. Tests: variant pick is random but stable within an item; no word in content lacks an icon
- [ ] S1. **Recorded celebration sounds** (added 2026-11-12 by Ankit): replace the synthesized round-end fanfare and cheer/applause with real CC0 recordings. **Needs the raw files first** (see "Needs Ankit": download recorded sounds); if `public/sounds/raw/` is empty, skip this item, note it in RUNLOG.md and take the next. Trim each clip to ~2–3 s with fade-out, loudness-match, and encode to small web files (≤ 100 KB each, e.g. `fanfare.mp3`, `cheer.mp3`) in `public/sounds/`; precache them in the PWA. Add `playClip(name)` to `audio/sfx.ts` (decoded once, respects mute) and use it in `playCelebration()`, falling back to the current synthesized sounds if a file fails to load. Add `CREDITS.md` (source URL, author, license per file) and link it from the README. Test: the fallback runs when a clip can't load; every file in `public/sounds/` has a CREDITS entry
- [ ] 21. **Fun at the Fair (money)**: coins/notes in ₹ (default) with $ as a setting; pay exact amount, make change within 20
- [ ] 22. **Clock**: time to the hour and half hour, then 5 minutes
- [ ] 23. Parent gate + parent dashboard (time, mastery per track, weak spots, current level per track)
- [ ] 24. World map screen: island per track, locked/unlocked via prereqs, mastery bloom
- [ ] 25. Spaced review scheduler (1/3/7 days) for missed words/facts
- [ ] 26. Export/import progress (JSON file) as backup
- [ ] 27. Avatar pet: spend stars on food/outfits; streak (pauses, never resets)
- [ ] 28. Early grouping (×) and sharing (÷) with equal groups — CBSE Class 2 "Grouping and Sharing"
- [ ] 29. Screen-time cap setting enforced with a friendly "bedtime" screen
- [ ] 30. Accessibility pass: reduced motion, contrast, focus states; Lighthouse PWA ≥ 90
- [ ] 31. Audio: write up options for recorded phonics/word audio vs TTS (do not buy anything) → move decision to "Needs Ankit"

### Parked (lower value for this learner)
- Rhyme Match, Shape Hunt, letter-level Word Builder (CVC spelling)

## Needs Ankit (do not do autonomously)
- **Claude API key** (for AI2/AI3): create a key in the Anthropic Console with a monthly spend limit — this costs money, so Ankit only
- **Deploy the family proxy** from `proxy/` (Cloudflare Worker free tier) with the API key as a secret and a family passcode; enter the URL + passcode in the app's parent Settings
- **Parked (option 2):** "Explain this week" button in the parent dashboard — sends anonymous stats to Claude for a plain-English summary. Revisit after #23
- **Download recorded sounds for S1** into `public/sounds/raw/` (CC0 only; Freesound needs Ankit's login). Shortlist: Kenney *Music Jingles* (kenney.nl/assets/music-jingles, CC0) → one bright victory jingle; Freesound CC0: "cheering and clapping crowd 2" (AlaskaRobotics, 8 s, school gym), "Crowd Cheering" (SoundsExciting, 13 s), "Voice_Crowd_Small_Expression_Applause_Cheer" (Nox_Sound, 3 s), "yay.mp3" (Disarmenemys, kid's yay). Avoid clips whose page asks for credit despite CC0 (e.g. BerlinGameScene)
- Making the app public / deploying to a public domain
- Anything that costs money (domains, paid APIs, voice actors)
- Adding analytics or any third-party service that receives child data
