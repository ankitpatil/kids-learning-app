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
- [ ] 14b. Round mix in the single-track games: Phonics Pop, Sight-Word Catch, Word Builder (review = level below, stretch = level above; reuse `engine/roundMix`)
- [ ] 15. **Tens & ones**: Feed the Monster with boxes of 10 + loose cookies (numbers to 100), then compare two-digit numbers (bigger/smaller). Tests
- [x] 16. Word Detective: silent-e (cap → cape, kit → kite) and vowel teams (ee, ai, oa); then "pop the word that finishes the sentence". Tests
- [x] 17. Game: **Sight-Word Catch** with tricky/irregular words (said, was, the, of, they…; Dolch primer + first grade lists)
- [x] 18. Game: **Word Builder** for endings: drag -s / -ed / -ing onto a base word to match a picture/sentence (jump → jumped / jumping)
- [ ] 19. **Story Choose**: short decodable stories (only unlocked patterns), read-along highlighting, 1–2 comprehension questions
- [ ] 20. **Word problems**: spoken 1-step stories ("Riya has 5 mangoes, gets 3 more…") → pick or build the equation; Indian + US names/objects
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
- Making the app public / deploying to a public domain
- Anything that costs money (domains, paid APIs, voice actors)
- Adding analytics or any third-party service that receives child data
