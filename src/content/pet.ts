// Avatar pet (#27a): pets to adopt, food to feed them and outfits to wear, bought with stars.
// Icons are bundled Fluent icon names (I1b). Prices are in stars: a round earns 1–4, so a snack
// costs about one round and an outfit a few rounds.

export interface PetKind {
  id: string;
  icon: string;
  name: string;
}

export interface PetFood {
  id: string;
  icon: string;
  name: string;
  cost: number;
  /** Hearts it fills (the pet has MAX_HEARTS). */
  hearts: number;
}

/** Where an outfit sits on the pet's face; one outfit per slot can be worn at a time. */
export type OutfitSlot = 'head' | 'eyes' | 'neck';

export interface PetOutfit {
  id: string;
  icon: string;
  name: string;
  cost: number;
  slot: OutfitSlot;
}

export const MAX_HEARTS = 5;

export const PET_KINDS: PetKind[] = [
  { id: 'puppy', icon: 'dog-face', name: 'Puppy' },
  { id: 'kitty', icon: 'cat-face', name: 'Kitty' },
  { id: 'bunny', icon: 'rabbit-face', name: 'Bunny' },
  { id: 'panda', icon: 'panda', name: 'Panda' },
  { id: 'hamster', icon: 'hamster', name: 'Hamster' },
  { id: 'dragon', icon: 'dragon-face', name: 'Dragon' },
];

export const PET_FOODS: PetFood[] = [
  { id: 'apple', icon: 'red-apple', name: 'Apple', cost: 2, hearts: 1 },
  { id: 'banana', icon: 'banana', name: 'Banana', cost: 2, hearts: 1 },
  { id: 'carrot', icon: 'carrot', name: 'Carrot', cost: 2, hearts: 1 },
  { id: 'mango', icon: 'mango', name: 'Mango', cost: 3, hearts: 2 },
  { id: 'cookie', icon: 'cookie', name: 'Cookie', cost: 3, hearts: 2 },
  { id: 'momo', icon: 'dumpling', name: 'Momo', cost: 4, hearts: 2 },
  { id: 'ice-cream', icon: 'soft-ice-cream', name: 'Ice cream', cost: 4, hearts: 2 },
  { id: 'cake', icon: 'birthday-cake', name: 'Cake', cost: 6, hearts: 3 },
];

export const PET_OUTFITS: PetOutfit[] = [
  { id: 'bow', icon: 'ribbon', name: 'Bow', cost: 8, slot: 'head' },
  { id: 'cap', icon: 'billed-cap', name: 'Cap', cost: 10, slot: 'head' },
  { id: 'tie', icon: 'necktie', name: 'Tie', cost: 10, slot: 'neck' },
  { id: 'glasses', icon: 'glasses', name: 'Glasses', cost: 12, slot: 'eyes' },
  { id: 'scarf', icon: 'scarf', name: 'Scarf', cost: 12, slot: 'neck' },
  { id: 'sunglasses', icon: 'sunglasses', name: 'Sunglasses', cost: 15, slot: 'eyes' },
  { id: 'sun-hat', icon: 'womans-hat', name: 'Sun hat', cost: 15, slot: 'head' },
  { id: 'top-hat', icon: 'top-hat', name: 'Top hat', cost: 20, slot: 'head' },
  { id: 'grad-cap', icon: 'graduation-cap', name: 'Smart cap', cost: 25, slot: 'head' },
  { id: 'crown', icon: 'crown', name: 'Crown', cost: 30, slot: 'head' },
];

export const PET_KIND_BY_ID = new Map(PET_KINDS.map((k) => [k.id, k]));
export const PET_FOOD_BY_ID = new Map(PET_FOODS.map((f) => [f.id, f]));
export const PET_OUTFIT_BY_ID = new Map(PET_OUTFITS.map((o) => [o.id, o]));
