import { useEffect, useRef, useState } from 'react';
import { makeWordItem, wrongSlots, fillSentence, type WordItem, type WordTrack, type BuildItem } from './generator';
import { updateSkill, type SkillState } from '../../engine/adaptive';
import { maxLevel } from '../../engine/tracks';
import { getSkillState, getSkillStates, saveSkillState, logAttempt } from '../../store/db';
import { planRound, resolveSlot, type Slot } from '../../engine/roundMix';
import { say } from '../../audio/speech';
import { fresh } from '../../engine/recent';
import { feedback } from '../../components/Feedback';

const ROUND_LENGTH = 8;

interface Props {
  profileId: string;
  trackId: WordTrack;
  onDone: (result: { correct: number; total: number; leveledUp: boolean }) => void;
  onExit: () => void;
}

function promptFor(it: WordItem) {
  if (it.kind === 'sentence') return 'Read the sentence. Which word fits?';
  if (it.kind === 'read') return it.magic ? 'Look for the magic e! | Read the word, | then tap its picture.' : 'Read the word, | then tap its picture!';
  return `Build the word ${it.word}!`;
}

export function WordDetective({ profileId, trackId, onDone, onExit }: Props) {
  const [state, setState] = useState<SkillState | null>(null);
  const [item, setItem] = useState<WordItem | null>(null);
  const [index, setIndex] = useState(0);
  const [tried, setTried] = useState<string[]>([]); // read: wrong pictures tapped
  const [placed, setPlaced] = useState<(string | null)[]>([]); // build: tiles in slots
  const [used, setUsed] = useState<number[]>([]); // build: tile indices in use, by slot
  const [bad, setBad] = useState<number[]>([]);
  const [mood, setMood] = useState<'idle' | 'yay' | 'oops'>('idle');
  const hinted = useRef(false);
  const correctCount = useRef(0);
  const leveledUp = useRef(false);
  const ease = useRef(false);
  const started = useRef(Date.now());
  const busy = useRef(false);
  const plan = useRef(planRound(ROUND_LENGTH));
  const all = useRef<Awaited<ReturnType<typeof getSkillStates>>>({});
  const slot = useRef<Slot>({ kind: 'current', trackId, level: 0 });

  useEffect(() => {
    Promise.all([getSkillState(profileId, trackId), getSkillStates(profileId)]).then(([s, states]) => {
      all.current = states;
      setState(s);
      next(s.level, 0, undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, trackId]);

  function next(level: number, i: number, prevWord: string | undefined) {
    const easy = ease.current;
    const sl = (slot.current = resolveSlot(plan.current[i], trackId, level, all.current, easy));
    const it = fresh(sl.trackId, () => makeWordItem(sl.trackId as WordTrack, sl.level, i, Math.random, easy, prevWord), (x) => x.word);
    hinted.current = ease.current;
    ease.current = false;
    setItem(it);
    setTried([]);
    setBad([]);
    setMood('idle');
    if (it.kind === 'build') {
      const p: (string | null)[] = it.slots.map(() => null);
      const u: number[] = it.slots.map(() => -1);
      for (let k = 0; k < it.prefilled; k++) {
        const ti = it.tiles.findIndex((t, j) => t === it.slots[k] && !u.includes(j));
        p[k] = it.slots[k];
        u[k] = ti;
      }
      setPlaced(p);
      setUsed(u);
    }
    started.current = Date.now();
    busy.current = false;
    setTimeout(() => say((sl.kind === 'stretch' ? 'Bonus challenge! || ' : '') + promptFor(it)), 250);
  }

  async function record(correct: boolean) {
    const timeMs = Date.now() - started.current;
    const sl = slot.current;
    await logAttempt({ profileId, skillId: sl.trackId, itemId: item!.id, level: sl.level, correct, hintUsed: hinted.current, timeMs, at: Date.now(), mix: sl.kind });
    // Review and stretch items are logged but don't move the current track's level.
    if (sl.kind !== 'current') return { state: state!, change: 'same' as const, ease: false };
    const out = updateSkill(state!, { correct, hintUsed: hinted.current, timeMs }, maxLevel(trackId));
    await saveSkillState(out.state);
    setState(out.state);
    if (out.change === 'up') leveledUp.current = true;
    if (out.ease) ease.current = true;
    return out;
  }

  function advance(level: number) {
    const ni = index + 1;
    if (ni >= ROUND_LENGTH) {
      onDone({ correct: correctCount.current, total: ROUND_LENGTH, leveledUp: leveledUp.current });
      return;
    }
    setIndex(ni);
    next(level, ni, item!.word);
  }

  async function success() {
    const out = await record(true);
    feedback(out.change === 'up' ? 'levelup' : 'correct');
    if (!hinted.current) correctCount.current += 1;
    setMood('yay');
    const it = item!;
    const praise =
      it.kind === 'sentence'
        ? `Yes! ${fillSentence(it, it.word)}`
        : it.kind === 'read' && it.magic
          ? `Yes! ${it.magic.short}, add a magic e, ${it.magic.long}!`
          : `Yes! ${it.word}!`;
    say(out.change === 'up' ? `${praise} || You're a word detective! | New words unlocked!` : praise);
    setTimeout(() => advance(out.state.level), 1700);
  }

  async function pickPicture(emoji: string, word: string) {
    if (!item || item.kind !== 'read' || busy.current || tried.includes(emoji)) return;
    busy.current = true;
    if (emoji === item.answer) return success();
    await record(false);
    feedback('wrong');
    hinted.current = true;
    setTried((t) => [...t, emoji]);
    setMood('oops');
    // Hint: name the picture they tapped and sound out the word by its letters.
    say(`That's ${word}. || Look again: ${item.word.split('').join(', ')}.`);
    setTimeout(() => {
      setMood('idle');
      busy.current = false;
      started.current = Date.now();
    }, 900);
  }

  async function pickWord(word: string) {
    if (!item || item.kind !== 'sentence' || busy.current || tried.includes(word)) return;
    busy.current = true;
    if (word === item.word) return success();
    await record(false);
    feedback('wrong');
    hinted.current = true;
    setTried((t) => [...t, word]);
    setMood('oops');
    // Hint: read the sentence with their word so they can hear it doesn't make sense.
    say(`${fillSentence(item, word)} || Hmm, does that make sense? | Try again.`);
    setTimeout(() => {
      setMood('idle');
      busy.current = false;
      started.current = Date.now();
    }, 900);
  }

  function tapTile(ti: number) {
    if (!item || item.kind !== 'build' || busy.current || used.includes(ti)) return;
    const slot = placed.findIndex((p) => p === null);
    if (slot < 0) return;
    const p = [...placed];
    const u = [...used];
    p[slot] = item.tiles[ti];
    u[slot] = ti;
    setPlaced(p);
    setUsed(u);
    setBad([]);
    if (p.every((x) => x !== null)) check(item, p);
  }

  function clearSlot(si: number) {
    if (!item || item.kind !== 'build' || busy.current || placed[si] === null || si < item.prefilled) return;
    const p = [...placed];
    const u = [...used];
    p[si] = null;
    u[si] = -1;
    setPlaced(p);
    setUsed(u);
    setBad([]);
  }

  async function check(it: BuildItem, p: (string | null)[]) {
    busy.current = true;
    const wrong = wrongSlots(it, p);
    if (!wrong.length) return success();
    await record(false);
    feedback('wrong');
    hinted.current = true;
    setBad(wrong);
    setMood('oops');
    say(`Almost! | Fix the red one${wrong.length > 1 ? 's' : ''}. || ${it.word}.`);
    setTimeout(() => {
      // Pop the wrong tiles back out so the child only fixes those.
      setPlaced((cur) => cur.map((x, i) => (wrong.includes(i) ? null : x)));
      setUsed((cur) => cur.map((x, i) => (wrong.includes(i) ? -1 : x)));
      setMood('idle');
      busy.current = false;
      started.current = Date.now();
    }, 1300);
  }

  if (!item || !state) return <div className="screen center">Loading…</div>;

  return (
    <div className="screen game words">
      <div className="topbar">
        <button className="back-btn" onClick={onExit} aria-label="Back to levels">⬅️ Levels</button>
        <div className="progress" aria-label={`Question ${index + 1} of ${ROUND_LENGTH}`}>
          {Array.from({ length: ROUND_LENGTH }, (_, i) => (
            <span key={i} className={i < index ? 'dot done' : i === index ? `dot now${slot.current.kind === 'stretch' ? ' bonus' : ''}` : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => say(promptFor(item))} aria-label="Say again">🔊</button>
      </div>

      <div className="mode-badge">{item.kind === 'sentence' ? '💬' : item.kind === 'read' ? (item.magic ? '✨' : '🔍') : '🧩'}</div>

      {item.kind === 'sentence' ? (
        <>
          {item.emoji && <div className="sentence-clue" aria-hidden="true">{item.emoji}</div>}
          <p className={`sentence-text ${mood}`}>
            {item.before}{' '}
            <span className={`blank ${mood === 'yay' ? 'filled' : ''}`}>{mood === 'yay' ? item.word : '\u00a0'}</span>
            {/^[.,!?]/.test(item.after) ? '' : ' '}
            {item.after}
          </p>
          <div className="word-choices">
            {item.choices.map((w) => (
              <button
                key={w}
                className={`word-choice ${tried.includes(w) ? 'tried' : ''} ${mood === 'yay' && w === item.word ? 'right' : ''}`}
                onClick={() => pickWord(w)}
                aria-label={`Word ${w}`}
              >
                {w}
              </button>
            ))}
          </div>
        </>
      ) : item.kind === 'read' ? (
        <>
          <div className={`read-word ${mood}`}>{item.word}</div>
          {item.magic && mood === 'yay' && (
            <div className="magic-reveal" aria-live="polite">
              {item.magic.short} + <span className="magic-e">e</span> = {item.magic.long}
            </div>
          )}
          <div className={`picture-grid n${item.pictures.length}`}>
            {item.pictures.map((p) => (
              <button
                key={p.emoji}
                className={`picture-choice ${tried.includes(p.emoji) ? 'tried' : ''} ${mood === 'yay' && p.emoji === item.answer ? 'right' : ''}`}
                onClick={() => pickPicture(p.emoji, p.word)}
                aria-label={`Picture ${tried.length ? p.word : ''}`}
              >
                {p.emoji}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button className="picture-card" onClick={() => say(item.word)} aria-label="Hear the word again">
            <span className="picture">{item.emoji}</span>
          </button>
          <div className={`slots ${mood}`}>
            {placed.map((p, i) => (
              <button
                key={i}
                className={`slot ${p ? 'filled' : ''} ${bad.includes(i) ? 'bad' : ''} ${i < item.prefilled ? 'given' : ''}`}
                onClick={() => clearSlot(i)}
                aria-label={p ? `Slot ${i + 1}: ${p}, tap to remove` : `Empty slot ${i + 1}`}
              >
                {p ?? ''}
              </button>
            ))}
          </div>
          <div className="tiles">
            {item.tiles.map((t, ti) => (
              <button key={ti} className={`tile ${used.includes(ti) ? 'used' : ''}`} onClick={() => tapTile(ti)} aria-label={`Tile ${t}`}>
                {t}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
