import { useEffect, useRef, useState } from 'react';
import { HOLD_MS, checkGateAnswer, holdProgress, makeGateQuestion } from '../engine/parentGate';

/** Grown-ups only: hold for 3 s, then type the answer to a multiplication. */
export function ParentGate({ onPass, onBack }: { onPass: () => void; onBack: () => void }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [held, setHeld] = useState(false);
  const [q, setQ] = useState(() => makeGateQuestion());
  const [typed, setTyped] = useState('');
  const [wrong, setWrong] = useState(false);
  const raf = useRef<number>();

  useEffect(() => {
    if (startedAt === null) return;
    const tick = () => {
      const p = holdProgress(startedAt, performance.now());
      setProgress(p);
      if (p >= 1) {
        setHeld(true);
        setStartedAt(null);
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
  }, [startedAt]);

  const release = () => {
    setStartedAt(null);
    if (!held) setProgress(0);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkGateAnswer(q, typed)) return onPass();
    setWrong(true);
    setTyped('');
    setQ(makeGateQuestion(Math.random, q));
  };

  return (
    <div className="screen gate">
      <div className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Back to home">⬅️ Back</button>
        <h2 className="voices-title">⚙️ Grown-ups</h2>
        <span style={{ width: 64 }} />
      </div>
      {!held ? (
        <>
          <p className="parent-note">Grown-ups: press and hold for {HOLD_MS / 1000} seconds.</p>
          <button
            className="hold-btn"
            style={{ '--p': progress } as React.CSSProperties}
            onPointerDown={() => setStartedAt(performance.now())}
            onPointerUp={release}
            onPointerLeave={release}
            onPointerCancel={release}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Press and hold"
          >
            🔒
          </button>
        </>
      ) : (
        <form className="gate-q" onSubmit={submit}>
          <label htmlFor="gate-answer" className="gate-sum">{q.a} × {q.b} =</label>
          <input id="gate-answer" className="gate-input" inputMode="numeric" pattern="[0-9]*" autoComplete="off" autoFocus value={typed} onChange={(e) => setTyped(e.target.value.replace(/\D/g, '').slice(0, 3))} />
          <button className="btn primary" type="submit" aria-label="Check">✔️</button>
          {wrong && <p className="parent-note">Not quite — here's a new one.</p>}
        </form>
      )}
    </div>
  );
}
