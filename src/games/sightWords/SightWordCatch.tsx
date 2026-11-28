import { useEffect, useRef, useState } from 'react';
import { makeSightItem, sightWhyContext, type SightItem } from './generator';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { maxLevel } from '../../engine/tracks';
import { getSkillState, getSkillStates, saveSkillState, logAttempt, dueReviews } from '../../store/db';
import { placeSpaced, takeCard, type ReviewCard } from '../../engine/spacedReview';
import { planRound, resolveSlot, type Slot } from '../../engine/roundMix';
import { say, tapSay } from '../../audio/speech';
import { fresh, remember } from '../../engine/recent';
import { feedback } from '../../components/Feedback';
import { ai } from '../../ai/app';
import { createWhyHinter } from '../../ai/whyHint';
import { Emoji } from '../../components/Icon';
import { spacedLead as lead } from '../../engine/spacedReview';

const ROUND_LENGTH = 8;
const TRACK = 'sightWords';

interface Props {
  profileId: string;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

export function SightWordCatch({ profileId, onDone, onExit }: Props) {
  const [state, setState] = useState<SkillState | null>(null);
  const [item, setItem] = useState<SightItem | null>(null);
  const [index, setIndex] = useState(0);
  const [tried, setTried] = useState<string[]>([]);
  const [mood, setMood] = useState<'idle' | 'yay' | 'oops'>('idle');
  const hinted = useRef(false);
  const correctCount = useRef(0);
  const leveledUp = useRef(false);
  const ease = useRef(false);
  const started = useRef(Date.now());
  const busy = useRef(false);
  const misses = useRef(0); // misses on the current item (AI3: Claude hint from the 2nd)
  const hinter = useRef(createWhyHinter(ai));
  const plan = useRef(planRound(ROUND_LENGTH));
  const all = useRef<Awaited<ReturnType<typeof getSkillStates>>>({});
  const slot = useRef<Slot>({ kind: 'current', trackId: TRACK, level: 0 });
  const due = useRef<ReviewCard[]>([]); // #25: missed words back after 1/3/7 days

  useEffect(() => {
    Promise.all([getSkillState(profileId, TRACK), getSkillStates(profileId), dueReviews(profileId, [TRACK])]).then(([s, states, cards]) => {
      all.current = states;
      due.current = cards;
      plan.current = placeSpaced(plan.current, cards.length);
      setState(s);
      next(s.level, undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  function prompt(it: SightItem) {
    return `Catch the word: ${it.word}`;
  }

  function next(level: number, prevWord: string | undefined, i = 0) {
    const easy = ease.current;
    // Round mix: review = level below, stretch = level above (one track, so nothing else to mix in).
    const card = plan.current[i] === 'spaced' && !easy ? takeCard(due.current, prevWord) : undefined;
    const sl = (slot.current = card
      ? { kind: 'spaced', trackId: TRACK, level }
      : resolveSlot(plan.current[i] === 'spaced' ? 'review' : plan.current[i], TRACK, level, all.current, easy));
    const it = card ? makeSightItem(sl.level, Math.random, easy, prevWord, card.word) : fresh(TRACK, () => makeSightItem(sl.level, Math.random, easy, prevWord), (x) => x.word);
    if (card) remember(TRACK, it.word); // so the rest of the round doesn't repeat it
    hinted.current = ease.current;
    ease.current = false;
    setItem(it);
    setTried([]);
    misses.current = 0;
    setMood('idle');
    started.current = Date.now();
    busy.current = false;
    setTimeout(() => say(lead(sl.kind) + prompt(it)), 250);
  }

  async function record(correct: boolean) {
    const timeMs = Date.now() - started.current;
    const sl = slot.current;
    await logAttempt({ profileId, skillId: TRACK, itemId: item!.id, level: sl.level, correct, hintUsed: hinted.current, timeMs, at: Date.now(), mix: sl.kind });
    // Review and stretch items are logged but don't move the level.
    if (sl.kind !== 'current') return { state: state!, change: 'same' as const, ease: false };
    const out = updateSkill(state!, { correct, hintUsed: hinted.current, timeMs }, maxLevel(TRACK));
    await saveSkillState(out.state);
    setState(out.state);
    if (out.change === 'up') leveledUp.current = true;
    if (out.ease) ease.current = true;
    return out;
  }

  async function catchWord(word: string) {
    if (!item || busy.current || tried.includes(word)) return;
    busy.current = true;
    if (word === item.word) {
      const out = await record(true);
      feedback(out.change === 'up' ? 'levelup' : 'correct');
      if (!hinted.current) correctCount.current += 1;
      setMood('yay');
      // Use the word in a sentence so it carries meaning, not just a shape.
      say(`${out.change === 'up' ? 'Wow! | New tricky words unlocked!' : 'Got it!'} | ${item.word}. || ${item.example}`);
      setTimeout(() => {
        const ni = index + 1;
        if (ni >= ROUND_LENGTH) {
          onDone({ correct: correctCount.current, total: ROUND_LENGTH, leveledUp: leveledUp.current });
          return;
        }
        setIndex(ni);
        next(out.state.level, item.word, ni);
      }, 2600);
      return;
    }
    await record(false);
    feedback('wrong');
    hinted.current = true;
    setTried((t) => [...t, word]);
    setMood('oops');
    misses.current += 1;
    const canned = `Find ${item.word}: ${item.word.split('').join(', ')}.`;
    const ctx = sightWhyContext(item, slot.current.level, word);
    say(`That one says ${word}. || ${(await hinter.current.hint(item.id, misses.current, ctx, canned)).text}`);
    setTimeout(() => {
      setMood('idle');
      busy.current = false;
      started.current = Date.now();
    }, 900);
  }

  if (!item || !state) return <div className="screen center">Loading…</div>;

  return (
    <div className="screen game sight">
      <div className="topbar">
        <button className="back-btn" onClick={onExit} aria-label="Back to levels"><Emoji text="⬅️" /> Levels</button>
        <div className="progress" role="img" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
          {Array.from({ length: ROUND_LENGTH }, (_, i) => (
            <span key={i} className={i < index ? 'dot done' : i === index ? `dot now${slot.current.kind === 'stretch' ? ' bonus' : ''}` : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => tapSay(prompt(item))} aria-label="Say again"><Emoji text="🔊" /></button>
      </div>

      <button className={`catcher ${mood}`} onClick={() => tapSay(prompt(item))} aria-label="Hear the word again">
        <span aria-hidden="true"><Emoji text={mood === 'yay' ? '🫙✨' : '🫙'} /></span>
      </button>

      <div className={`bubbles n${item.choices.length}`}>
        {item.choices.map((w, i) => (
          <button
            key={w}
            className={`bubble b${i} ${tried.includes(w) ? 'tried' : ''} ${mood === 'yay' && w === item.word ? 'caught' : ''}`} aria-disabled={tried.includes(w) || undefined}
            onClick={() => catchWord(w)}
            aria-label={`Bubble ${w}`}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}
