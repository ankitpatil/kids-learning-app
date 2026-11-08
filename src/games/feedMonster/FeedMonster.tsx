import { useEffect, useRef, useState } from 'react';
import { makeCountItem, checkCount, type CountItem } from './generator';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { COUNT_MAX_BY_LEVEL } from '../../engine/skills';
import { getSkillState, saveSkillState, logAttempt } from '../../store/db';
import { say } from '../../audio/speech';

const ROUND_LENGTH = 8;
const NUMBER_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty one','twenty two'];

interface Props {
  profileId: string;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

export function FeedMonster({ profileId, onDone, onExit }: Props) {
  const [state, setState] = useState<SkillState | null>(null);
  const [item, setItem] = useState<CountItem | null>(null);
  const [fed, setFed] = useState(0);
  const [ease, setEase] = useState(false);
  const [mood, setMood] = useState<'idle' | 'yum' | 'oops'>('idle');
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const started = useRef(Date.now());
  const busy = useRef(false);

  useEffect(() => {
    getSkillState(profileId, 'count').then((s) => {
      setState(s);
      next(s.level, false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  function next(level: number, easy: boolean, prevTarget?: number) {
    const it = makeCountItem(level, Math.random, easy, prevTarget);
    setItem(it);
    setFed(0);
    setMood('idle');
    setHintUsed(easy);
    started.current = Date.now();
    busy.current = false;
    setTimeout(() => say(`Feed the monster ${NUMBER_WORDS[it.target]} cookie${it.target === 1 ? '' : 's'}!`), 250);
  }

  function feed() {
    if (!item || busy.current || fed >= item.supply) return;
    const n = fed + 1;
    setFed(n);
    say(NUMBER_WORDS[n], { rate: 1.1 });
  }

  function takeBack() {
    if (busy.current || fed === 0) return;
    setFed(fed - 1);
  }

  async function submit() {
    if (!item || !state || busy.current) return;
    busy.current = true;
    const verdict = checkCount(item, fed);
    const correct = verdict === 'correct';
    const timeMs = Date.now() - started.current;
    const maxLevel = COUNT_MAX_BY_LEVEL.length - 1;
    const out = updateSkill(state, { correct, hintUsed, timeMs }, maxLevel);
    await logAttempt({ profileId, skillId: 'count', itemId: item.id, level: state.level, correct, hintUsed, timeMs, at: Date.now() });
    await saveSkillState(out.state);
    setState(out.state);
    if (out.change === 'up') setLeveledUp(true);

    if (correct) {
      setMood('yum');
      setCorrectCount((c) => c + 1);
      say(out.change === 'up' ? 'Yum yum! Wow, you are getting so good!' : 'Yum yum! Thank you!');
      setTimeout(() => advance(out.state.level, false, item.target, correctCount + 1, out.change === 'up' || leveledUp), 1400);
    } else {
      setMood('oops');
      const diff = Math.abs(item.target - fed);
      say(
        verdict === 'too-few'
          ? `That's ${NUMBER_WORDS[fed]}. I want ${NUMBER_WORDS[item.target]}. Can you give me ${NUMBER_WORDS[diff]} more?`
          : `Oh, that's too many! I want ${NUMBER_WORDS[item.target]}. Take ${NUMBER_WORDS[diff]} back.`,
      );
      setHintUsed(true);
      if (out.ease) setEase(true);
      // Let the child fix it on the same item (gentle failure). Counts as a new hinted attempt.
      setTimeout(() => {
        setMood('idle');
        busy.current = false;
        started.current = Date.now();
      }, 900);
    }
  }

  function advance(level: number, easy: boolean, prevTarget: number, correctSoFar: number, up: boolean) {
    const nextIndex = index + 1;
    if (nextIndex >= ROUND_LENGTH) {
      onDone({ correct: correctSoFar, total: ROUND_LENGTH, leveledUp: up });
      return;
    }
    setIndex(nextIndex);
    const e = ease || easy;
    setEase(false);
    next(level, e, prevTarget);
  }

  if (!item || !state) return <div className="screen center">Loading…</div>;

  const remaining = item.supply - fed;
  const showGuide = hintUsed || ease;

  return (
    <div className="screen game">
      <div className="topbar">
        <button className="icon-btn" onClick={onExit} aria-label="Home">🏠</button>
        <div className="progress" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
          {Array.from({ length: ROUND_LENGTH }, (_, i) => (
            <span key={i} className={i < index ? 'dot done' : i === index ? 'dot now' : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => say(`Feed the monster ${NUMBER_WORDS[item.target]} cookies!`)} aria-label="Say again">🔊</button>
      </div>

      <div className="target-number" aria-hidden>{item.target}</div>

      <div className={`monster ${mood}`} onClick={takeBack} role="button" aria-label="Monster. Tap to take a cookie back">
        <div className="monster-face">{mood === 'yum' ? '😋' : mood === 'oops' ? '😮' : '👾'}</div>
        <div className="belly">
          {Array.from({ length: fed }, (_, i) => (
            <span key={i} className="cookie small">🍪</span>
          ))}
          {showGuide && Array.from({ length: Math.max(0, item.target - fed) }, (_, i) => (
            <span key={`g${i}`} className="cookie ghost">🍪</span>
          ))}
        </div>
      </div>

      <div className="plate">
        {Array.from({ length: remaining }, (_, i) => (
          <button key={i} className="cookie big" onClick={feed} aria-label="Cookie">🍪</button>
        ))}
      </div>

      <div className="actions">
        <button className="btn secondary" onClick={takeBack} disabled={fed === 0} aria-label="Take one back">↩️</button>
        <button className="btn primary" onClick={submit} disabled={fed === 0} aria-label="Done">✅</button>
      </div>
    </div>
  );
}
