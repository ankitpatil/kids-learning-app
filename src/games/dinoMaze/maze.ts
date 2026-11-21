// 🦕 Dino Maze (TV games): Dino Mom walks a maze to her babies. A new maze every game, with obstacles
// on the way that are each locked by a puzzle. Pure logic here (maze, path, obstacles); UI in DinoMaze.tsx.

export type Rng = () => number;

/** Open sides of a cell (bit set = no wall that way). */
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
const DIRS = [
  { bit: N, dx: 0, dy: -1, back: S },
  { bit: E, dx: 1, dy: 0, back: W },
  { bit: S, dx: 0, dy: 1, back: N },
  { bit: W, dx: -1, dy: 0, back: E },
] as const;

export interface Cell {
  x: number;
  y: number;
}

export interface Maze {
  cols: number;
  rows: number;
  /** open[y][x]: bitmask of open sides (N/E/S/W). */
  open: number[][];
}

function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A "perfect" maze (exactly one way between any two cells), carved by a randomised depth-first walk. */
export function generateMaze(cols: number, rows: number, rng: Rng = Math.random): Maze {
  const open = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  const seen = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  const stack: Cell[] = [{ x: 0, y: 0 }];
  seen[0][0] = true;
  while (stack.length) {
    const c = stack[stack.length - 1];
    const nexts = shuffle(DIRS, rng).filter((d) => {
      const nx = c.x + d.dx;
      const ny = c.y + d.dy;
      return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny][nx];
    });
    if (!nexts.length) {
      stack.pop();
      continue;
    }
    const d = nexts[0];
    const n = { x: c.x + d.dx, y: c.y + d.dy };
    open[c.y][c.x] |= d.bit;
    open[n.y][n.x] |= d.back;
    seen[n.y][n.x] = true;
    stack.push(n);
  }
  return { cols, rows, open };
}

/** The way from `from` to `to` (both included), walking only through open sides. */
export function solve(m: Maze, from: Cell, to: Cell): Cell[] {
  const key = (c: Cell) => c.y * m.cols + c.x;
  const prev = new Map<number, number>([[key(from), -1]]);
  const queue: Cell[] = [from];
  while (queue.length) {
    const c = queue.shift()!;
    if (c.x === to.x && c.y === to.y) break;
    for (const d of DIRS) {
      if (!(m.open[c.y][c.x] & d.bit)) continue;
      const n = { x: c.x + d.dx, y: c.y + d.dy };
      if (prev.has(key(n))) continue;
      prev.set(key(n), key(c));
      queue.push(n);
    }
  }
  if (!prev.has(key(to))) return [];
  const path: Cell[] = [];
  for (let k = key(to); k !== -1; k = prev.get(k)!) path.unshift({ x: k % m.cols, y: Math.floor(k / m.cols) });
  return path;
}

// ---------- Obstacles ----------

/** How the child answers at an obstacle (see gestures.ts). */
export type Gesture = 'bash' | 'chop' | 'grab' | 'jump';

export type ObstacleKind = 'rocks' | 'ice' | 'vines' | 'web' | 'door' | 'log' | 'river' | 'lava' | 'bats' | 'coconut';

/** How the targets are placed on screen for an obstacle (see puzzles.ts). */
export type TargetLayout = 'mid' | 'hang' | 'floor' | 'high';

export interface ObstacleDef {
  kind: ObstacleKind;
  name: string;
  /** Emoji on the maze. */
  icon: string;
  gesture: Gesture;
  layout: TargetLayout;
  /** Short instruction shown big when the puzzle opens. */
  instruction: string;
  /** Picture for the instruction (what to do with your body). */
  move: string;
  /** Answer target picture (the thing you hit / grab / jump on). */
  target: string;
  /** Shown on the target once it's the right one. */
  burst: string;
  /** Said when the obstacle is cleared. */
  cleared: string;
}

export const OBSTACLES: Record<ObstacleKind, ObstacleDef> = {
  rocks: { kind: 'rocks', name: 'Rocky hill', icon: '⛰️', gesture: 'bash', layout: 'mid', instruction: 'Smash the right rock!', move: '👊', target: '🪨', burst: '💥', cleared: 'Smash! The rocks are gone!' },
  ice: { kind: 'ice', name: 'Ice wall', icon: '🧊', gesture: 'bash', layout: 'mid', instruction: 'Smash the right ice block!', move: '👊', target: '🧊', burst: '💦', cleared: 'Crash! The ice wall broke!' },
  vines: { kind: 'vines', name: 'Jungle vines', icon: '🌿', gesture: 'chop', layout: 'hang', instruction: 'Karate chop the right vine — swing down!', move: '🤚', target: '🌿', burst: '✂️', cleared: 'Chop chop! The jungle is open!' },
  web: { kind: 'web', name: 'Spider webs', icon: '🕸️', gesture: 'chop', layout: 'hang', instruction: 'Chop through the right web — swing down!', move: '🤚', target: '🕸️', burst: '✂️', cleared: 'Swish! The webs are cut!' },
  door: { kind: 'door', name: 'Locked door', icon: '🚪', gesture: 'grab', layout: 'mid', instruction: 'Grab the right key with both hands!', move: '🙌', target: '🔑', burst: '🔓', cleared: 'Click! The door is open!' },
  log: { kind: 'log', name: 'Fallen tree', icon: '🪵', gesture: 'grab', layout: 'mid', instruction: 'Lift the right log with both hands!', move: '🙌', target: '🪵', burst: '💪', cleared: 'Heave-ho! The tree is out of the way!' },
  river: { kind: 'river', name: 'Wide river', icon: '🌊', gesture: 'jump', layout: 'floor', instruction: 'Stand by the right stone and jump!', move: '🦘', target: '🪨', burst: '🦕', cleared: 'Splash! Across the river!' },
  lava: { kind: 'lava', name: 'Lava stream', icon: '🌋', gesture: 'jump', layout: 'floor', instruction: 'Stand by the right stone and jump — hot hot!', move: '🦘', target: '🪨', burst: '🦕', cleared: 'Hop hop! Over the hot lava!' },
  bats: { kind: 'bats', name: 'Bat cave', icon: '🦇', gesture: 'bash', layout: 'high', instruction: 'Reach up and bonk the right bat!', move: '🙋', target: '🦇', burst: '💨', cleared: 'Whoosh! The bats flew away!' },
  coconut: { kind: 'coconut', name: 'Coconut tree', icon: '🌴', gesture: 'bash', layout: 'high', instruction: 'Reach up and knock down the right coconut!', move: '🙋', target: '🥥', burst: '💥', cleared: 'Bonk! The coconuts fell down!' },
};
export const OBSTACLE_KINDS = Object.keys(OBSTACLES) as ObstacleKind[];

/** Obstacles per game; one right answer clears each. */
export const OBSTACLES_PER_GAME = 8;
export const ANSWERS_PER_OBSTACLE = 1;

export interface PlacedObstacle {
  kind: ObstacleKind;
  /** Index into the path of the cell the obstacle blocks. */
  at: number;
}

export interface DinoLevel {
  maze: Maze;
  path: Cell[];
  obstacles: PlacedObstacle[];
}

/** Maze size: wide for a TV. */
export const MAZE_COLS = 11;
export const MAZE_ROWS = 6;

/**
 * A new game: a maze from the top-left (Mom) to the bottom-right (the babies' nest), and `count`
 * different obstacles in a random order, spread evenly along the way.
 */
export function makeDinoLevel(rng: Rng = Math.random, count = OBSTACLES_PER_GAME, cols = MAZE_COLS, rows = MAZE_ROWS): DinoLevel {
  const n = Math.min(count, OBSTACLE_KINDS.length);
  let maze = generateMaze(cols, rows, rng);
  let path = solve(maze, { x: 0, y: 0 }, { x: cols - 1, y: rows - 1 });
  // A long enough way that every obstacle has walking before and after it (a few tries is plenty).
  for (let i = 0; i < 30 && path.length < n * 3 + 2; i++) {
    maze = generateMaze(cols, rows, rng);
    path = solve(maze, { x: 0, y: 0 }, { x: cols - 1, y: rows - 1 });
  }
  const kinds = shuffle(OBSTACLE_KINDS, rng).slice(0, n);
  const obstacles = kinds.map((kind, k) => ({ kind, at: Math.round(((k + 1) * (path.length - 1)) / (n + 1)) }));
  return { maze, path, obstacles };
}

/**
 * Where Mom walks next from path index `from`, with `cleared` obstacles behind her: up to the cell
 * before the next obstacle, or (all cleared) to the nest.
 */
export function nextStop(level: DinoLevel, from: number, cleared: number): { to: number; obstacle: number } {
  if (cleared >= level.obstacles.length) return { to: level.path.length - 1, obstacle: -1 };
  return { to: Math.max(from, level.obstacles[cleared].at - 1), obstacle: cleared };
}
