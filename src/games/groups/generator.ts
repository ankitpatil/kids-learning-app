// #28 Snack Party (grouping track): early × and ÷ with equal groups (CBSE Class 2 "Grouping and
// Sharing", US Grade 2 2.OA.3–4). Four kinds of item:
//   all    : 3 plates, 4 snacks on each → how many in all? (equal groups, skip counting)
//   each   : share 12 snacks with 3 friends → how many each? (sharing = ÷ by number of groups)
//   plates : 12 snacks, 3 on each plate → how many plates? (grouping = ÷ by group size)
//   sum    : "4 groups of 3", 3 + 3 + 3 + 3 = ? (repeated addition, numbers only)
// Ids are `group-<kind>-<groups>x<size>` (groups = plates/friends, size = snacks on each).
import { getLevel } from '../../engine/tracks';
import { numberWord } from '../../engine/numberWords';
import { GROUP_SNACKS, GROUP_FRIENDS, type Snack } from '../../content/groups';

export type Rng = () => number;
export type GroupKind = 'all' | 'each' | 'plates' | 'sum';
export const GROUP_TRACK = 'grouping';

export interface GroupItem {
  id: string;
  kind: GroupKind;
  /** Number of plates / friends. */
  groups: number;
  /** Snacks on each plate. */
  size: number;
  total: number;
  answer: number;
  /** Number choices including the answer. */
  choices: number[];
  snack: Snack;
  /** Friend face icons (one per group) for 'each'. */
  friends: string[];
  /** Level help shown from the start: count on each plate ('all'), the pile dealt in rows ('each'). */
  scaffold: boolean;
}

interface LevelRule {
  kinds: GroupKind[];
  groups: [number, number];
  sizes: number[];
  maxTotal: number;
  minTotal: number;
}

/** What each level of the grouping track asks (index = level; see TRACKS in engine/tracks). */
export const GROUP_RULES: LevelRule[] = [
  { kinds: ['all'], groups: [2, 3], sizes: [2, 3, 4], maxTotal: 12, minTotal: 4 },
  { kinds: ['each'], groups: [2, 3], sizes: [2, 3, 4], maxTotal: 12, minTotal: 4 },
  { kinds: ['all'], groups: [2, 5], sizes: [2, 5, 10], maxTotal: 20, minTotal: 4 },
  { kinds: ['each', 'plates'], groups: [2, 5], sizes: [2, 3, 4, 5], maxTotal: 20, minTotal: 6 },
  { kinds: ['sum'], groups: [2, 5], sizes: [2, 3, 4, 5], maxTotal: 20, minTotal: 4 },
];

/** After two misses: two small plates of the same kind (sums become pictures of plates). */
const EASE_RULE: Omit<LevelRule, 'kinds'> = { groups: [2, 2], sizes: [2, 3], maxTotal: 6, minTotal: 4 };

function int(rng: Rng, lo: number, hi: number) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function ruleFor(level: number): LevelRule {
  return GROUP_RULES[Math.max(0, Math.min(level, GROUP_RULES.length - 1))];
}

function fits(rule: Omit<LevelRule, 'kinds'>, groups: number, size: number): boolean {
  const t = groups * size;
  return groups >= rule.groups[0] && groups <= rule.groups[1] && rule.sizes.includes(size) && t <= rule.maxTotal && t >= rule.minTotal;
}

/** Every (groups, size) pair a level can ask. */
export function pairsFor(rule: Omit<LevelRule, 'kinds'>): [number, number][] {
  const out: [number, number][] = [];
  for (let g = rule.groups[0]; g <= rule.groups[1]; g++) for (const s of rule.sizes) if (fits(rule, g, s)) out.push([g, s]);
  return out;
}

export const answerOf = (kind: GroupKind, groups: number, size: number) =>
  kind === 'each' ? size : kind === 'plates' ? groups : groups * size;

export const groupId = (kind: GroupKind, groups: number, size: number) => `group-${kind}-${groups}x${size}`;

/**
 * Wrong choices.
 *  near : the classic slips — one group more/less (12 → 8, 16), off by one, adding the two numbers
 *         instead (3 plates of 4 → 7), and for sharing the other number (12 with 3 friends → 3, not 4).
 *  far  : numbers at least 3 away.
 */
export function groupDistractors(kind: GroupKind, groups: number, size: number, near: boolean, count: number, rng: Rng): number[] {
  const answer = answerOf(kind, groups, size);
  const total = groups * size;
  const out: number[] = [];
  const add = (n: number) => {
    if (out.length >= count || !Number.isInteger(n) || n < 1 || n === answer || out.includes(n)) return;
    out.push(n);
  };
  if (near) {
    const cands =
      kind === 'each'
        ? [groups, size + 1, size - 1, total]
        : kind === 'plates'
          ? [size, groups + 1, groups - 1, total]
          : [total + size, total - size, groups + size, total + 1, total - 1];
    // The commonest slip first (sharing: the other number; groups: add instead of multiply / one group off).
    if (kind === 'each' || kind === 'plates') add(cands[0]);
    for (const c of shuffle(cands, rng)) add(c);
  }
  const hi = Math.max(answer + 6, 10);
  for (let guard = 0; out.length < count && guard < 200; guard++) {
    const n = int(rng, 1, hi);
    if (Math.abs(n - answer) < 3) continue;
    add(n);
  }
  return out;
}

/**
 * Read a logged id back (#25-style spaced review), checked against the level it's asked at: a kind
 * the level asks and numbers in its range. Undefined otherwise (e.g. an eased item logged at a higher level).
 */
export function parseGroupId(itemId: string, level: number): { kind: GroupKind; groups: number; size: number } | undefined {
  const m = /^group-(all|each|plates|sum)-(\d{1,2})x(\d{1,2})$/.exec(itemId);
  if (!m) return undefined;
  const kind = m[1] as GroupKind;
  const groups = +m[2], size = +m[3];
  const rule = ruleFor(level);
  if (!rule.kinds.includes(kind) || !fits(rule, groups, size)) return undefined;
  return { kind, groups, size };
}

/**
 * One item. `ease` = two small plates (after two misses). `avoid` = the previous id (no repeats).
 * `want` = an id to ask again with a new snack and fresh choices; ignored unless it fits the level.
 */
export function makeGroupItem(level: number, rng: Rng = Math.random, ease = false, avoid?: string, want?: string): GroupItem {
  const cfg = getLevel(GROUP_TRACK, level);
  const rule = ruleFor(level);
  const wanted = want && !ease ? parseGroupId(want, level) : undefined;
  const pairs = pairsFor(ease ? EASE_RULE : rule);
  let kind: GroupKind = wanted?.kind ?? rule.kinds[int(rng, 0, rule.kinds.length - 1)];
  if (ease && kind === 'sum') kind = 'all';
  let [groups, size] = wanted ? [wanted.groups, wanted.size] : pairs[int(rng, 0, pairs.length - 1)];
  for (let i = 0; !wanted && i < 8 && groupId(kind, groups, size) === avoid; i++) [groups, size] = pairs[int(rng, 0, pairs.length - 1)];
  const near = !ease && cfg.distractors === 'near';
  const answer = answerOf(kind, groups, size);
  const choices = shuffle([answer, ...groupDistractors(kind, groups, size, near, 2, rng)], rng);
  const snack = GROUP_SNACKS[int(rng, 0, GROUP_SNACKS.length - 1)];
  const friends = shuffle(GROUP_FRIENDS, rng).slice(0, groups);
  return {
    id: groupId(kind, groups, size),
    kind,
    groups,
    size,
    total: groups * size,
    answer,
    choices,
    snack,
    friends,
    scaffold: ease || cfg.scaffold,
  };
}

const n = numberWord;
const noun = (it: GroupItem, count: number) => (count === 1 ? it.snack.one : it.snack.many);

/** Spoken prompt ("|" = short pause). */
export function groupPrompt(it: GroupItem): string {
  const s = it.snack;
  switch (it.kind) {
    case 'all':
      return `${n(it.groups)} plates. | ${n(it.size)} ${noun(it, it.size)} on each plate. | How many ${s.many} in all?`;
    case 'each':
      return `Share ${n(it.total)} ${s.many} with ${n(it.groups)} friends. | Everyone gets the same. | How many does each friend get?`;
    case 'plates':
      return `${n(it.total)} ${s.many}. | Put ${n(it.size)} on each plate. | How many plates do we need?`;
    case 'sum':
      return `${n(it.groups)} groups of ${n(it.size)}. | How many in all?`;
  }
}

/** Short text shown on screen (numbers as digits). */
export function groupCaption(it: GroupItem): string {
  switch (it.kind) {
    case 'all':
      return `${it.groups} plates, ${it.size} on each`;
    case 'each':
      return `${it.total} for ${it.groups} friends`;
    case 'plates':
      return `${it.total}, ${it.size} on each plate`;
    case 'sum':
      return `${it.groups} groups of ${it.size}`;
  }
}

/** "3 + 3 + 3 + 3 = ?" for sums. */
export function repeatedSum(it: Pick<GroupItem, 'groups' | 'size'>): string {
  return `${Array.from({ length: it.groups }, () => it.size).join(' + ')} = ?`;
}

/** Running totals for skip counting, one per group, ending at the total: 4 plates of 3 → [3, 6, 9, 12]. */
export function skipCounts(size: number, groups: number): number[] {
  return Array.from({ length: groups }, (_, i) => (i + 1) * size);
}

/**
 * Canned hint after a miss. Never says the answer: it names the strategy (count by 4s, deal one at a
 * time, make groups and count them); the picture then shows the help (running counts, dealt plates, groups).
 */
export function groupHint(it: GroupItem): string {
  switch (it.kind) {
    case 'all':
    case 'sum':
      return `Count by ${n(it.size)}s. | One ${it.kind === 'all' ? 'plate' : 'group'}, ${n(it.size)}. | Then count on for each one!`;
    case 'each':
      return 'Give one to each friend, again and again, until they are all gone. | Then count one plate!';
    case 'plates':
      // Name the size unless it is also the answer (9 in 3s = 3 plates).
      return it.size === it.groups ? 'Fill one plate, then the next, until they are all used. | Then count the plates!' : `Make groups of ${n(it.size)}. | Then count the groups!`;
  }
}

/** Praise after a right answer. */
export function groupPraise(it: GroupItem): string {
  switch (it.kind) {
    case 'all':
    case 'sum':
      return `Yes! | ${n(it.groups)} groups of ${n(it.size)} is ${n(it.total)}!`;
    case 'each':
      return `Yes! | ${n(it.total)} shared by ${n(it.groups)} is ${n(it.size)} each!`;
    case 'plates':
      return `Yes! | ${n(it.total)} makes ${n(it.groups)} plates of ${n(it.size)}!`;
  }
}
