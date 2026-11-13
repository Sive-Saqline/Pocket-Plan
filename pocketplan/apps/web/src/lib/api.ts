/**
 * API calls go to our own server first (/api/pp → app/api/pp/[...path]),
 * which adds the sign-in token from HttpOnly cookies. Page scripts never see
 * a token. Sign-in actions use /api/auth/* (see authRequest).
 */
const API_BASE = "/api/pp";
const TIMEOUT_MS = 25_000; // the remote database can take a couple of seconds

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

/** JSON request to the PocketPlan API; throws ApiError with a user-facing message. */
export function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return send<T>(`${API_BASE}${path}`, options);
}

/** POST to a sign-in action in app/api/auth/[action]. */
export function authRequest<T>(action: string, body: unknown = {}): Promise<T> {
  return send<T>(`/api/auth/${action}`, { method: "POST", body });
}

async function send<T>(url: string, { method = "GET", body, signal }: RequestOptions = {}): Promise<T> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError("Can't reach the PocketPlan API.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(". ") : data?.message;
    throw new ApiError(message ?? `Request failed (${res.status}).`, res.status);
  }
  return data as T;
}
