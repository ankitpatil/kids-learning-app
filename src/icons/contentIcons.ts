// I1b: every icon *name* the content refers to (words, stories, stickers, tracks…). Content stores
// Fluent Emoji names, not raw emoji; `npm run icons` loads this module (through Vite) to know which
// SVGs to bundle, and a test checks each name resolves to a bundled file.
import { WORDS, MAGIC_E, SENTENCES } from '../content/words';
import { ENDING_VERBS, ENDING_NOUNS } from '../content/endings';
import { STICKERS } from '../content/stickers';
import { THINGS } from '../content/wordProblems';
import { STORIES } from '../content/stories';
import { TRACKS } from '../engine/tracks';
import { LETTERS } from '../games/phonicsPop/letters';
import { TOPIC_ICONS } from '../games/stories/aiStory';
import { variantIconNames } from '../content/pictureVariants';
import { FAIR_THINGS } from '../content/money';
import { PET_FOODS, PET_KINDS, PET_OUTFITS } from '../content/pet';
import { GROUP_SNACKS, GROUP_FRIENDS } from '../content/groups';

/** Icon names used by each content source (for clear test failures). */
export function contentIconSources(): Record<string, string[]> {
  return {
    words: Object.values(WORDS).flat().map((w) => w.icon),
    magicE: MAGIC_E.flatMap((p) => [p.shortIcon, p.longIcon]),
    sentences: SENTENCES.map((s) => s.icon),
    endings: [...ENDING_VERBS, ...ENDING_NOUNS].map((e) => e.icon),
    stickers: STICKERS.map((s) => s.icon),
    wordProblems: THINGS.map((t) => t.icon),
    stories: STORIES.map((s) => s.icon),
    tracks: TRACKS.map((t) => t.icon),
    letters: Object.values(LETTERS).map((l) => l.icon),
    storyTopics: Object.values(TOPIC_ICONS),
    pictureVariants: variantIconNames(),
    fairThings: FAIR_THINGS.map((t) => t.icon),
    pet: [...PET_KINDS, ...PET_FOODS, ...PET_OUTFITS].map((x) => x.icon),
    groups: [...GROUP_SNACKS.map((s) => s.icon), ...GROUP_FRIENDS],
  };
}

export function contentIconNames(): string[] {
  return [...new Set(Object.values(contentIconSources()).flat())].sort();
}
