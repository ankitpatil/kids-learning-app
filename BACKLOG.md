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

## Next
- [ ] 7. Game: **Phonics Pop** (hear a letter sound, pop the matching letter balloon). Levels: 5 letters → all 26; separate b/d, p/q confusables at higher level
- [ ] 8. Profile picker / create profile (nickname + avatar emoji), multi-child on one device
- [ ] 9. Round mix: 70/20/10 current/review/stretch selection in engine + tests
- [ ] 10. World map screen: island per skill, locked/unlocked via prereqs, mastery bloom
- [ ] 11. Game: **Number Line Hop** (addition/subtraction within 10, then 20)
- [ ] 12. Game: **Word Builder** (drag letter tiles to spell CVC word for a picture/emoji)
- [ ] 13. Placement test (binary search across levels, 8–10 items) on first run of each subject
- [ ] 14. Parent gate + parent dashboard (time today/week, mastery per skill, weak spots)
- [ ] 15. Export/import progress (JSON file) as backup
- [ ] 16. Game: **Rhyme Match** (memory-style pairs, spoken words)
- [ ] 17. Game: **Sight-Word Catch** (falling words, tap the spoken one; Dolch pre-primer list)
- [ ] 18. Spaced review scheduler (1/3/7 days) for missed words/sounds
- [ ] 19. Avatar pet: spend stars on food/outfits; streak (pauses, never resets)
- [ ] 20. Game: **Bigger/Smaller Duel** (compare quantities, then numerals)
- [ ] 21. Decodable stories v1: 5 short stories using only unlocked sounds, read-along highlighting
- [ ] 22. Story Choose: 3-panel comprehension questions
- [ ] 23. Game: **Shape Hunt**
- [ ] 24. Screen-time cap setting enforced with a friendly "bedtime" screen
- [ ] 25. Accessibility pass: reduced motion, contrast, focus states; Lighthouse PWA ≥ 90
- [ ] 26. Pre-recorded audio clip support (fallback to TTS) — decide voice approach (needs user input; write up options, don't buy anything)

## Needs Ankit (do not do autonomously)
- Making the app public / deploying to a public domain
- Anything that costs money (domains, paid APIs, voice actors)
- Adding analytics or any third-party service that receives child data
