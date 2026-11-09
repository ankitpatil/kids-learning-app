# Decisions log

Judgment calls made during autonomous runs. Newest first. Ankit reviews and can overrule.

## 2026-11-08 — Levels, feedback, stickers, no repeats (Ankit request)
- In-game "⬅️ Levels" opens a level picker per subject: every playable skill with ▶️ (continue at current level) and numbered level chips (passed = ⭐, current highlighted). Picking a chip sets that level. Home links now open this screen; the 🎯 quick check is reachable from it.
- Right/wrong feedback: synthesized Web Audio sounds (no files, works offline, respects mute) — bright arpeggio for right, soft two-note "hmm" for wrong (never a buzzer); ✅ + confetti burst for right, 🏆 + bigger burst on level-up, gentle 🤔 wobble for wrong.
- Stickers: 56 original emoji stickers on 6 pages (animals, sea, space, treats incl. mango, vehicles incl. auto rickshaw, magic). One per round; a level-up or perfect round earns rare/epic. Unowned stickers are always preferred — no duplicates until the book is full. Reward screen flips the sticker in with a NEW tag; 📒 sticker book on home and reward screens (collected in colour, missing as silhouettes, tap to enlarge).
- No repeats: each track remembers its last 16 examples (localStorage) and generators retry until they find one not shown recently; tiny pools (e.g. 4 letters at level 1) pick randomly among items not shown in the last 2, so there's no back-to-back repeat or predictable cycle. Applies to all games and the quick check.

## 2026-11-08 — Word Detective replaces Word Pop (#12, Ankit feedback)
- Ankit: popping letters at higher reading levels "is not useful". For readers, the game must make the child decode (read without hearing) and encode (spell), not listen-and-pick.
- 🔍 Read it: written word shown, NOT spoken; tap the matching picture (3 far / 4 same-pattern pictures). Wrong tap names that picture and spells the word letter by letter as a hint.
- 🧩 Build it: picture + spoken word; tap grapheme tiles into slots (sh, ck, ee, ai, oa kept as one tile). Decoys: 1 far at level 0, 2 look-alikes of the taught pattern at level 1 (sh→ch/s, ee→e/ea). Wrong tiles turn red and pop back out.
- Rounds alternate read/build. Tracks cvc, digraphs, blends, silentE, vowelTeams are now playable; reading tile picks the first unmastered track, so a reader never lands on letter popping.

## 2026-11-08 — Back button on quick check (Ankit request)
- Quick check and start screen get a labelled "⬅️ Back" pill (quiz → start screen → home); quitting mid-quiz discards answers and stops speech.
- Removed `viewport-fit=cover` so top buttons aren't drawn under the Claude app's top bar or phone notch.

## 2026-11-08 — Missing number in Feed the Monster (#10)
- Implemented as the `missing` track ("I have 3, feed me until I have 8"): level 0 = feed cookies into ten-frames (pictorial), levels 1–2 = pick the number for `a + __ = c` (abstract, within 10 then 11–20). Easing (2 misses) drops back to feeding with need ≤ 3.
- Plain "add-on" (a + b = ?) is left to Number Line Hop (#11); Feed the Monster's mechanic naturally teaches the missing addend.
- Abstract mode hides the ten-frames; they reappear as a hint after a wrong answer.
- The math tile now picks the first playable track not yet mastered (`pickTrack`): count → missing. Placement marks fully-passed tracks as mastered (mastery 0.95) so a child who already adds skips counting.
- Feedback counts on from what the monster already has ("four, five…") and states the fact on success ("three and five make eight").

## 2026-11-08 — Placement test (#9)
- First tap on a subject opens a grown-up "starting point" screen: 🎯 quick check (child plays ~8–12 tap questions) or one of 3 presets. Small "🎯 Math level / Reading level" links on home reopen it.
- Binary search over 12 math / 13 reading checkpoints; each probe passes on 2 right, fails on 2 wrong, tie-breaker on a split; hard cap 12 items.
- Passing a checkpoint starts that track one level above it; tracks whose checkpoints are all passed start at max level.
- Placement gives neutral praise ("Okay!", "Got it!") for every answer — it shouldn't feel like a test.
- Placement also sets levels for tracks that have no game yet (add10, missing, digraphs…), so future games start at the right level.
- Word lists for cvc / digraphs / blends / silent e / vowel teams added in src/content/words.ts (reused by Word Pop, #12).

## 2026-11-08 — Skill tracks (#8)
- Track ids `count` and `phonics` kept identical to old skill ids so saved progress carries over; `skills.ts` is now a shim.
- Tracks without a game yet are defined with `playable: false` so placement can already set their levels.

## 2026-11-08 — Backlog reprioritised for actual learner (with Ankit)
- Child already reads basic words and does +/-; backlog reordered toward Grade 1 / Class 1–2 skills: skill-track refactor, placement test, missing-number, number line strategies, Word Pop (digraphs/blends), tens & ones.
- Games become mechanic + skill tracks with difficulty knobs (range, CPA representation, distractor closeness, scaffold). Research basis: Common Core RF.1.3 & 1.OA/1.NBT, NCERT Joyful Mathematics Class 2, concrete–pictorial–abstract.
- ₹ default for money; Indian + US names in word problems (family relocating to Pune).
- Parked: Rhyme Match, Shape Hunt, CVC Word Builder.

## 2026-11-08 — Phonics Pop (#7)
- Prompt is "Pop the letter that <picture word> starts with" plus an emoji picture, instead of speaking an isolated sound: browser TTS pronounces letter names, not phonemes. Revisit with recorded audio (#26).
- Letter order follows a common synthetic-phonics sequence: s a t p → i n → m d g o → c k e u r → h b f l j → v w y z q → look-alike drill (b/d, p/q, m/n).
- 'x' is excluded (no common picture word starts with its /ks/ sound).
- From level 4 the look-alike partner always appears as a distractor; ease mode removes it.
- A wrong tap greys out that balloon and the child retries; only first-try answers count toward round stars.

## 2026-11-08 — Initial setup (with Ankit in chat)
- Local-first, no backend for MVP (IndexedDB/Dexie). Backend (Supabase) only later for sync.
- React + TS + Vite PWA. Vitest for tests.
- Adaptive engine v1 = weighted moving average; Elo later.
- Web Speech API for voice now; pre-recorded clips are a later decision (backlog #26).
- Feed the Monster levels: max count 3, 5, 7, 10, 15, 20.
- Private repo `ankitpatil/kids-learning-app`. Scheduled runs on Pro plan, 2/day (11:41pm, 4:53am PT), target ~80% weekly usage.
