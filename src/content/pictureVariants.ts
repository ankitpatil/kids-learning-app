// I2b: picture variety. Common pictures get 1–2 alternative icons — the OpenMoji drawing of the same
// thing (`om-…`) and/or a related Fluent icon (cat-face → cat). Keyed by the *main* icon name used in
// content (words, phonics letters, endings), so the same thing varies the same way in every game.
// An item picks one variant when it is made and keeps it (retries, hints and the answer check all use
// the item's `icon`). Rules for adding a variant: it must clearly show the same word, and never look like
// one of that word's `near` look-alikes (hat ≠ cap, boat ≠ boot). Tests check every variant is bundled
// and that no two different words share a picture. Left out after a look: OpenMoji shell, soap and
// delivery truck (hard to read at a glance).
export type Rng = () => number;

export const ICON_VARIANTS: Record<string, string[]> = {
  // Animals
  'cat-face': ['cat', 'om-cat-face'],
  'dog-face': ['dog', 'om-dog-face'],
  'pig-face': ['pig', 'om-pig-face'],
  'tiger-face': ['tiger', 'om-tiger-face'],
  'rabbit-face': ['rabbit', 'om-rabbit-face'],
  fish: ['tropical-fish', 'om-fish'],
  fox: ['om-fox'],
  duck: ['om-duck'],
  frog: ['om-frog'],
  crab: ['om-crab'],
  goat: ['om-goat'],
  ewe: ['om-ewe'],
  snail: ['om-snail'],
  honeybee: ['om-honeybee'],
  ant: ['om-ant'],
  lion: ['om-lion'],
  octopus: ['om-octopus'],
  jellyfish: ['om-jellyfish'],
  worm: ['om-worm'],
  zebra: ['om-zebra'],
  kangaroo: ['om-kangaroo'],
  // Things
  sun: ['sun-with-face', 'om-sun'],
  star: ['glowing-star', 'om-star'],
  bus: ['om-bus'],
  'top-hat': ['om-top-hat'],
  bed: ['om-bed'],
  'world-map': ['om-world-map'],
  'goal-net': ['om-goal-net'],
  'keycap-10': ['om-keycap-10'],
  'om-trash-bin': ['wastebasket'],
  ship: ['om-ship'],
  socks: ['om-socks'],
  'running-shoe': ['om-running-shoe'],
  chair: ['om-chair'],
  bathtub: ['om-bathtub'],
  'deciduous-tree': ['evergreen-tree', 'om-deciduous-tree'],
  drum: ['long-drum', 'om-drum'],
  'triangular-flag': ['chequered-flag', 'om-triangular-flag'],
  'one-oclock': ['alarm-clock', 'om-one-oclock'],
  'delivery-truck': ['pickup-truck'],
  kite: ['om-kite'],
  rose: ['om-rose'],
  bicycle: ['om-bicycle'],
  'birthday-cake': ['shortcake', 'om-birthday-cake'],
  airplane: ['small-airplane', 'om-airplane'],
  nose: ['om-nose'],
  'soft-ice-cream': ['om-soft-ice-cream'],
  'cloud-with-rain': ['om-cloud-with-rain'],
  sailboat: ['canoe', 'om-sailboat'],
  foot: ['om-foot'],
  ice: ['om-ice'],
  // Phonics letters
  'red-apple': ['green-apple', 'om-red-apple'],
  'nest-with-eggs': ['om-nest-with-eggs'],
  'crescent-moon': ['om-crescent-moon'],
  egg: ['om-egg'],
  umbrella: ['umbrella-with-rain-drops', 'om-umbrella'],
  minibus: ['om-minibus'],
  'yo-yo': ['om-yo-yo'],
  crown: ['om-crown'],
  // Endings (verbs)
  'teddy-bear': ['om-teddy-bear'],
  'person-walking': ['person-walking-facing-right', 'om-person-walking'],
  cooking: ['om-cooking'],
  'artist-palette': ['om-artist-palette'],
  'person-climbing': ['om-person-climbing'],
  'sleeping-face': ['om-sleeping-face'],
  'face-with-tears-of-joy': ['rolling-on-the-floor-laughing', 'om-face-with-tears-of-joy'],
  'soccer-ball': ['om-soccer-ball'],
  handshake: ['om-handshake'],
};

/** All pictures for a main icon: the icon itself first, then its variants. */
export function iconVariants(icon: string): string[] {
  return [icon, ...(ICON_VARIANTS[icon] ?? [])];
}

/** One picture for a new item. Uses the rng only when there is a choice (keeps other items' sequences). */
export function pickIcon(icon: string, rng: Rng = Math.random): string {
  const all = iconVariants(icon);
  return all.length === 1 ? icon : all[Math.floor(rng() * all.length)];
}

/** Every variant icon (for bundling). */
export function variantIconNames(): string[] {
  return [...new Set(Object.values(ICON_VARIANTS).flat())];
}
