import { useEffect, useRef, useState } from 'react';
import { makeFeedItem, checkFeed, type FeedItem } from './generator';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { maxLevel } from '../../engine/tracks';
import { getSkillState, saveSkillState, logAttempt } from '../../store/db';
import { say } from '../../audio/speech';

const ROUND_LENGTH = 8;
const NUMBER_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty one','twenty two','twenty three','twenty four'];
const w = (n: number) => NUMBER_WORDS[n] ?? String(n);

interface Props {
  profileId: string;
  trackId: 'count' | 'missing';
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

function promptFor(it: FeedItem) {
  if (it.have === 0) return `Feed the monster ${w(it.total)} cookie${it.total === 1 ? '' : 's'}!`;
  if (it.mode === 'choose') return `I have ${w(it.have)}. How many more make ${w(it.total)}?`;
  return `I have ${w(it.have)} cookies. Feed me until I have ${w(it.total)}!`;
}

/** Ten-frame belly: 2×5 grids. Pre-filled cookies are solid, fed ones bounce in, ghosts show the gap. */
function TenFrames({ have, fed, ghost }: { have: number; fed: number; ghost: number }) {
  const cells: ('have' | 'fed' | 'ghost' | 'empty')[] = [];
  for (let i = 0; i < have; i++) cells.push('have');
  for (let i = 0; i < fed; i++) cells.push('fed');
  for (let i = 0; i < ghost; i++) cells.push('ghost');
  const frames = Math.max(1, Math.ceil(cells.length / 10));
  while (cells.length < frames * 10) cells.push('empty');
  return (
    <div className="frames">
      {Array.from({ length: frames }, (_, f) => (
        <div key={f} className="frame">
          {cells.slice(f * 10, f * 10 + 10).map((c, i) => (
            <span key={i} className={`cell ${c}`}>{c === 'empty' ? '' : '🍪'}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function FeedMonster({ profileId, trackId, onDone, onExit }: Props) {
  const [state, setState] = useState<SkillState | null>(null);
  const [item, setItem] = useState<FeedItem | null>(null);
  const [fed, setFed] = useState(0);
  const [mood, setMood] = useState<'idle' | 'yum' | 'oops'>('idle');
  const [index, setIndex] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const correctCount = useRef(0);
  const leveledUp = useRef(false);
  const ease = useRef(false);
  const started = useRef(Date.now());
  const busy = useRef(false);

  useEffect(() => {
    getSkillState(profileId, trackId).then((s) => {
      setState(s);
      next(s.level, undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, trackId]);

  function next(level: number, prevNeed: number | undefined) {
    const it = makeFeedItem(trackId, level, Math.random, ease.current, prevNeed);
    setHintUsed(ease.current);
    ease.current = false;
    setItem(it);
    setFed(0);
    setMood('idle');
    setWrongPick(null);
    started.current = Date.now();
    busy.current = false;
    setTimeout(() => say(promptFor(it)), 250);
  }

  function feed() {
    if (!item || busy.current || fed >= item.supply) return;
    const n = fed + 1;
    setFed(n);
    say(w(item.have + n), { rate: 1.1 }); // count on from what the monster already has
  }

  function takeBack() {
    if (busy.current || fed === 0) return;
    setFed(fed - 1);
  }

  async function submit(given: number) {
    if (!item || !state || busy.current) return;
    busy.current = true;
    const verdict = checkFeed(item, given);
    const correct = verdict === 'correct';
    const timeMs = Date.now() - started.current;
    const out = updateSkill(state, { correct, hintUsed, timeMs }, maxLevel(trackId));
    await logAttempt({ profileId, skillId: trackId, itemId: item.id, level: state.level, correct, hintUsed, timeMs, at: Date.now() });
    await saveSkillState(out.state);
    setState(out.state);
    if (out.change === 'up') leveledUp.current = true;
    if (out.ease) ease.current = true;

    if (correct) {
      setMood('yum');
      if (item.mode === 'feed') setFed(given);
      if (!hintUsed) correctCount.current += 1;
      const sum = item.have > 0 ? `${w(item.have)} and ${w(item.need)} make ${w(item.total)}! ` : '';
      say(sum + (out.change === 'up' ? 'Yum yum! You are getting so good!' : 'Yum yum! Thank you!'));
      setTimeout(() => {
        const nextIndex = index + 1;
        if (nextIndex >= ROUND_LENGTH) {
          onDone({ correct: correctCount.current, total: ROUND_LENGTH, leveledUp: leveledUp.current });
          return;
        }
        setIndex(nextIndex);
        next(out.state.level, item.need);
      }, item.have > 0 ? 2200 : 1400);
    } else {
      setMood('oops');
      setHintUsed(true);
      if (item.mode === 'choose') {
        setWrongPick(given);
        say(`Hmm, ${w(item.have)} and ${w(given)} make ${w(item.have + given)}. I want ${w(item.total)}. Try again!`);
      } else {
        const now = item.have + given;
        const diff = Math.abs(item.total - now);
        say(
          verdict === 'too-few'
            ? `That's ${w(now)}. I want ${w(item.total)}. Can you give me ${w(diff)} more?`
            : `Oh, that's too many! I want ${w(item.total)}. Take ${w(diff)} back.`,
        );
      }
      setTimeout(() => {
        setMood('idle');
        busy.current = false;
        started.current = Date.now();
      }, 900);
    }
  }

  if (!item || !state) return <div className="screen center">Loading…</div>;

  const remaining = item.supply - fed;
  const showGuide = hintUsed;
  const ghosts = showGuide ? Math.max(0, item.need - fed) : 0;

  return (
    <div className="screen game">
      <div className="topbar">
        <button className="icon-btn" onClick={onExit} aria-label="Home">🏠</button>
        <div className="progress" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
          {Array.from({ length: ROUND_LENGTH }, (_, i) => (
            <span key={i} className={i < index ? 'dot done' : i === index ? 'dot now' : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => say(promptFor(item))} aria-label="Say again">🔊</button>
      </div>

      {item.have > 0 ? (
        <div className="equation" aria-hidden>
          <span>{item.have}</span> + <span className={`blank ${mood === 'yum' ? 'filled' : ''}`}>{mood === 'yum' ? item.need : item.mode === 'feed' ? fed || '?' : '?'}</span> = <span>{item.total}</span>
        </div>
      ) : (
        <div className="target-number" aria-hidden>{item.total}</div>
      )}

      <div className={`monster ${mood}`} onClick={item.mode === 'feed' ? takeBack : undefined} role="button" aria-label="Monster">
        <div className="monster-face">{mood === 'yum' ? '😋' : mood === 'oops' ? '😮' : '👾'}</div>
        {item.frames && item.mode === 'choose' && !showGuide && mood !== 'yum' ? null : item.frames ? (
          <TenFrames have={item.have} fed={item.mode === 'feed' || mood === 'yum' ? (mood === 'yum' ? item.need : fed) : 0} ghost={item.mode === 'choose' && showGuide ? item.need : ghosts} />
        ) : (
          <div className="belly">
            {Array.from({ length: fed }, (_, i) => (
              <span key={i} className="cookie small">🍪</span>
            ))}
            {Array.from({ length: ghosts }, (_, i) => (
              <span key={`g${i}`} className="cookie ghost">🍪</span>
            ))}
          </div>
        )}
      </div>

      {item.mode === 'feed' ? (
        <>
          <div className="plate">
            {Array.from({ length: remaining }, (_, i) => (
              <button key={i} className="cookie big" onClick={feed} aria-label="Cookie">🍪</button>
            ))}
          </div>
          <div className="actions">
            <button className="btn secondary" onClick={takeBack} disabled={fed === 0} aria-label="Take one back">↩️</button>
            <button className="btn primary" onClick={() => submit(fed)} disabled={fed === 0} aria-label="Done">✅</button>
          </div>
        </>
      ) : (
        <div className="quick-choices number-pick">
          {item.choices.map((c) => (
            <button key={c} className={`quick-choice ${wrongPick === c ? 'tried' : ''}`} onClick={() => submit(c)} aria-label={String(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
