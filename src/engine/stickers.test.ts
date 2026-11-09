import { describe, it, expect } from 'vitest';
import { pickSticker, collectedCount } from './stickers';
import { STICKERS, STICKER_BY_ID } from '../content/stickers';

describe('stickers', () => {
  it('ids are unique', () => {
    expect(STICKER_BY_ID.size).toBe(STICKERS.length);
    expect(STICKERS.length).toBeGreaterThanOrEqual(50);
  });

  it('never gives a duplicate until every sticker is collected', () => {
    const owned: Record<string, number> = {};
    for (let i = 0; i < STICKERS.length; i++) {
      const s = pickSticker(owned, i % 4 === 0);
      expect(owned[s.id]).toBeUndefined();
      owned[s.id] = 1;
    }
    expect(collectedCount(owned)).toBe(STICKERS.length);
    expect(STICKER_BY_ID.has(pickSticker(owned, false).id)).toBe(true); // duplicates allowed now
  });

  it('great rounds give rare or epic while those remain', () => {
    for (let k = 0; k < 200; k++) expect(['rare', 'epic']).toContain(pickSticker({}, true).rarity);
  });

  it('normal rounds are mostly common', () => {
    let common = 0;
    for (let k = 0; k < 1000; k++) if (pickSticker({}, false).rarity === 'common') common++;
    expect(common).toBeGreaterThan(780);
  });
});
