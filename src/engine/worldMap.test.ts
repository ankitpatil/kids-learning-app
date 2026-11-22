import { describe, expect, it } from 'vitest';
import { TRACKS, getTrack, tracksFor } from './tracks';
import { newSkillState } from './adaptive';
import { PREREQS, island, worldMap, prereqsOf, unlockLevel, lockedMessage, type States } from './worldMap';

const st = (level: number, mastery = 0.5, attemptsAtLevel = 3) => ({ level, mastery, attemptsAtLevel });

describe('world map prerequisites', () => {
  it('lists every track and only names real tracks', () => {
    const ids = new Set(TRACKS.map((t) => t.id));
    for (const t of TRACKS) expect(PREREQS[t.id], t.id).toBeDefined();
    for (const [id, pre] of Object.entries(PREREQS)) {
      expect(ids.has(id), id).toBe(true);
      for (const p of pre) {
        expect(ids.has(p), `${id} → ${p}`).toBe(true);
        expect(getTrack(p).subject, `${id} → ${p} same subject`).toBe(getTrack(id).subject);
      }
    }
  });

  it('has no cycles and every subject has a starting island', () => {
    const seen = new Set<string>();
    const visit = (id: string, path: string[]) => {
      expect(path.includes(id), `cycle ${path.join('→')}→${id}`).toBe(false);
      if (seen.has(id)) return;
      for (const p of prereqsOf(id)) visit(p, [...path, id]);
      seen.add(id);
    };
    for (const t of TRACKS) visit(t.id, []);
    for (const subject of ['math', 'reading'] as const) {
      expect(worldMap(subject, {}).some((i) => i.status === 'open')).toBe(true);
    }
  });

  it('a new child sees only the first islands open', () => {
    const math = worldMap('math', {});
    expect(math.filter((i) => i.status === 'open').map((i) => i.trackId)).toEqual(['count']);
    const reading = worldMap('reading', {});
    expect(reading.filter((i) => i.status === 'open').map((i) => i.trackId).sort()).toEqual(['phonics', 'sightWords']);
    expect(math.every((i) => i.status === 'open' || i.waitingOn.length > 0)).toBe(true);
  });

  it('only playable tracks get islands, in curriculum order', () => {
    const ids = worldMap('math', {}).map((i) => i.trackId);
    expect(ids).toEqual(tracksFor('math').filter((t) => t.playable).map((t) => t.id));
    expect(ids).not.toContain('grouping');
  });
});

describe('unlocking', () => {
  it('opens a track when its prerequisite is halfway', () => {
    expect(unlockLevel('count')).toBe(3); // 6 levels: "up to 10"
    expect(island('add10', { count: st(2) }).status).toBe('locked');
    expect(island('add10', { count: st(3) }).status).toBe('open');
  });

  it('needs every prerequisite', () => {
    const states: States = { add10: st(1), sub10: st(0) };
    const i = island('wordProblems', states);
    expect(i.status).toBe('locked');
    expect(i.waitingOn).toEqual(['sub10']);
    expect(lockedMessage(i)).toBe('Play Subtract within 10 a bit more to open this island!');
    expect(island('wordProblems', { add10: st(1), sub10: st(1) }).status).toBe('open');
  });

  it('a mastered prerequisite always counts', () => {
    expect(island('cvc', { phonics: st(6, 0.9) }).status).toBe('open');
  });

  it('never locks a track the child already started (played or placed into)', () => {
    expect(island('stories', { stories: st(0, 0.3, 2) }).status).toBe('started');
    expect(island('placeValue', { placeValue: st(1, 0, 0) }).status).toBe('started');
  });

  it('an untouched saved state still counts as not started', () => {
    expect(island('add10', { add10: st(0, 0, 0) }).status).toBe('locked');
    // The starting point saves level-0 states with the default mastery for every track.
    expect(island('add20', { count: st(5, 0.95, 0), add10: st(2, 0.95, 0), add20: newSkillState('p', 'add20') }).status).toBe('open');
    expect(island('add20', { add20: newSkillState('p', 'add20') }).status).toBe('locked');
  });

  it('joins several missing prerequisites in the message', () => {
    expect(lockedMessage(island('sentences', {}))).toBe('Play Short words and Tricky words a bit more to open this island!');
  });
});

describe('bloom', () => {
  it('grows seedling → sprout → bud → full bloom', () => {
    expect(island('count', {}).bloom).toBe(0);
    expect(island('count', { count: st(1) }).bloom).toBe(1);
    expect(island('count', { count: st(3) }).bloom).toBe(2);
    expect(island('count', { count: st(5, 0.8) }).bloom).toBe(2); // top level, not yet mastered
    const m = island('count', { count: st(5, 0.9) });
    expect(m.status).toBe('mastered');
    expect(m.bloom).toBe(3);
  });

  it('locked islands have no bloom', () => {
    expect(island('digraphs', {}).bloom).toBe(0);
  });
});
