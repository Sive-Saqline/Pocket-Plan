import type { Group } from "./group";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TIMEOUT_MS = 8000;

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
  token?: string | null;
  signal?: AbortSignal;
}

/** JSON request to the PocketPlan API; throws ApiError with a user-facing message. */
export async function apiRequest<T>(
  path: string,
  { method = "GET", body, token, signal }: RequestOptions = {},
): Promise<T> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
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

export interface BalancePreview {
  currency: "BDT";
  expenses: { shares: { memberId: string; share: number }[] }[];
  balances: { memberId: string; name: string; balance: number }[];
  payments: {
    from: string;
    fromName: string;
    to: string;
    toName: string;
    amount: number;
  }[];
}

export function previewBalances(group: Group, signal?: AbortSignal) {
  return apiRequest<BalancePreview>("/balances/preview", {
    method: "POST",
    signal,
    body: {
      members: group.members,
      expenses: group.expenses.map(({ description, amount, paidBy, participants }) => ({
        description,
        amount,
        paidBy,
        participants,
      })),
      settlements: group.settlements.map(({ from, to, amount }) => ({ from, to, amount })),
    },
  });
}
