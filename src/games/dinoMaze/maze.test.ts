import { describe, expect, it } from 'vitest';
import { E, N, S, W, OBSTACLES, OBSTACLE_KINDS, OBSTACLES_PER_GAME, generateMaze, makeDinoLevel, nextStop, solve } from './maze';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('Dino Maze maze', () => {
  it('carves a perfect maze: every cell reachable, walls match on both sides, cells-1 passages', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const m = generateMaze(9, 5, seeded(seed));
      let passages = 0;
      for (let y = 0; y < 5; y++)
        for (let x = 0; x < 9; x++) {
          const o = m.open[y][x];
          expect(o).toBeGreaterThan(0);
          if (o & E) { expect(x).toBeLessThan(8); expect(m.open[y][x + 1] & W).toBeTruthy(); passages++; }
          if (o & S) { expect(y).toBeLessThan(4); expect(m.open[y + 1][x] & N).toBeTruthy(); passages++; }
          if (x === 0) expect(o & W).toBe(0);
          if (y === 0) expect(o & N).toBe(0);
        }
      expect(passages).toBe(9 * 5 - 1); // a tree: one way between any two cells
      expect(solve(m, { x: 0, y: 0 }, { x: 8, y: 4 }).length).toBeGreaterThan(0);
    }
  });

  it('the solved path is connected step by step through open sides', () => {
    const m = generateMaze(9, 5, seeded(7));
    const path = solve(m, { x: 0, y: 0 }, { x: 8, y: 4 });
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 8, y: 4 });
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(1);
      const bit = b.x > a.x ? E : b.x < a.x ? W : b.y > a.y ? S : N;
      expect(m.open[a.y][a.x] & bit).toBeTruthy();
    }
  });

  it('a game has 4 different obstacles spread along the way, with walking between them', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const lv = makeDinoLevel(seeded(seed));
      expect(lv.obstacles).toHaveLength(OBSTACLES_PER_GAME);
      expect(new Set(lv.obstacles.map((o) => o.kind)).size).toBe(OBSTACLES_PER_GAME);
      let prev = 0;
      for (const o of lv.obstacles) {
        expect(o.at).toBeGreaterThan(prev); // never on the start cell, never two on one cell
        prev = o.at;
      }
      expect(prev).toBeLessThan(lv.path.length - 1); // never on the nest
    }
  });

  it('mazes and obstacle orders differ between games', () => {
    const a = makeDinoLevel(seeded(1));
    const b = makeDinoLevel(seeded(2));
    expect(JSON.stringify(a.maze.open) === JSON.stringify(b.maze.open) && a.obstacles.map((o) => o.kind).join() === b.obstacles.map((o) => o.kind).join()).toBe(false);
  });

  it('nextStop walks to the cell before each obstacle, then to the nest', () => {
    const lv = makeDinoLevel(seeded(3));
    let pos = 0;
    lv.obstacles.forEach((o, k) => {
      const s = nextStop(lv, pos);
      expect(s).toEqual({ to: o.at - 1, obstacle: k });
      pos = o.at; // cleared: Mom steps onto the obstacle's cell
    });
    expect(nextStop(lv, pos)).toEqual({ to: lv.path.length - 1, obstacle: -1 });
  });

  it('every obstacle uses a gesture and has its pictures', () => {
    for (const k of OBSTACLE_KINDS) {
      const d = OBSTACLES[k];
      expect(['bash', 'chop', 'grab', 'jump']).toContain(d.gesture);
      for (const s of [d.icon, d.move, d.target, d.todo, d.done, d.instruction, d.cleared]) expect(s.length).toBeGreaterThan(0);
    }
    expect(new Set(OBSTACLE_KINDS.map((k) => OBSTACLES[k].gesture)).size).toBe(4); // all four moves are used
  });
});
