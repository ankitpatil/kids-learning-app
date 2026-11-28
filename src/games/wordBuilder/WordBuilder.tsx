import { useEffect, useRef, useState } from 'react';
import { makeEndingItem, parseEndingId, sentenceWith, promptSentence, endingWhyContext, type EndingItem } from './generator';
import type { Ending } from '../../content/endings';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { maxLevel, readsAlone } from '../../engine/tracks';
import { getSkillState, getSkillStates, saveSkillState, logAttempt, dueReviews } from '../../store/db';
import { placeSpaced, takeCard, spacedLead, type ReviewCard } from '../../engine/spacedReview';
import { planRound, resolveSlot, type Slot } from '../../engine/roundMix';
import { say, tapSay, setReadingAlone } from '../../audio/speech';
import { fresh, remember } from '../../engine/recent';
import { feedback } from '../../components/Feedback';
import { ai } from '../../ai/app';
import { createWhyHinter } from '../../ai/whyHint';
import { Emoji, Icon } from '../../components/Icon';

const ROUND_LENGTH = 8;
const TRACK = 'endings';

interface Props {
  profileId: string;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

function prompt(it: EndingItem) {
  return it.readAloud ? `Pick the ending. || ${promptSentence(it)}` : 'Read the sentence. | Then pick the ending!';
}

export function WordBuilder({ profileId, onDone, onExit }: Props) {
  useEffect(() => () => setReadingAlone(false), []); // leaving the game: narration back to normal
  const [state, setState] = useState<SkillState | null>(null);
  const [item, setItem] = useState<EndingItem | null>(null);
  const [index, setIndex] = useState(0);
  const [tried, setTried] = useState<Ending[]>([]);
  const [shown, setShown] = useState<Ending | null>(null);
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
  const due = useRef<ReviewCard[]>([]); // #25c: missed items back after 1/3/7 days

  useEffect(() => {
    Promise.all([getSkillState(profileId, TRACK), getSkillStates(profileId), dueReviews(profileId, [TRACK])]).then(([s, states, cards]) => {
      all.current = states;
      due.current = cards.filter((c) => parseEndingId(c.itemId) !== undefined);
      plan.current = placeSpaced(plan.current, due.current.length);
      setState(s);
      next(s.level, undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  function next(level: number, prevWord: string | undefined, i = 0) {
    const easy = ease.current;
    // Round mix: review = level below, stretch = level above (one track, so nothing else to mix in).
    // #25c: a spaced word + sentence is asked at the level it was missed at (its ending is in play there).
    const card = plan.current[i] === 'spaced' && !easy ? takeCard(due.current) : undefined;
    const sl = (slot.current = card
      ? { kind: 'spaced', trackId: TRACK, level: card.level }
      : resolveSlot(plan.current[i] === 'spaced' ? 'review' : plan.current[i], TRACK, level, all.current, easy));
    const it = card
      ? makeEndingItem(sl.level, Math.random, false, undefined, card.itemId)
      : fresh(TRACK, () => makeEndingItem(sl.level, Math.random, easy, prevWord), (x) => x.word);
    if (card) remember(TRACK, it.word); // so the rest of the round doesn't repeat it
    hinted.current = ease.current;
    ease.current = false;
    setItem(it);
    setTried([]);
    misses.current = 0;
    setShown(null);
    setMood('idle');
    started.current = Date.now();
    busy.current = false;
    setReadingAlone(readsAlone(sl.trackId, sl.level)); // reading levels: no narration, the child reads it
    setTimeout(() => say(spacedLead(sl.kind) + prompt(it)), 250);
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

  async function pick(e: Ending) {
    if (!item || busy.current || tried.includes(e)) return;
    busy.current = true;
    setShown(e);
    if (e === item.ending) {
      const out = await record(true);
      feedback(out.change === 'up' ? 'levelup' : 'correct');
      if (!hinted.current) correctCount.current += 1;
      setMood('yay');
      say(`${out.change === 'up' ? 'Super! | New endings unlocked!' : 'Yes!'} || ${sentenceWith(item, item.word)}`);
      setTimeout(() => {
        const ni = index + 1;
        if (ni >= ROUND_LENGTH) {
          onDone({ correct: correctCount.current, total: ROUND_LENGTH, leveledUp: leveledUp.current });
          return;
        }
        setIndex(ni);
        next(out.state.level, item.word, ni);
      }, 2200);
      return;
    }
    await record(false);
    feedback('wrong');
    hinted.current = true;
    setTried((t) => [...t, e]);
    setMood('oops');
    // Hint: let them hear their version so the mismatch with the time clue is obvious.
    misses.current += 1;
    const ctx = endingWhyContext(item, slot.current.level, e);
    const hint = (await hinter.current.hint(item.id, misses.current, ctx, 'Hmm, | does that sound right?')).text;
    say(`${sentenceWith(item, item.base + e)} || ${hint}`);
    setTimeout(() => {
      setShown(null);
      setMood('idle');
      busy.current = false;
      started.current = Date.now();
    }, 1600);
  }

  if (!item || !state) return <div className="screen center">Loading…</div>;

  const gap = /^[.,!?]/.test(item.after) ? '' : ' ';
  return (
    <div className="screen game builder">
      <div className="topbar">
        <button className="back-btn" onClick={onExit} aria-label="Back to levels"><Emoji text="⬅️" /> Levels</button>
        <div className="progress" role="img" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
          {Array.from({ length: ROUND_LENGTH }, (_, i) => (
            <span key={i} className={i < index ? 'dot done' : i === index ? `dot now${slot.current.kind === 'stretch' ? ' bonus' : ''}` : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => tapSay(prompt(item))} aria-label="Say again"><Emoji text="🔊" /></button>
      </div>

      <div className="sentence-clue" aria-hidden="true">{Array.from({ length: item.iconCount }, (_, i) => <Icon key={i} name={item.icon} />)}</div>

      <p className={`sentence-text ${mood}`}>
        {item.before}{' '}
        <span className="base-word">{item.base}</span>
        <span className={`ending-slot ${shown ? (mood === 'oops' ? 'bad' : 'filled') : ''}`}>{shown ?? '  '}</span>
        {gap}
        {item.after}
      </p>

      <div className="word-choices">
        {item.choices.map((e) => (
          <button
            key={e}
            className={`word-choice ending ${tried.includes(e) ? 'tried' : ''} ${mood === 'yay' && e === item.ending ? 'right' : ''}`} aria-disabled={tried.includes(e) || undefined}
            onClick={() => pick(e)}
            aria-label={`Ending ${e}`}
          >
            -{e}
          </button>
        ))}
      </div>
    </div>
  );
}
