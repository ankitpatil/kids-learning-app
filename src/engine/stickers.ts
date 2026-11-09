import { STICKERS, type Rarity, type Sticker } from '../content/stickers';

export type Rng = () => number;

/**
 * Pick the sticker for a finished round.
 * - great round (level up, or all first-try correct) → rare or epic
 * - otherwise common, with a small chance of rare
 * Unowned stickers are always preferred so the book keeps filling up; duplicates only once a tier is complete.
 */
export function pickSticker(owned: Record<string, number>, great: boolean, rng: Rng = Math.random): Sticker {
  let tiers: Rarity[];
  if (great) tiers = rng() < 0.3 ? ['epic', 'rare'] : ['rare', 'epic'];
  else tiers = rng() < 0.15 ? ['rare', 'common'] : ['common', 'rare'];

  for (const tier of tiers) {
    const unowned = STICKERS.filter((s) => s.rarity === tier && !owned[s.id]);
    if (unowned.length) return unowned[Math.floor(rng() * unowned.length)];
  }
  // Every sticker in those tiers is owned: try any unowned sticker, else a random one in the first tier.
  const anyUnowned = STICKERS.filter((s) => !owned[s.id]);
  if (anyUnowned.length) return anyUnowned[Math.floor(rng() * anyUnowned.length)];
  const pool = STICKERS.filter((s) => s.rarity === tiers[0]);
  return pool[Math.floor(rng() * pool.length)];
}

export function collectedCount(owned: Record<string, number>): number {
  return STICKERS.filter((s) => owned[s.id]).length;
}
