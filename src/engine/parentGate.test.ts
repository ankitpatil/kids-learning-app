import { describe, it, expect } from 'vitest';
import { HOLD_MS, checkGateAnswer, holdProgress, makeGateQuestion } from './parentGate';

describe('parent gate', () => {
  it('asks a multiplication with both factors 3–9', () => {
    for (let i = 0; i < 200; i++) {
      const q = makeGateQuestion();
      expect(q.a).toBeGreaterThanOrEqual(3);
      expect(q.a).toBeLessThanOrEqual(9);
      expect(q.b).toBeGreaterThanOrEqual(3);
      expect(q.b).toBeLessThanOrEqual(9);
      expect(q.answer).toBe(q.a * q.b);
    }
  });

  it('gives a different question after a wrong answer', () => {
    const q = makeGateQuestion(() => 0.5);
    let n = 0;
    const rng = () => [0.5, 0.5, 0.1, 0.9][n++ % 4];
    const next = makeGateQuestion(rng, q);
    expect([next.a, next.b]).not.toEqual([q.a, q.b]);
  });

  it('accepts only the exact typed answer', () => {
    const q = { a: 7, b: 8, answer: 56 };
    expect(checkGateAnswer(q, '56')).toBe(true);
    expect(checkGateAnswer(q, ' 56 ')).toBe(true);
    expect(checkGateAnswer(q, '15')).toBe(false);
    expect(checkGateAnswer(q, '')).toBe(false);
    expect(checkGateAnswer(q, '5.6e1')).toBe(false);
  });

  it('needs the full 3 s hold', () => {
    expect(HOLD_MS).toBe(3000);
    expect(holdProgress(null, 5000)).toBe(0);
    expect(holdProgress(1000, 2500)).toBeCloseTo(0.5);
    expect(holdProgress(1000, 3999)).toBeLessThan(1);
    expect(holdProgress(1000, 4000)).toBe(1);
    expect(holdProgress(1000, 9000)).toBe(1);
  });
});
