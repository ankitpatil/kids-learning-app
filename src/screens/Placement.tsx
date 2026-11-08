import { useEffect, useRef, useState } from 'react';
import { startPlacement, answer, isDone, currentCheckpoint, PRESETS, type StartingPoint } from '../engine/placement';
import { makeQuickItem, type QuickItem } from '../engine/quickItems';
import type { Subject } from '../engine/tracks';
import { say } from '../audio/speech';

interface Props {
  subject: Subject;
  /** Highest passed checkpoint index (-1 = none). */
  onDone: (best: number) => void;
  /** Leave the quiz (back to the starting-point screen). Progress in the quiz is discarded. */
  onExit: () => void;
}

/** Parent-facing choice: quick check (child plays) or a preset. */
export function StartPoint({ subject, onPick, onCheck, onExit }: { subject: Subject; onPick: (best: number) => void; onCheck: () => void; onExit: () => void }) {
  const presets: { id: StartingPoint; emoji: string; label: string }[] = [
    { id: 'beginner', emoji: '🌱', label: subject === 'math' ? 'Just starting to count' : 'Just starting letters' },
    { id: 'basics', emoji: subject === 'math' ? '🔢' : '🔤', label: subject === 'math' ? 'Counts to 20' : 'Knows letter sounds' },
    { id: 'reader', emoji: subject === 'math' ? '➕' : '📖', label: subject === 'math' ? 'Adds & subtracts to 10' : 'Reads short words' },
  ];
  useEffect(() => {
    say("Let's play a quick game to find the best level for you!");
  }, []);
  return (
    <div className="screen startpoint">
      <div className="topbar" style={{ width: "100%" }}>
        <button className="back-btn" onClick={onExit} aria-label="Back">⬅️ Back</button>
      </div>
      <button className="btn primary huge check" onClick={onCheck} aria-label="Quick check">🎯</button>
      <p className="parent-note">Grown-ups: tap 🎯 for a 2-minute check, or pick a starting point.</p>
      <div className="presets">
        {presets.map((p) => (
          <button key={p.id} className="preset" onClick={() => onPick(PRESETS[p.id][subject])}>
            <span className="preset-emoji">{p.emoji}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Placement({ subject, onDone, onExit }: Props) {
  const [state, setState] = useState(() => startPlacement(subject));
  const [item, setItem] = useState<QuickItem | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (isDone(state)) {
      say('All done! Great job. Let\'s play!');
      const t = setTimeout(() => onDone(state.best), 1500);
      return () => clearTimeout(t);
    }
    const cp = currentCheckpoint(state);
    const it = makeQuickItem(cp.trackId, cp.level);
    setItem(it);
    setPicked(null);
    busy.current = false;
    const t = setTimeout(() => say(it.say), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function choose(c: string) {
    if (!item || busy.current) return;
    busy.current = true;
    setPicked(c);
    // Neutral, encouraging feedback either way: placement shouldn't feel like a test.
    say(['Okay!', 'Got it!', 'Nice!', 'Thanks!'][state.asked % 4]);
    setTimeout(() => setState((s) => answer(s, c === item.answer)), 700);
  }

  if (isDone(state)) {
    return (
      <div className="screen center reward">
        <div className="burst">🎉</div>
      </div>
    );
  }
  if (!item) return <div className="screen center">…</div>;

  const wordChoices = item.choices.some((c) => /[a-z]{2,}/.test(c));
  return (
    <div className="screen game placement">
      <div className="topbar">
        <button
          className="back-btn"
          onClick={() => {
            window.speechSynthesis?.cancel();
            onExit();
          }}
          aria-label="Back, quit the quick check"
        >
          ⬅️ Back
        </button>
        <div className="progress" aria-label="Quick check">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className={i < Math.min(state.asked, 8) ? 'dot done' : 'dot'} />
          ))}
        </div>
        <button className="icon-btn" onClick={() => say(item.say)} aria-label="Say again">🔊</button>
      </div>
      <div className={`quick-visual ${item.visual.length > 24 ? 'small' : ''}`}>{item.visual}</div>
      <div className={`quick-choices ${wordChoices ? 'words' : ''}`}>
        {item.choices.map((c) => (
          <button key={c} className={`quick-choice ${picked === c ? 'picked' : ''}`} onClick={() => choose(c)} aria-label={c}>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
