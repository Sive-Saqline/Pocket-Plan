import type { ConfigService } from '@nestjs/config';
import { AiError, type AiRequest } from './ai.provider';
import { GeminiProvider } from './gemini.provider';

const request: AiRequest = { system: 's', prompt: 'p', schema: {} };

const provider = (env: Record<string, string>) =>
  new GeminiProvider({
    get: (k: string) => env[k],
  } as unknown as ConfigService);

const answer = (text: string, status = 200) =>
  new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status },
  );

const reasonOf = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (err) {
    return err instanceof AiError ? err.reason : err;
  }
  return 'resolved';
};

// No real network: fetch is replaced in every test.
describe('GeminiProvider', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('without a key, fails as not_configured and never calls out', async () => {
    expect(await reasonOf(provider({}).generateJson(request))).toBe(
      'not_configured',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the key in a header (never the URL) and parses the JSON answer', async () => {
    fetchMock.mockResolvedValue(answer('{"amount":120}'));
    const out = await provider({
      GEMINI_API_KEY: 'k-123',
      AI_MODEL: 'gemini-2.5-flash',
    }).generateJson(request);
    expect(out).toEqual({ amount: 120 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/models/gemini-2.5-flash:generateContent');
    expect(url).not.toContain('k-123');
    expect(init.headers['x-goog-api-key']).toBe('k-123');
    const body = JSON.parse(init.body);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });

  it('maps a rate limit to busy', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 429 }));
    expect(
      await reasonOf(provider({ GEMINI_API_KEY: 'k' }).generateJson(request)),
    ).toBe('busy');
  });

  it('maps other HTTP errors, network errors and non-JSON answers to failed', async () => {
    const p = provider({ GEMINI_API_KEY: 'k' });
    fetchMock.mockResolvedValueOnce(new Response('bad', { status: 400 }));
    expect(await reasonOf(p.generateJson(request))).toBe('failed');
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    expect(await reasonOf(p.generateJson(request))).toBe('failed');
    fetchMock.mockResolvedValueOnce(answer('not json'));
    expect(await reasonOf(p.generateJson(request))).toBe('failed');
  });

  it('gives up after AI_TIMEOUT_MS', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal!.addEventListener('abort', () =>
            reject(init.signal!.reason),
          ),
        ),
    );
    expect(
      await reasonOf(
        provider({ GEMINI_API_KEY: 'k', AI_TIMEOUT_MS: '20' }).generateJson(
          request,
        ),
      ),
    ).toBe('timeout');
  });
});
