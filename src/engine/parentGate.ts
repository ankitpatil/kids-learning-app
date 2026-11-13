// Parent gate (SPEC "Parent area"): hold a button for 3 s, then answer a multiplication that a
// 5–7-year-old can't (both factors 3–9, typed answer, no multiple choice to guess from).
import type { Rng } from './roundMix';

export const HOLD_MS = 3000;

export interface GateQuestion {
  a: number;
  b: number;
  answer: number;
}

export function makeGateQuestion(rng: Rng = Math.random, avoid?: GateQuestion): GateQuestion {
  for (let i = 0; i < 20; i++) {
    const a = 3 + Math.floor(rng() * 7);
    const b = 3 + Math.floor(rng() * 7);
    if (avoid && avoid.a === a && avoid.b === b) continue;
    return { a, b, answer: a * b };
  }
  return { a: 7, b: 8, answer: 56 };
}

export function checkGateAnswer(q: GateQuestion, typed: string): boolean {
  const t = typed.trim();
  return /^\d{1,3}$/.test(t) && Number(t) === q.answer;
}

/** Hold progress 0–1 from when the press started. Released early → 0. */
export function holdProgress(startedAt: number | null, now: number): number {
  if (startedAt === null) return 0;
  return Math.min(1, Math.max(0, (now - startedAt) / HOLD_MS));
}
