import { describe, expect, it } from 'vitest';
import {
  POP_TRACKS, MAX_BALLOONS, MIN_TRIP_S, MAX_TRIP_S, HINT_AFTER,
  makePopItem, trimChoices, layoutBalloons, scorePop, pickPopTrack, popSlot, isPopTrack,
} from './generator';
import { getTrack, maxLevel, LEVEL_AGES } from '../../engine/tracks';
import { CONFUSABLES } from '../phonicsPop/letters';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('Pop the Answer items', () => {
  it('every Pop track is a real, playable track with age bands', () => {
    for (const id of POP_TRACKS) {
      expect(getTrack(id).playable).toBe(true);
      expect(LEVEL_AGES[id]).toBeDefined();
    }
    expect(isPopTrack('stories')).toBe(false);
    expect(() => makePopItem('stories', 0)).toThrow();
  });

  it('every track and level gives 2–4 unique balloons with the answer exactly once', () => {
    for (const id of POP_TRACKS) {
      for (let lv = 0; lv <= maxLevel(id); lv++) {
        for (let k = 0; k < 40; k++) {
          const rng = seeded(k * 97 + lv);
          for (const ease of [false, true]) {
            const it = makePopItem(id, lv, rng, ease);
            expect(it.trackId).toBe(id);
            expect(it.level).toBe(lv);
            expect(it.choices.length).toBeGreaterThanOrEqual(2);
            expect(it.choices.length).toBeLessThanOrEqual(ease ? 2 : MAX_BALLOONS);
            expect(new Set(it.choices).size).toBe(it.choices.length);
            expect(it.choices.filter((c) => c === it.answer)).toHaveLength(1);
            expect(it.say.length).toBeGreaterThan(0);
            expect(it.id.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('math answers are right', () => {
    for (let k = 0; k < 200; k++) {
      const rng = seeded(k);
      const add = makePopItem('add10', 2, rng);
      const [a, b] = add.visual.match(/(\d+) \+ (\d+)/)!.slice(1).map(Number);
      expect(Number(add.answer)).toBe(a + b);
      const sub = makePopItem('sub20', 1, rng);
      const [x, y] = sub.visual.match(/(\d+) − (\d+)/)!.slice(1).map(Number);
      expect(Number(sub.answer)).toBe(x - y);
      const count = makePopItem('count', 3, rng);
      expect([...count.visual].length).toBe(Number(count.answer));
    }
  });

  it('sight words are listen-only (no picture to guess from)', () => {
    const it = makePopItem('sightWords', 1, seeded(3));
    expect(it.visual).toBe('');
    expect(it.say).toContain(it.answer);
  });

  it('keeps the b/d look-alike balloon on the top phonics level', () => {
    const top = maxLevel('phonics');
    let checked = 0;
    for (let k = 0; k < 300; k++) {
      const it = makePopItem('phonics', top, seeded(k));
      const partner = CONFUSABLES[it.answer];
      if (!partner) continue;
      checked++;
      expect(it.choices).toContain(partner);
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe('trimChoices', () => {
  it('keeps the answer and the best distractors first', () => {
    const out = trimChoices(['5', '6', '4', '9', '1'], '5', 3, seeded(1));
    expect(out.sort()).toEqual(['4', '5', '6']);
  });
  it('drops duplicates and never goes below 2', () => {
    expect(trimChoices(['a', 'b', 'b'], 'a', 1, seeded(1)).sort()).toEqual(['a', 'b']);
  });
});

describe('layoutBalloons', () => {
  it('one balloon per choice, own lane and colour, slow trips, starting on screen', () => {
    for (let k = 0; k < 100; k++) {
      const choices = ['3', '7', '8', '9'].slice(0, 2 + (k % 3));
      const bs = layoutBalloons(choices, '7', seeded(k));
      expect(bs.map((b) => b.label)).toEqual(choices);
      expect(bs.filter((b) => b.correct)).toHaveLength(1);
      expect(new Set(bs.map((b) => b.x)).size).toBe(bs.length);
      expect(new Set(bs.map((b) => b.color)).size).toBe(bs.length);
      for (const b of bs) {
        expect(b.x).toBeGreaterThan(0);
        expect(b.x).toBeLessThan(1);
        expect(b.duration).toBeGreaterThanOrEqual(MIN_TRIP_S);
        expect(b.duration).toBeLessThanOrEqual(MAX_TRIP_S);
        // negative delay = already part-way up; never a whole trip (off screen)
        expect(b.delay).toBeLessThan(0);
        expect(-b.delay).toBeLessThan(b.duration * 0.9);
      }
    }
  });

  it('the answer lane moves around', () => {
    const lanes = new Set<number>();
    for (let k = 0; k < 50; k++) lanes.add(layoutBalloons(['1', '2', '3', '4'], '2', seeded(k)).find((b) => b.correct)!.x);
    expect(lanes.size).toBe(4);
  });
});

describe('scorePop', () => {
  const start = { tried: [], misses: 0 };

  it('right answer ends the item', () => {
    expect(scorePop(start, '7', '7').outcome).toBe('right');
  });

  it('only the first wrong pop counts as a miss (no penalty spiral)', () => {
    const a = scorePop(start, '3', '7');
    expect(a.outcome).toBe('wrong');
    expect(a.state).toEqual({ tried: ['3'], misses: 1 });
    const b = scorePop(a.state, '8', '7');
    expect(b.outcome).toBe('again');
    expect(b.state.misses).toBe(1);
    const c = scorePop(b.state, '3', '7');
    expect(c.outcome).toBe('again');
    expect(c.state.tried).toEqual(['3', '8']);
  });

  it(`hint glows after ${HINT_AFTER} different wrong pops`, () => {
    const a = scorePop(start, '3', '7');
    expect(a.hint).toBe(false);
    expect(scorePop(a.state, '3', '7').hint).toBe(false);
    expect(scorePop(a.state, '8', '7').hint).toBe(true);
  });
});

describe('picking what to play', () => {
  it('plays the next unmastered skill when Pop can play it', () => {
    expect(pickPopTrack('math', {})).toBe('count');
    expect(pickPopTrack('reading', {})).toBe('phonics');
    const top = { level: maxLevel('count'), mastery: 0.95 };
    expect(pickPopTrack('math', { count: top })).toBe('add10');
  });

  it('falls back to the furthest Pop skill reached when the next skill is not poppable', () => {
    const done = (id: string) => ({ level: maxLevel(id), mastery: 0.95 });
    const states: Record<string, { level: number; mastery: number }> = {};
    for (const id of ['count', 'add10', 'sub10', 'missing', 'add20', 'sub20', 'placeValue', 'compare2d']) states[id] = done(id);
    // next math skill is Story sums (not poppable)
    expect(pickPopTrack('math', states)).toBe('compare2d');
  });

  it('review / stretch slots never leave the tracks Pop can play', () => {
    const states = { cvc: { level: 1, mastery: 0.95 }, sentences: { level: 0, mastery: 0.3 }, vowelTeams: { level: 1, mastery: 0.9 } };
    for (let k = 0; k < 200; k++) {
      for (const kind of ['current', 'review', 'stretch'] as const) {
        const s = popSlot(kind, 'vowelTeams', 1, states, false, seeded(k));
        expect(isPopTrack(s.trackId)).toBe(true);
      }
    }
  });
});
