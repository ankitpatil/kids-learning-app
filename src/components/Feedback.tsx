import { useEffect, useState } from 'react';
import { playCorrect, playWrong, playSparkle } from '../audio/sfx';

type Kind = 'correct' | 'wrong' | 'levelup';
const EVENT = 'll-feedback';

/** Call from any game: plays the sound and shows the matching animation. */
export function feedback(kind: Kind) {
  if (kind === 'correct') playCorrect();
  else if (kind === 'wrong') playWrong();
  else {
    playCorrect();
    setTimeout(playSparkle, 300);
  }
  window.dispatchEvent(new CustomEvent<Kind>(EVENT, { detail: kind }));
}

const CONFETTI = ['⭐', '🎉', '✨', '🌟', '💖', '🎈', '🍭'];

interface Burst {
  id: number;
  kind: Kind;
  parts: { e: string; x: number; y: number; r: number; d: number }[];
}

/** Full-screen, click-through overlay. Mount once at the app root. */
export function FeedbackLayer() {
  const [burst, setBurst] = useState<Burst | null>(null);

  useEffect(() => {
    const on = (ev: Event) => {
      const kind = (ev as CustomEvent<Kind>).detail;
      const n = kind === 'wrong' ? 0 : kind === 'levelup' ? 28 : 16;
      const parts = Array.from({ length: n }, () => ({
        e: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
        x: (Math.random() - 0.5) * 120, // vw-ish spread
        y: -30 - Math.random() * 50,
        r: (Math.random() - 0.5) * 540,
        d: Math.random() * 0.15,
      }));
      const id = Date.now() + Math.random();
      setBurst({ id, kind, parts });
      setTimeout(() => setBurst((b) => (b?.id === id ? null : b)), kind === 'levelup' ? 1800 : 1200);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  if (!burst) return null;
  return (
    <div className={`fx-layer fx-${burst.kind}`} key={burst.id} aria-hidden>
      {burst.kind === 'wrong' ? (
        <div className="fx-oops">🤔</div>
      ) : (
        <>
          <div className="fx-check">{burst.kind === 'levelup' ? '🏆' : '✅'}</div>
          {burst.parts.map((p, i) => (
            <span
              key={i}
              className="fx-part"
              style={{ ['--x' as string]: `${p.x}vw`, ['--y' as string]: `${p.y}vh`, ['--r' as string]: `${p.r}deg`, animationDelay: `${p.d}s` }}
            >
              {p.e}
            </span>
          ))}
        </>
      )}
    </div>
  );
}
