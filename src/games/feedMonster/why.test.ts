import { describe, it, expect } from 'vitest';
import { makeFeedItem, makePlaceValueItem, FEED_TRACKS } from './generator';
import { makeCompareItem } from './compare';
import { feedWhyContext, type FeedGameItem } from './why';
import { maxLevel } from '../../engine/tracks';
import { whyRequest, leaksAnswer, fetchWhyHint } from '../../ai/whyHint';
import { createAiClient, createMockProvider } from '../../ai/client';
import { sanitizeRequest } from '../../ai/request';
import { numberWord } from '../../engine/numberWords';

function items(): { it: FeedGameItem; level: number }[] {
  const out: { it: FeedGameItem; level: number }[] = [];
  for (let n = 0; n < 25; n++) {
    for (const t of FEED_TRACKS) for (let l = 0; l <= maxLevel(t); l++) out.push({ it: makeFeedItem(t, l, Math.random, n % 5 === 0), level: l });
    for (let l = 0; l <= maxLevel('placeValue'); l++) out.push({ it: makePlaceValueItem(l, Math.random, n % 5 === 0), level: l });
    for (let l = 0; l <= maxLevel('compare2d'); l++) out.push({ it: makeCompareItem(l, Math.random, n % 5 === 0), level: l });
  }
  return out;
}

describe('feedWhyContext (AI3b)', () => {
  it('covers every mode: number to find, never in the question, passes the whitelist', () => {
    const tracks = new Set<string>();
    const modes = new Set<string>();
    for (const { it, level } of items()) {
      tracks.add(it.trackId);
      modes.add(`${it.trackId}:${it.mode}`);
      const picked = it.trackId === 'placeValue' && it.mode === 'feed' ? { boxes: 1, loose: 2 } : 3;
      const ctx = feedWhyContext(it, level, picked);
      expect(ctx.subject).toBe('math');
      expect(ctx.answer).toBe(it.need);
      expect(typeof ctx.answer).toBe('number');
      // The question never states the number the child must find (as digits or words), unless
      // it happens to equal a number the child is shown (5 + ? = 10) — or in compare, where
      // both plates' numbers are the question itself.
      const shown = 'have' in it && it.have > 0 ? [it.have, it.total] : [];
      if (it.trackId !== 'compare2d' && !shown.includes(it.need)) expect(leaksAnswer(ctx.question, ctx)).toBe(false);
      else expect(ctx.question).toContain(String(it.need));
      const req = sanitizeRequest(whyRequest(ctx));
      expect(req).toMatchObject({ kind: 'why', subject: 'math', track: it.trackId, level: level + 1 });
      expect(req && req.kind === 'why' && req.item.question).toBe(ctx.question); // not truncated
    }
    expect([...tracks].sort()).toEqual(['compare2d', 'count', 'missing', 'placeValue']);
    expect(modes).toEqual(new Set(['count:feed', 'missing:feed', 'missing:choose', 'placeValue:feed', 'placeValue:choose', 'compare2d:choose']));
  });

  it('a Claude hint that names the number falls back to the canned hint', async () => {
    const it = makeFeedItem('missing', maxLevel('missing'));
    const ctx = feedWhyContext(it, maxLevel('missing'), 1);
    const live = (text: string) =>
      createAiClient({
        settings: () => ({ enabled: true, proxyUrl: 'https://proxy.example.workers.dev/', passcode: 'mango42' }),
        online: () => true,
        identifiers: () => [],
        proxy: () => createMockProvider({ responses: { why: { text } } }),
      });
    const leak = await fetchWhyHint(ctx, 'canned', live(`You need ${numberWord(it.need)} more.`));
    expect(leak).toMatchObject({ source: 'builtin', text: 'canned' });
    const good = await fetchWhyHint(ctx, 'canned', live('Count on from the cookies it has. Stop when you reach the total.'));
    expect(good.source).toBe('claude');
  });
});
