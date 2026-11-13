// Words a generated story, question or hint must never contain (AI2/AI3). Checked as whole words,
// case-insensitive, with simple plural / -ed / -ing endings. Built-in content is checked too.
// Kept broad (a false alarm only means a built-in story is used instead), but everyday words a
// story needs stay allowed: hit/kick (cricket, football), bite/drink (food), lost (a lost hat),
// fire (a campfire), monster (Feed the Monster).
export const BLOCKED_WORDS = [
  // violence / harm
  'kill', 'dead', 'die', 'died', 'dying', 'death', 'blood', 'bloody', 'gun', 'shoot',
  'knife', 'knives', 'stab', 'sword', 'bomb', 'war', 'fight', 'punch', 'hurt', 'pain', 'bleed',
  'murder', 'weapon', 'attack', 'poison', 'choke', 'drown', 'burn', 'wound', 'slap',
  // scary
  'scary', 'scream', 'ghost', 'devil', 'demon', 'zombie', 'witch', 'hell', 'grave', 'skull', 'nightmare',
  'kidnap', 'stranger', 'trapped',
  // unkind
  'hate', 'stupid', 'dumb', 'idiot', 'ugly', 'fool', 'loser', 'jerk', 'nasty', 'bully',
  // adult topics
  'sex', 'sexy', 'kiss', 'naked', 'nude', 'beer', 'wine', 'drunk', 'drug', 'smoke', 'cigar', 'vape',
  'pill', 'casino', 'gamble',
  // swearing (mild ones included on purpose)
  'damn', 'darn', 'crap', 'heck', 'butt', 'poop', 'pee', 'fart', 'suck', 'god',
  // body/medical worries
  'sick', 'vomit', 'hospital', 'cancer',
] as const;

const BLOCK = new Set<string>(BLOCKED_WORDS);

function stem(w: string): string[] {
  const out = [w];
  if (w.endsWith('s')) out.push(w.slice(0, -1));
  if (w.endsWith('es')) out.push(w.slice(0, -2));
  if (w.endsWith('ed')) out.push(w.slice(0, -2), w.slice(0, -1));
  if (w.endsWith('ing')) out.push(w.slice(0, -3), `${w.slice(0, -3)}e`);
  // doubled consonant: hitting → hit, shooting handled above
  if (/(.)\1(ed|ing)$/.test(w)) out.push(w.replace(/(.)\1(ed|ing)$/, '$1'));
  return out;
}

/** Blocked words found in `text` (lower-case, unique). Empty = OK. */
export function blockedWords(text: string, allow: ReadonlySet<string> = new Set()): string[] {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const found = words.filter((w) => stem(w).some((s) => BLOCK.has(s) && !allow.has(s)));
  return [...new Set(found)];
}
