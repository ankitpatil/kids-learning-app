import { useEffect, useRef, useState } from 'react';
import { makeEndingItem, sentenceWith, promptSentence, type EndingItem } from './generator';
import type { Ending } from '../../content/endings';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { maxLevel } from '../../engine/tracks';
import { getSkillState, saveSkillState, logAttempt } from '../../store/db';
import { say } from '../../audio/speech';
import { fresh } from '../../engine/recent';
import { feedback } from '../../components/Feedback';

const ROUND_LENGTH = 8;
const TRACK = 'endings';

interface Props {
  profileId: string;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

function prompt(it: EndingItem) {
  return it.readAloud ? `Pick the ending. ${promptSentence(it)}` : 'Read the sentence. Pick the ending!';
}

export function WordBuilder({ profileId, onDone, onExit }: Props) {
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

  useEffect(() => {
    getSkillState(profileId, TRACK).then((s) => {
      setState(s);
      next(s.level, undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  function next(level: number, prevWord: string | undefined) {
    const easy = ease.current;
    const it = fresh(TRACK, () => makeEndingItem(level, Math.random, easy, prevWord), (x) => x.word);
    hinted.current = ease.current;
    ease.current = false;
    setItem(it);
    setTried([]);
    setShown(null);
    setMood('idle');
    started.current = Date.now();
    busy.current = false;
    setTimeout(() => say(prompt(it)), 250);
  }

  async function record(correct: boolean) {
    const timeMs = Date.now() - started.current;
    const out = updateSkill(state!, { correct, hintUsed: hinted.current, timeMs }, maxLevel(TRACK));
    await logAttempt({ profileId, skillId: TRACK, itemId: item!.id, level: state!.level, correct, hintUsed: hinted.current, timeMs, at: Date.now() });
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
      say(`${out.change === 'up' ? 'Super! New endings unlocked! ' : 'Yes! '}${sentenceWith(item, item.word)}`);
      setTimeout(() => {
        const ni = index + 1;
        if (ni >= ROUND_LENGTH) {
          onDone({ correct: correctCount.current, total: ROUND_LENGTH, leveledUp: leveledUp.current });
          return;
        }
        setIndex(ni);
        next(out.state.level, item.word);
      }, 2200);
      return;
    }
    await record(false);
    feedback('wrong');
    hinted.current = true;
    setTried((t) => [...t, e]);
    setMood('oops');
    // Hint: let them hear their version so the mismatch with the time clue is obvious.
    say(`${sentenceWith(item, item.base + e)} Hmm, does that sound right?`);
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
        <button className="back-btn" onClick={onExit} aria-label="Back to levels">⬅️ Levels</button>
        <div className="progress" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
          {Array.from({ length: ROUND_LENGTH }, (_, i) => (
            <span key={i} className={i < index ? 'dot done' : i === index ? 'dot now' : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => say(prompt(item))} aria-label="Say again">🔊</button>
      </div>

      <div className="sentence-clue" aria-hidden="true">{item.emoji.repeat(item.emojiCount)}</div>

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
            className={`word-choice ending ${tried.includes(e) ? 'tried' : ''} ${mood === 'yay' && e === item.ending ? 'right' : ''}`}
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
