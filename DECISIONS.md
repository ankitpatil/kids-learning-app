# Decisions log

Judgment calls made during autonomous runs. Newest first. Ankit reviews and can overrule.

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
