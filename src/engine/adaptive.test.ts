import { describe, it, expect } from 'vitest';
import { newSkillState, scoreAttempt, updateSkill, START_MASTERY } from './adaptive';

const ok = { correct: true, hintUsed: false, timeMs: 6000 };
const fast = { correct: true, hintUsed: false, timeMs: 1000 };
const miss = { correct: false, hintUsed: false, timeMs: 6000 };

describe('scoreAttempt', () => {
  it('scores correct, hinted, wrong, fast', () => {
    expect(scoreAttempt(ok)).toBe(1);
    expect(scoreAttempt({ ...ok, hintUsed: true })).toBe(0.5);
    expect(scoreAttempt(miss)).toBe(0);
    expect(scoreAttempt(fast)).toBe(1);
  });
});

describe('updateSkill', () => {
  it('levels up after a run of correct answers, not before 8 attempts', () => {
    let s = newSkillState('p', 'count');
    const changes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const out = updateSkill(s, ok, 5);
      changes.push(out.change);
      s = out.state;
    }
    expect(changes.slice(0, 7).every((c) => c === 'same')).toBe(true);
    expect(changes[7]).toBe('up');
    expect(s.level).toBe(1);
    expect(s.mastery).toBe(START_MASTERY);
  });

  it('does not level past max', () => {
    let s = { ...newSkillState('p', 'count', 2) };
    for (let i = 0; i < 20; i++) s = updateSkill(s, ok, 2).state;
    expect(s.level).toBe(2);
  });

  it('levels down when mastery drops below 0.5', () => {
    let s = newSkillState('p', 'count', 2);
    let out = updateSkill(s, miss, 5);
    expect(out.change).toBe('down');
    expect(out.state.level).toBe(1);
  });

  it('never goes below level 0 and flags easing after 2 misses', () => {
    const s = newSkillState('p', 'count', 0);
    const a = updateSkill(s, miss, 5);
    const b = updateSkill(a.state, miss, 5);
    expect(b.state.level).toBe(0);
    expect(a.ease).toBe(false);
    expect(b.ease).toBe(true);
  });
});
