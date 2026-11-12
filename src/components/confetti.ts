// Round-end paper confetti: pure piece generator (tested) used by <Confetti />.

export const CONFETTI_COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3', '#6c5ce7', '#ff9f43'];

export interface ConfettiPiece {
  left: number;     // % across the screen where it starts
  drift: number;    // vw sideways by the end of the fall
  delay: number;    // s before it starts falling
  duration: number; // s to fall the full screen
  spin: number;     // deg of rotation over the fall
  w: number;        // px
  h: number;        // px
  color: string;
  round: boolean;   // circle instead of a paper strip
}

/** Confetti pieces for one celebration. `rand` is injectable for tests. */
export function makeConfetti(count = 90, rand: () => number = Math.random): ConfettiPiece[] {
  return Array.from({ length: count }, () => {
    const round = rand() < 0.25;
    const w = 8 + Math.round(rand() * 6);
    return {
      left: rand() * 100,
      drift: (rand() - 0.5) * 30,
      delay: rand() * 0.9,
      duration: 2.4 + rand() * 1.6,
      spin: (rand() < 0.5 ? -1 : 1) * (360 + rand() * 720),
      w,
      h: round ? w : w + 6 + Math.round(rand() * 8),
      color: CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)],
      round,
    };
  });
}
