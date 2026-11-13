// Claude helpers client. Two providers behind one interface:
//  - `mock`: canned responses. Used in tests and whenever helpers are off, unconfigured or offline.
//  - `proxy`: POST to the family proxy (proxy/worker.js), which holds the API key server-side.
// The browser never holds an API key. Every request is rebuilt from whitelisted fields, scrubbed
// of nicknames / profile ids, and checked once more as the exact JSON that would be sent.
// Callers still validate every response before a child sees it (AI2/AI3) and fall back to
// built-in content on any failure.
import { STORIES, type Story } from '../content/stories';
import { sanitizeRequest, redactIdentifiers, containsIdentifier, type AiRequest } from './request';
import { liveReady, type AiSettings } from './settings';

/** Story as returned by a provider (validated by the caller before use). */
export type AiStory = Pick<Story, 'title' | 'lines' | 'questions'>;

export interface AiResponseMap {
  ping: { ok: true };
  story: { story: AiStory };
  why: { text: string };
}

export type AiResult<K extends AiRequest['kind']> =
  | { ok: true; source: 'mock' | 'proxy'; data: AiResponseMap[K] }
  | { ok: false; reason: 'invalid' | 'identifier' | 'timeout' | 'http' | 'network' | 'bad-response' };

export interface AiProvider {
  name: 'mock' | 'proxy';
  /** Resolves with the raw JSON `data`, or throws. */
  send(req: AiRequest, signal: AbortSignal): Promise<unknown>;
}

const CANNED_STORY: AiStory = (() => {
  const s = STORIES.find((x) => x.pattern === 'cvc')!;
  return { title: s.title, lines: s.lines, questions: s.questions };
})();

export function createMockProvider(opts: { responses?: Partial<{ [K in AiRequest['kind']]: unknown }>; delayMs?: number; fail?: boolean } = {}): AiProvider & { calls: AiRequest[] } {
  const calls: AiRequest[] = [];
  return {
    name: 'mock',
    calls,
    async send(req, signal) {
      calls.push(req);
      if (opts.delayMs) {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, opts.delayMs);
          signal.addEventListener('abort', () => {
            clearTimeout(t);
            reject(new DOMException('aborted', 'AbortError'));
          });
        });
      }
      if (opts.fail) throw new Error('mock failure');
      if (opts.responses && req.kind in opts.responses) return opts.responses[req.kind];
      if (req.kind === 'ping') return { ok: true };
      if (req.kind === 'story') return { story: CANNED_STORY };
      return { text: req.subject === 'math' ? 'Start at the bigger number. | Count on with your fingers.' : 'Say each sound slowly. | Then blend them together.' };
    },
  };
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export function createProxyProvider(settings: Pick<AiSettings, 'proxyUrl' | 'passcode'>, fetchImpl: FetchLike = (u, i) => fetch(u, i)): AiProvider {
  return {
    name: 'proxy',
    async send(req, signal) {
      const res = await fetchImpl(settings.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Family-Passcode': settings.passcode },
        body: JSON.stringify(req),
        signal,
      });
      if (!res.ok) throw Object.assign(new Error(`proxy ${res.status}`), { http: true });
      const json = (await res.json()) as { data?: unknown };
      if (!json || typeof json !== 'object' || !('data' in json)) throw Object.assign(new Error('bad response'), { badResponse: true });
      return json.data;
    },
  };
}

/** Minimal shape check per kind; content checks (decodability, no answer leak…) belong to callers. */
export function shapeOk(kind: AiRequest['kind'], data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (kind === 'ping') return d.ok === true;
  if (kind === 'why') return typeof d.text === 'string' && d.text.trim().length > 0;
  const s = d.story as Record<string, unknown> | undefined;
  return !!s && typeof s.title === 'string' && Array.isArray(s.lines) && Array.isArray(s.questions);
}

export interface AiClientDeps {
  settings: () => AiSettings;
  online?: () => boolean;
  /** Nicknames and profile ids on this device; never sent. */
  identifiers: () => string[] | Promise<string[]>;
  proxy?: (s: AiSettings) => AiProvider;
  mock?: AiProvider;
  defaultTimeoutMs?: number;
}

export function createAiClient(deps: AiClientDeps) {
  const online = deps.online ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  const mock = deps.mock ?? createMockProvider();
  const makeProxy = deps.proxy ?? ((s: AiSettings) => createProxyProvider(s));

  /** Whether live (proxy) helpers are available right now. UI shows ✨ buttons only when true. */
  const isLive = () => liveReady(deps.settings(), online());
  const provider = (): AiProvider => (isLive() ? makeProxy(deps.settings()) : mock);

  /** Exactly what would be sent for `raw`, or a failure reason. Exposed for tests. */
  async function prepare(raw: AiRequest): Promise<{ body: string; req: AiRequest } | { reason: 'invalid' | 'identifier' }> {
    const clean = sanitizeRequest(raw);
    if (!clean) return { reason: 'invalid' };
    const ids = await deps.identifiers();
    const req = redactIdentifiers(clean, ids);
    const body = JSON.stringify(req);
    if (containsIdentifier(body, ids)) return { reason: 'identifier' };
    return { body, req };
  }

  async function request<R extends AiRequest>(raw: R, opts: { timeoutMs?: number; provider?: AiProvider } = {}): Promise<AiResult<R['kind']>> {
    const prep = await prepare(raw);
    if ('reason' in prep) return { ok: false, reason: prep.reason };
    const p = opts.provider ?? provider();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? deps.defaultTimeoutMs ?? 2000);
    try {
      const data = await p.send(prep.req, ctrl.signal);
      if (!shapeOk(raw.kind, data)) return { ok: false, reason: 'bad-response' };
      return { ok: true, source: p.name, data: data as AiResponseMap[R['kind']] };
    } catch (e) {
      if (ctrl.signal.aborted) return { ok: false, reason: 'timeout' };
      const err = e as { http?: boolean; badResponse?: boolean };
      return { ok: false, reason: err.http ? 'http' : err.badResponse ? 'bad-response' : 'network' };
    } finally {
      clearTimeout(timer);
    }
  }

  return { isLive, provider, prepare, request };
}

export type AiClient = ReturnType<typeof createAiClient>;
