import { useEffect, useRef, useState } from 'react';
import { makePhonicsItem, PHONICS_MAX_LEVEL, type PhonicsItem } from './generator';
import { LETTERS } from './letters';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { getSkillState, saveSkillState, logAttempt } from '../../store/db';
import { say } from '../../audio/speech';
import { fresh } from '../../engine/recent';
import { feedback } from '../../components/Feedback';

const ROUND_LENGTH = 8;
const SKILL = 'phonics';
const BALLOON_COLORS = ['#ff7675', '#74b9ff', '#55efc4', '#fdcb6e', '#a29bfe'];

interface Props {
  profileId: string;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

function prompt(item: PhonicsItem) {
  return `Pop the letter that ${item.word} starts with!`;
}

export function PhonicsPop({ profileId, onDone, onExit }: Props) {
  const [state, setState] = useState<SkillState | null>(null);
  const [item, setItem] = useState<PhonicsItem | null>(null);
  const [tried, setTried] = useState<string[]>([]);
  const [popped, setPopped] = useState<string | null>(null);
  const [wiggle, setWiggle] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const correctCount = useRef(0);
  const leveledUp = useRef(false);
  const ease = useRef(false);
  const started = useRef(Date.now());
  const busy = useRef(false);

  useEffect(() => {
    getSkillState(profileId, SKILL).then((s) => {
      setState(s);
      next(s.level, undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  function next(level: number, prevTarget: string | undefined) {
    const easy = ease.current;
    const it = fresh(SKILL, () => makePhonicsItem(level, Math.random, easy, prevTarget), (x) => x.target);
    ease.current = false;
    setItem(it);
    setTried([]);
    setPopped(null);
    setWiggle(null);
    started.current = Date.now();
    busy.current = false;
    setTimeout(() => say(prompt(it)), 250);
  }

  async function choose(letter: string) {
    if (!item || !state || busy.current || tried.includes(letter)) return;
    busy.current = true;
    const correct = letter === item.target;
    const hintUsed = tried.length > 0;
    const timeMs = Date.now() - started.current;
    const out = updateSkill(state, { correct, hintUsed, timeMs }, PHONICS_MAX_LEVEL);
    await logAttempt({ profileId, skillId: SKILL, itemId: item.id, level: state.level, correct, hintUsed, timeMs, at: Date.now() });
    await saveSkillState(out.state);
    setState(out.state);
    if (out.change === 'up') leveledUp.current = true;
    if (out.ease) ease.current = true;

    feedback(correct ? (out.change === 'up' ? 'levelup' : 'correct') : 'wrong');
    if (correct) {
      setPopped(letter);
      if (!hintUsed) correctCount.current += 1;
      say(out.change === 'up' ? `Pop! ${item.word} starts with ${letter}. You learned new letters!` : `Pop! ${item.word} starts with ${letter}!`);
      setTimeout(() => {
        const nextIndex = index + 1;
        if (nextIndex >= ROUND_LENGTH) {
          onDone({ correct: correctCount.current, total: ROUND_LENGTH, leveledUp: leveledUp.current });
          return;
        }
        setIndex(nextIndex);
        next(out.state.level, item.target);
      }, 1600);
    } else {
      setWiggle(letter);
      setTried((t) => [...t, letter]);
      const info = LETTERS[letter];
      say(`That's ${letter}, like ${info?.word ?? letter}. ${prompt(item)}`);
      setTimeout(() => {
        setWiggle(null);
        busy.current = false;
        started.current = Date.now();
      }, 900);
    }
  }

  if (!item || !state) return <div className="screen center">Loading…</div>;

  return (
    <div className="screen game phonics">
      <div className="topbar">
        <button className="back-btn" onClick={onExit} aria-label="Back to levels">⬅️ Levels</button>
        <div className="progress" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
          {Array.from({ length: ROUND_LENGTH }, (_, i) => (
            <span key={i} className={i < index ? 'dot done' : i === index ? 'dot now' : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => say(prompt(item))} aria-label="Say again">🔊</button>
      </div>

      <button className="picture-card" onClick={() => say(item.word)} aria-label={`Picture: ${item.word}`}>
        <span className="picture">{item.emoji}</span>
      </button>

      <div className="balloons">
        {item.choices.map((l, i) => {
          const cls = ['balloon', popped === l ? 'popped' : '', wiggle === l ? 'wiggle' : '', tried.includes(l) ? 'tried' : '']
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={`${item.id}-${l}`}
              className={cls}
              style={{ ['--c' as string]: BALLOON_COLORS[i % BALLOON_COLORS.length], animationDelay: `${i * 0.3}s` }}
              onClick={() => choose(l)}
              aria-label={`Letter ${l}`}
            >
              <span className="balloon-letter">{popped === l ? '💥' : l}</span>
              <span className="string" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
