// Sticker collection: original emoji stickers in themed pages. Rare/epic ones come from great rounds.
export type Rarity = 'common' | 'rare' | 'epic';

export interface Sticker {
  id: string;
  emoji: string;
  name: string;
  page: string;
  rarity: Rarity;
}

const PAGES: { page: string; title: string; items: [string, string, Rarity][] }[] = [
  {
    page: 'animals', title: 'Animal Friends',
    items: [['🐶', 'Puppy', 'common'], ['🐱', 'Kitty', 'common'], ['🐰', 'Bunny', 'common'], ['🐼', 'Panda', 'common'], ['🐨', 'Koala', 'common'], ['🦊', 'Fox', 'common'], ['🐯', 'Tiger', 'common'], ['🐘', 'Elephant', 'common'], ['🦒', 'Giraffe', 'rare'], ['🦚', 'Peacock', 'rare'], ['🦄', 'Unicorn', 'epic'], ['🐉', 'Dragon', 'epic']],
  },
  {
    page: 'ocean', title: 'Under the Sea',
    items: [['🐠', 'Fish', 'common'], ['🐙', 'Octopus', 'common'], ['🦀', 'Crab', 'common'], ['🐢', 'Turtle', 'common'], ['🐬', 'Dolphin', 'common'], ['🐳', 'Whale', 'common'], ['🦭', 'Seal', 'rare'], ['🪼', 'Jellyfish', 'rare'], ['🦈', 'Shark', 'epic']],
  },
  {
    page: 'space', title: 'Space Trip',
    items: [['🚀', 'Rocket', 'common'], ['🌙', 'Moon', 'common'], ['⭐', 'Star', 'common'], ['🪐', 'Planet', 'common'], ['☄️', 'Comet', 'rare'], ['🛸', 'UFO', 'rare'], ['👩‍🚀', 'Astronaut', 'rare'], ['🌌', 'Galaxy', 'epic']],
  },
  {
    page: 'treats', title: 'Yummy Treats',
    items: [['🍎', 'Apple', 'common'], ['🍌', 'Banana', 'common'], ['🥭', 'Mango', 'common'], ['🍉', 'Watermelon', 'common'], ['🍦', 'Ice cream', 'common'], ['🍩', 'Donut', 'common'], ['🧁', 'Cupcake', 'rare'], ['🍫', 'Chocolate', 'rare'], ['🎂', 'Birthday cake', 'epic']],
  },
  {
    page: 'go', title: 'Let’s Go!',
    items: [['🚗', 'Car', 'common'], ['🚌', 'Bus', 'common'], ['🚂', 'Train', 'common'], ['🛺', 'Auto rickshaw', 'common'], ['🚲', 'Bike', 'common'], ['✈️', 'Plane', 'common'], ['🚁', 'Helicopter', 'rare'], ['⛵', 'Sailboat', 'rare'], ['🏎️', 'Race car', 'epic']],
  },
  {
    page: 'magic', title: 'Magic & Fun',
    items: [['🎈', 'Balloon', 'common'], ['🪁', 'Kite', 'common'], ['🧸', 'Teddy', 'common'], ['🎨', 'Paints', 'common'], ['🪄', 'Magic wand', 'rare'], ['🌈', 'Rainbow', 'rare'], ['🏰', 'Castle', 'rare'], ['👑', 'Crown', 'epic'], ['💎', 'Gem', 'epic']],
  },
];

export const STICKER_PAGES = PAGES.map(({ page, title }) => ({ page, title }));

export const STICKERS: Sticker[] = PAGES.flatMap(({ page, items }) =>
  items.map(([emoji, name, rarity]) => ({ id: `${page}-${name.toLowerCase().replace(/\s+/g, '-')}`, emoji, name, page, rarity })),
);

export const STICKER_BY_ID = new Map(STICKERS.map((s) => [s.id, s]));
