# Decisions log

Judgment calls made during autonomous runs. Newest first. Ankit reviews and can overrule.

## 2026-11-10 — Round mix 70/20/10 (#14a)
- Split #14: this run did the engine plus the three games that play several tracks (Feed the Monster, Number Line Hop, Word Detective). The single-track games are #14b.
- A round is still one game, so "across the tracks of a subject" means across the tracks that game can play (e.g. Word Detective: cvc → … → sentences). Mixing different games into one round would need a new mixed-round screen; not done.
- 8-item round = 5 current, 2 review, 1 stretch (rounding 20% and 10%). Over 20 items it's exactly 14/4/2.
- Order: item 1 is a review warm-up (an easy first win), the last item is always current, and the stretch item is never 1st, 2nd or last.
- Review = the level just below the current one, or an earlier track in the same game that the child has played (its top level if mastered, otherwise one level below where they are). Tracks never played (jumped past on the level map) are not "review".
- Stretch = the next level, or the next track in the same game once at the top level. Never right after two misses (the next item must be easier then). Nothing to review/stretch to → the slot is a normal current item.
- Review and stretch answers are logged as attempts (with `mix: 'review' | 'stretch'` and their own track/level) but do NOT change any track's level or mastery: a hard stretch item can't knock a child down a level, and an easy review can't push them up. The logs are there for the parent dashboard (#23) and spaced review (#25).
- Stretch items are announced as "Bonus challenge!" and their progress dot glows gold, so a miss feels like a bonus attempt, not a failure. Stars still count all 8 items.
- Mixing also applies when a level is picked from the level map.

: -s / -ed / -ing (#18, interactive session)
- Mechanic: a sentence with a time clue and a base word ("Last night, we walk__."); the child taps the ending tile that fits. A picture sits above (two pictures for plurals: "I see two cats").
- Pictures alone can't show tense, so the sentence's time clue (Every day / Yesterday / Right now) carries the meaning instead.
- Levels: 1 = -s and -ing, read aloud with a blank; 2 = -s, -ed, -ing, read aloud; 3 = read it yourself. Easing = read aloud + 2 endings.
- Only base words that need no spelling change (jump, play, walk, cook, paint, climb, rest, laugh, kick, help; cat, dog, duck, frog, hat, ship, kite, cup). Doubling (hop → hopping) and dropping e (bake → baking) are left for a later item.
- -s is a plural noun half the time and a verb ("Sam jumps") otherwise, so children meet both uses.
- Wrong pick: the slot shows their ending in orange and the app reads their version ("Right now, we are rested. Hmm, does that sound right?").
- Reading track order is now: … ee/ai/oa → endings → tricky words → sentences.

## 2026-11-09 — Sight-Word Catch (#17, interactive session)
- Mechanic: the app says a tricky word; the child taps (catches) the matching word bubble; a jar on top replays the word. After a catch, the word is used in a short spoken sentence ("was. The cake was yummy.") so it carries meaning, not just a shape.
- 54 words in 3 levels, based on Dolch pre-primer / primer / first grade, keeping the words that are hard to sound out: level 1 (the, you, where…), level 2 (was, they, said…), level 3 (of, could, once…). Later levels mix in earlier words about 1 time in 4 as review.
- Level 1 = 3 bubbles with clearly different words (look-alikes kept out). Levels 2–3 = 4 bubbles led by look-alikes young readers mix up (was/saw, of/off, they/then, there/three/their). Easing = 2 bubbles.
- Wrong catch: that bubble fades, and the app names what it says and spells the target ("That one says saw. Find was: w, a, s").
- Track order: tricky words come after ee/ai/oa and before sentences, since the sentences lean on heart words. Not in the placement quick check yet.
- Bubbles bob gently, with no timer; reduced-motion turns the bobbing off.

## 2026-11-09 — Magic-e switch and finish-the-sentence (#16, interactive session)
- Silent-e and ee/ai/oa word reading already shipped with Word Detective (#12), so #16 adds the two missing pieces.
- Magic e: new silentE level 3 "cap / cape switch". Read items show either the short word (kit) or the magic-e word (kite); the pictures always include both, so the child has to notice the e. After a right answer the screen shows "kit + e = kite" and says it. Build items at this level still use the silent-e word list. 6 pairs with clear pictures (kit/kite, cub/cube, cap/cape, can/cane, pin/pine, tub/tube); mane, robe, note etc. left out because their pictures are ambiguous.
- A child who had already finished the old top silent-e level now lands on the new level (pickTrack treats it as not mastered). Placement checkpoints are unchanged, so passing both silent-e checkpoints still skips the whole track.
- Finish the sentence: the `sentences` track is now playable inside Word Detective (always sentence items). Level 1 = picture clue + 2 choices; level 2 = no picture + 3 look-alike choices (minimal pairs that don't fit: pond / pod / pot). Easing = picture + 2 choices.
- The sentence is NOT read aloud (reading it is the skill). A wrong pick reads the sentence back with their word ("The duck swims in the pot. Hmm, does that make sense?") so the child hears why it doesn't fit.
- 13 sentences built from taught patterns plus common heart words; look-alikes chosen so they don't make sense in the sentence.
- Not added to the placement quick check; readers reach sentences after ee/ai/oa.

## 2026-11-09 — Profiles: multi-child on one device (#13)
- Profile = nickname + avatar emoji only (16 animals). No age, photo or real-name requirement. Nickname is optional: blank → the animal's name ("Panda"); cleaned to letters/numbers/space/-/' (any script), max 12 chars; duplicate names get " 2", " 3".
- A new sibling's animal defaults to one no other profile has. Cap of 6 profiles per device.
- Startup: exactly one profile → straight to home (existing installs keep their "default" 🦊 profile, stars, stickers and levels untouched); several → "Who's playing?" picker (most recently played first); none → "Pick your animal" create screen.
- Home top-left avatar now shows the nickname and opens the picker to switch players or add one (➕ New).
- Each profile already had its own skill states, stars, stickers and placement flags (all keyed by profileId); a new child starts unplaced, so the starting-point / quick check runs on their first game.
- No delete/rename yet — deleting a child's progress should sit behind the parent gate (#23).
- The no-repeat memory (recent examples, localStorage) and the mute setting stay per device, not per child — harmless for siblings and keeps this item small.

## 2026-11-09 — Number Line Hop (#11)
- One game plays four tracks (add10, sub10, add20, sub20), now all playable. Existing level configs kept so placement/saved levels stay valid; sub20 level 0 relabelled "back to 10, number line".
- Pictorial within-10 levels = 'hop' mode: frog starts on `a`, child taps the big 🐸 button once per hop (each hop counted aloud, 🐾 shown), ↩️ undoes, ✅ submits. Checked by number of hops; wrong → "hop N more / hop back N".
- Within-20 pictorial = 'make10' mode, two steps: "how many hops to ten?" (pick 1–9), frog jumps to 10 and the split is shown (8 + 5 = 8 + 2 + 3; 13 − 5 = 13 − 3 − 2), then "where does the frog land?". Make-10 items always cross ten. Only the final answer counts as one engine attempt; a wrong pick on either step logs a miss and marks the item as hinted.
- Abstract levels = 'choose': equation only, 4 choices; after a wrong pick the number line appears with the frog on the start number.
- Easing (2 misses) always drops to counting hops with b ≤ 3.
- pickTrack now runs count → add10 → sub10 → missing → add20 → sub20. A child placed past add/sub within 10 (placement marks them mastered) is unaffected.
- Home math tile aria-label changed to "Math games" (no longer only Feed the Monster).

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
