import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiError, AiProvider, type AiRequest } from './ai.provider';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = 10_000;
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
  }[];
}

/**
 * Google Gemini (AI Studio key). Settings, all in apps/api/.env:
 * - GEMINI_API_KEY (required; without it every call fails as not_configured)
 * - AI_MODEL (default gemini-2.5-flash)
 * - AI_TIMEOUT_MS (default 10000)
 */
@Injectable()
export class GeminiProvider extends AiProvider {
  private readonly logger = new Logger('AI');
  private readonly key: string | null;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    super();
    this.key = config.get<string>('GEMINI_API_KEY')?.trim() || null;
    this.model = config.get<string>('AI_MODEL')?.trim() || DEFAULT_MODEL;
    this.timeoutMs =
      Number(config.get<string>('AI_TIMEOUT_MS')) || DEFAULT_TIMEOUT_MS;
    const provider = config.get<string>('AI_PROVIDER')?.trim().toLowerCase();
    if (provider && provider !== 'gemini') {
      this.logger.warn(
        `AI_PROVIDER="${provider}" isn't supported; using Gemini`,
      );
    }
  }

  async generateJson({ system, prompt, schema }: AiRequest): Promise<unknown> {
    if (!this.key) throw new AiError('not_configured');

    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: schema,
        // 2.5 Flash "thinks" by default, which is slow for a form fill.
        ...(/2\.5-flash/.test(this.model) && {
          thinkingConfig: { thinkingBudget: 0 },
        }),
      },
    };

    let res: Response;
    let data: GeminiResponse;
    try {
      res = await fetch(
        `${ENDPOINT}/${encodeURIComponent(this.model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': this.key,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeoutMs),
        },
      );
      if (res.status === 429) throw new AiError('busy');
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 300);
        this.logger.warn(`Gemini answered ${res.status}: ${detail}`);
        throw new AiError('failed');
      }
      data = (await res.json()) as GeminiResponse;
    } catch (err) {
      if (err instanceof AiError) throw err;
      const name = (err as Error)?.name;
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new AiError('timeout');
      }
      this.logger.warn(`Gemini request failed: ${(err as Error)?.message}`);
      throw new AiError('failed');
    }

    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .filter((p) => !p.thought && typeof p.text === 'string')
      .map((p) => p.text)
      .join('');
    try {
      return JSON.parse(text) as unknown;
    } catch {
      this.logger.warn('Gemini answer was not JSON');
      throw new AiError('failed');
    }
  }
}
