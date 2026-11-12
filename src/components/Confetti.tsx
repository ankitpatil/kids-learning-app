import { useMemo } from 'react';
import { makeConfetti } from './confetti';

/** Full-screen, click-through confetti rain. Remount (new `key`) to play again. */
export function Confetti({ count = 90 }: { count?: number }) {
  const pieces = useMemo(() => makeConfetti(count), [count]);
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            borderRadius: p.round ? '50%' : 2,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ['--drift' as string]: `${p.drift}vw`,
            ['--spin' as string]: `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}
