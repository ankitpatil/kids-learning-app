// Sticker collection: original emoji stickers (bundled icon names, I1b) in themed pages. Rare/epic ones come from great rounds.
export type Rarity = 'common' | 'rare' | 'epic';

export interface Sticker {
  id: string;
  icon: string;
  name: string;
  page: string;
  rarity: Rarity;
}

const PAGES: { page: string; title: string; items: [string, string, Rarity][] }[] = [
  {
    page: 'animals', title: 'Animal Friends',
    items: [['dog-face', 'Puppy', 'common'], ['cat-face', 'Kitty', 'common'], ['rabbit-face', 'Bunny', 'common'], ['panda', 'Panda', 'common'], ['koala', 'Koala', 'common'], ['fox', 'Fox', 'common'], ['tiger-face', 'Tiger', 'common'], ['elephant', 'Elephant', 'common'], ['giraffe', 'Giraffe', 'rare'], ['peacock', 'Peacock', 'rare'], ['unicorn', 'Unicorn', 'epic'], ['dragon', 'Dragon', 'epic']],
  },
  {
    page: 'ocean', title: 'Under the Sea',
    items: [['tropical-fish', 'Fish', 'common'], ['octopus', 'Octopus', 'common'], ['crab', 'Crab', 'common'], ['turtle', 'Turtle', 'common'], ['dolphin', 'Dolphin', 'common'], ['spouting-whale', 'Whale', 'common'], ['seal', 'Seal', 'rare'], ['jellyfish', 'Jellyfish', 'rare'], ['shark', 'Shark', 'epic']],
  },
  {
    page: 'space', title: 'Space Trip',
    items: [['rocket', 'Rocket', 'common'], ['crescent-moon', 'Moon', 'common'], ['star', 'Star', 'common'], ['ringed-planet', 'Planet', 'common'], ['comet', 'Comet', 'rare'], ['flying-saucer', 'UFO', 'rare'], ['woman-astronaut', 'Astronaut', 'rare'], ['milky-way', 'Galaxy', 'epic']],
  },
  {
    page: 'treats', title: 'Yummy Treats',
    items: [['red-apple', 'Apple', 'common'], ['banana', 'Banana', 'common'], ['mango', 'Mango', 'common'], ['watermelon', 'Watermelon', 'common'], ['soft-ice-cream', 'Ice cream', 'common'], ['doughnut', 'Donut', 'common'], ['cupcake', 'Cupcake', 'rare'], ['chocolate-bar', 'Chocolate', 'rare'], ['birthday-cake', 'Birthday cake', 'epic']],
  },
  {
    page: 'go', title: 'Let’s Go!',
    items: [['automobile', 'Car', 'common'], ['bus', 'Bus', 'common'], ['locomotive', 'Train', 'common'], ['auto-rickshaw', 'Auto rickshaw', 'common'], ['bicycle', 'Bike', 'common'], ['airplane', 'Plane', 'common'], ['helicopter', 'Helicopter', 'rare'], ['sailboat', 'Sailboat', 'rare'], ['racing-car', 'Race car', 'epic']],
  },
  {
    page: 'magic', title: 'Magic & Fun',
    items: [['balloon', 'Balloon', 'common'], ['kite', 'Kite', 'common'], ['teddy-bear', 'Teddy', 'common'], ['artist-palette', 'Paints', 'common'], ['magic-wand', 'Magic wand', 'rare'], ['rainbow', 'Rainbow', 'rare'], ['castle', 'Castle', 'rare'], ['crown', 'Crown', 'epic'], ['gem-stone', 'Gem', 'epic']],
  },
];

export const STICKER_PAGES = PAGES.map(({ page, title }) => ({ page, title }));

export const STICKERS: Sticker[] = PAGES.flatMap(({ page, items }) =>
  items.map(([icon, name, rarity]) => ({ id: `${page}-${name.toLowerCase().replace(/\s+/g, '-')}`, icon, name, page, rarity })),
);

export const STICKER_BY_ID = new Map(STICKERS.map((s) => [s.id, s]));
