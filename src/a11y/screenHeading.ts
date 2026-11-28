/**
 * Hidden page heading (#30b). Most screens are pictures and big buttons with no visible title, so screen
 * readers (and Lighthouse's "page has a level-one heading") get a visually hidden <h1> naming the screen.
 * Screens that already draw their own <h1> return null so there is never a second one.
 */
import { HOP_TRACKS } from '../games/numberLine/generator';
import { WORD_TRACKS } from '../games/wordDetective/generator';

/** Screens that render their own visible <h1>. */
const OWN_H1 = new Set(['home', 'profiles', 'newProfile', 'tv', 'gate', 'settings', 'dashboard', 'voice']);

const NAMES: Record<string, string> = {
  count: 'Feed the Monster',
  missing: 'Feed the Monster',
  placeValue: 'Feed the Monster',
  compare2d: 'Feed the Monster',
  phonics: 'Phonics Pop',
  sightWords: 'Sight-Word Catch',
  endings: 'Word Builder',
  stories: 'Story Choose',
  wordProblems: 'Story Sums',
  money: 'Fun at the Fair',
  time: 'Tick Tock Clock',
  grouping: 'Snack Party',
  dino: 'Dinosaur Maze',
  pop: 'Pop the Answer',
  reward: 'Well done!',
  vault: 'Sticker book',
  pet: 'My pet',
  placement: 'Quick check',
};

const SUBJECT = { math: 'Math', reading: 'Reading' } as const;

export function screenHeading(screen: { name: string; subject?: 'math' | 'reading' }): string | null {
  const { name, subject } = screen;
  if (OWN_H1.has(name)) return null;
  if (name === 'levels') return `${SUBJECT[subject ?? 'math']} games`;
  if (name === 'map') return `${SUBJECT[subject ?? 'math']} island map`;
  if (name === 'startpoint') return `${SUBJECT[subject ?? 'math']}: where to start`;
  if ((HOP_TRACKS as readonly string[]).includes(name)) return 'Number Line Hop';
  if ((WORD_TRACKS as readonly string[]).includes(name)) return 'Word Detective';
  return NAMES[name] ?? 'Little Learners';
}

// Tiny store so App can publish the heading and the root can render it outside App's many early returns.
let current: string | null = null;
const listeners = new Set<() => void>();
export function setScreenHeading(text: string | null): void {
  if (text === current) return;
  current = text;
  listeners.forEach((l) => l());
}
export const getScreenHeading = (): string | null => current;
export function subscribeScreenHeading(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
