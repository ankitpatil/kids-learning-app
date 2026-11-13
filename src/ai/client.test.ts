import { describe, it, expect } from 'vitest';
import { createAiClient, createMockProvider, createProxyProvider, type AiProvider } from './client';
import { sanitizeRequest, redactIdentifiers, containsIdentifier, type AiRequest } from './request';
import { DEFAULT_AI_SETTINGS, loadAiSettings, saveAiSettings, normalizeProxyUrl, liveReady, type AiSettings } from './settings';

const ON: AiSettings = { enabled: true, proxyUrl: 'https://proxy.example.workers.dev/', passcode: 'mango42' };
const IDS = ['Riya', 'p_8f2k1q', 'Sam'];

function memKV() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe('settings', () => {
  it('are off by default and when storage is empty or broken', () => {
    expect(loadAiSettings(memKV())).toEqual(DEFAULT_AI_SETTINGS);
    expect(loadAiSettings(null).enabled).toBe(false);
    const kv = memKV();
    kv.setItem('ai-settings', '{not json');
    expect(loadAiSettings(kv)).toEqual(DEFAULT_AI_SETTINGS);
  });

  it('round-trip, and only enabled === true switches helpers on', () => {
    const kv = memKV();
    saveAiSettings(ON, kv);
    expect(loadAiSettings(kv)).toEqual(ON);
    kv.setItem('ai-settings', JSON.stringify({ ...ON, enabled: 'yes' }));
    expect(loadAiSettings(kv).enabled).toBe(false);
  });

  it('accept only https proxy URLs (or http localhost) without credentials', () => {
    expect(normalizeProxyUrl('https://a.workers.dev')).toBe('https://a.workers.dev/');
    expect(normalizeProxyUrl('http://localhost:8787')).toBe('http://localhost:8787/');
    expect(normalizeProxyUrl('http://a.workers.dev')).toBeNull();
    expect(normalizeProxyUrl('https://user:pw@a.workers.dev')).toBeNull();
    expect(normalizeProxyUrl('nope')).toBeNull();
    expect(normalizeProxyUrl('')).toBe('');
  });

  it('live only when on, configured and online', () => {
    expect(liveReady(ON, true)).toBe(true);
    expect(liveReady(ON, false)).toBe(false);
    expect(liveReady({ ...ON, enabled: false }, true)).toBe(false);
    expect(liveReady({ ...ON, passcode: '' }, true)).toBe(false);
    expect(liveReady({ ...ON, proxyUrl: '' }, true)).toBe(false);
  });
});

describe('privacy filter', () => {
  it('drops every field outside the whitelist (nickname, profile id, audio…)', () => {
    const raw = {
      kind: 'story', level: 3, patterns: ['cvc', 'digraphs', 'klingon'], topic: 'cricket', maxLines: 5, maxWordsPerLine: 7,
      nickname: 'Riya', profileId: 'p_8f2k1q', avatar: '🦊', recording: new Uint8Array([1, 2, 3]), stars: 12,
    };
    const clean = sanitizeRequest(raw)!;
    expect(clean).toEqual({ kind: 'story', level: 3, patterns: ['cvc', 'digraphs'], topic: 'cricket', maxLines: 5, maxWordsPerLine: 7 });
  });

  it('whitelists nested item fields too and clamps numbers / lengths', () => {
    const clean = sanitizeRequest({
      kind: 'why', subject: 'math', track: 'add10', level: 99,
      item: { question: 'What is 3 + 4?', answer: 7, picked: '6', profile: { nickname: 'Riya' } },
    });
    expect(clean).toEqual({ kind: 'why', subject: 'math', track: 'add10', level: 20, item: { question: 'What is 3 + 4?', answer: '7', picked: '6' } });
    const long = sanitizeRequest({ kind: 'why', subject: 'reading', track: 'cvc', level: 1, item: { question: 'x'.repeat(500), answer: 'cat' } }) as Extract<AiRequest, { kind: 'why' }>;
    expect(long.item.question.length).toBe(160);
  });

  it('rejects unknown kinds, topics, tracks and empty items', () => {
    expect(sanitizeRequest({ kind: 'chat', text: 'hi' })).toBeNull();
    expect(sanitizeRequest({ kind: 'story', level: 1, patterns: ['cvc'], topic: 'my house' })).toBeNull();
    expect(sanitizeRequest({ kind: 'story', level: 1, patterns: [], topic: 'space' })).toBeNull();
    expect(sanitizeRequest({ kind: 'why', subject: 'math', track: '../etc', level: 1, item: { question: 'q', answer: 'a' } })).toBeNull();
    expect(sanitizeRequest({ kind: 'why', subject: 'math', track: 'add10', level: 1, item: {} })).toBeNull();
    expect(sanitizeRequest(null)).toBeNull();
  });

  it('redacts nicknames and profile ids inside item text (whole words, any case)', () => {
    const req = sanitizeRequest({ kind: 'why', subject: 'math', track: 'wordProblems', level: 2, item: { question: 'riya has 5 mangoes. RIYA gets 3 more. Samosa?', answer: '8' } })!;
    const out = redactIdentifiers(req, IDS) as Extract<AiRequest, { kind: 'why' }>;
    expect(out.item.question).toBe('Kai has 5 mangoes. Kai gets 3 more. Samosa?');
    expect(containsIdentifier(JSON.stringify(out), IDS)).toBe(false);
    expect(containsIdentifier('{"q":"Riya has 5"}', IDS)).toBe(true);
    expect(containsIdentifier('{"q":"Samosa"}', IDS)).toBe(false);
  });

  it('ignores 1-letter nicknames so "a" and "I" survive', () => {
    expect(containsIdentifier('{"q":"I see a cat"}', ['A', 'I'])).toBe(false);
  });
});

describe('client', () => {
  const deps = (over: Partial<Parameters<typeof createAiClient>[0]> = {}) => ({
    settings: () => ON,
    online: () => true,
    identifiers: () => IDS,
    ...over,
  });

  it('uses the mock provider when helpers are off, unconfigured or offline', async () => {
    let proxied = 0;
    const proxy = (): AiProvider => ({ name: 'proxy', send: async () => (proxied++, { ok: true }) });
    for (const d of [deps({ settings: () => DEFAULT_AI_SETTINGS, proxy }), deps({ online: () => false, proxy }), deps({ settings: () => ({ ...ON, passcode: '' }), proxy })]) {
      const c = createAiClient(d);
      expect(c.isLive()).toBe(false);
      const r = await c.request({ kind: 'why', subject: 'math', track: 'add10', level: 1, item: { question: '3 + 4', answer: '7' } });
      expect(r).toMatchObject({ ok: true, source: 'mock' });
    }
    expect(proxied).toBe(0);
  });

  it('uses the proxy when on + online, and the proxy never sees identifiers', async () => {
    const sent: { url: string; headers: Record<string, string>; body: string }[] = [];
    const fetchImpl = async (url: string, init: { headers: Record<string, string>; body: string }) => {
      sent.push({ url, headers: init.headers, body: init.body });
      return { ok: true, status: 200, json: async () => ({ data: { text: 'Count on from 3.' } }) };
    };
    const c = createAiClient(deps({ proxy: (s) => createProxyProvider(s, fetchImpl) }));
    expect(c.isLive()).toBe(true);
    const r = await c.request({
      kind: 'why', subject: 'math', track: 'wordProblems', level: 2,
      item: { question: 'Sam has 3 mangoes and gets 4 more.', answer: '7' },
      // Fields a careless caller might add:
      ...({ nickname: 'Riya', profileId: 'p_8f2k1q' } as object),
    } as AiRequest);
    expect(r).toEqual({ ok: true, source: 'proxy', data: { text: 'Count on from 3.' } });
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe(ON.proxyUrl);
    expect(sent[0].headers['X-Family-Passcode']).toBe('mango42');
    expect(JSON.stringify(sent[0].headers)).not.toMatch(/key|authorization/i);
    for (const id of IDS) expect(sent[0].body.toLowerCase()).not.toContain(id.toLowerCase());
    expect(JSON.parse(sent[0].body)).toEqual({ kind: 'why', subject: 'math', track: 'wordProblems', level: 2, item: { question: 'Kai has 3 mangoes and gets 4 more.', answer: '7' } });
  });

  it('never sends a request it cannot clean', async () => {
    const mock = createMockProvider();
    const c = createAiClient(deps({ mock, settings: () => DEFAULT_AI_SETTINGS }));
    expect(await c.request({ kind: 'nope' } as unknown as AiRequest)).toEqual({ ok: false, reason: 'invalid' });
    expect(mock.calls).toHaveLength(0);
  });

  it('times out instead of making the child wait', async () => {
    const slow = createMockProvider({ delayMs: 5000 });
    const c = createAiClient(deps({ settings: () => DEFAULT_AI_SETTINGS, mock: slow }));
    const t0 = Date.now();
    const r = await c.request({ kind: 'ping' }, { timeoutMs: 30 });
    expect(r).toEqual({ ok: false, reason: 'timeout' });
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('reports http errors, network errors and malformed responses as failures', async () => {
    const mk = (fetchImpl: Parameters<typeof createProxyProvider>[1]) => createAiClient(deps({ proxy: (s) => createProxyProvider(s, fetchImpl) }));
    expect(await mk(async () => ({ ok: false, status: 401, json: async () => ({}) })).request({ kind: 'ping' })).toEqual({ ok: false, reason: 'http' });
    expect(await mk(async () => { throw new TypeError('Failed to fetch'); }).request({ kind: 'ping' })).toEqual({ ok: false, reason: 'network' });
    expect(await mk(async () => ({ ok: true, status: 200, json: async () => ({ nope: 1 }) })).request({ kind: 'ping' })).toEqual({ ok: false, reason: 'bad-response' });
    expect(await mk(async () => ({ ok: true, status: 200, json: async () => ({ data: { story: 'x' } }) })).request({ kind: 'story', level: 1, patterns: ['cvc'], topic: 'space', maxLines: 5, maxWordsPerLine: 6 })).toEqual({ ok: false, reason: 'bad-response' });
  });

  it('mock gives canned, well-formed responses for every kind', async () => {
    const c = createAiClient(deps({ settings: () => DEFAULT_AI_SETTINGS }));
    expect(await c.request({ kind: 'ping' })).toMatchObject({ ok: true, data: { ok: true } });
    const story = await c.request({ kind: 'story', level: 1, patterns: ['cvc'], topic: 'animals', maxLines: 5, maxWordsPerLine: 7 });
    expect(story.ok && story.data.story.lines.length).toBeGreaterThan(0);
    const why = await c.request({ kind: 'why', subject: 'reading', track: 'cvc', level: 1, item: { question: 'Tap cat', answer: 'cat' } });
    expect(why.ok && why.data.text).toBeTruthy();
  });
});
