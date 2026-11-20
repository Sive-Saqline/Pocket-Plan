/** One question for the model: instructions, the data, and the JSON shape wanted. */
export interface AiRequest {
  /** What the model must do (never contains user text). */
  system: string;
  /** The user's text and the choices they have, as data. */
  prompt: string;
  /** JSON schema (OpenAPI subset) the answer must follow. */
  schema: Record<string, unknown>;
}

export type AiFailure =
  /** No API key on the server. */
  | 'not_configured'
  /** No answer within the time limit. */
  | 'timeout'
  /** The provider's rate limit or quota was hit. */
  | 'busy'
  /** Any other error, or an answer that isn't JSON. */
  | 'failed';

export class AiError extends Error {
  constructor(readonly reason: AiFailure) {
    super(`AI request failed: ${reason}`);
  }
}

/**
 * The language model behind the AI suggestions (PRD §6.14-6.15, §11).
 * Server only. Returns parsed JSON, which callers must still check: it is a
 * suggestion, never trusted data. Tests swap in a fake.
 */
export abstract class AiProvider {
  /** Throws AiError. */
  abstract generateJson(request: AiRequest): Promise<unknown>;
}
