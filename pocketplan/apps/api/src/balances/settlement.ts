// Split & settlement engine — PRD v4 §9.
// Pure functions over integer paisa (৳1 = 100 paisa) so balances never drift
// through floating-point rounding. Balances are always recomputed from the
// full expense + settlement history, never stored (§9.1).

export type Paisa = number;

export interface LedgerExpense {
  amount: Paisa;
  paidBy: string;
  /** Split equally between these people (when `shares` isn't given). */
  participants?: string[];
  /**
   * Each person's exact share, as stored with a saved group expense (any of
   * the four split methods). Must add up to `amount`.
   */
  shares?: { userId: string; amount: Paisa }[];
}

export interface LedgerSettlement {
  from: string;
  to: string;
  amount: Paisa;
}

export interface Payment {
  from: string;
  to: string;
  amount: Paisa;
}

export class LedgerError extends Error {}

export function toPaisa(taka: number): Paisa {
  return Math.round(taka * 100);
}

export function toTaka(paisa: Paisa): number {
  return paisa / 100;
}

/**
 * Splits an amount equally (§9.1). When it doesn't divide evenly, the leftover
 * paisa go one each to the first participants in list order, so the shares
 * always add up to exactly the amount.
 */
export function splitEqually(
  amount: Paisa,
  participants: string[],
): Map<string, Paisa> {
  assertPositiveAmount(amount);
  if (participants.length === 0) {
    throw new LedgerError('An expense needs at least one participant');
  }
  if (new Set(participants).size !== participants.length) {
    throw new LedgerError('Participants must not repeat');
  }

  const base = Math.floor(amount / participants.length);
  const remainder = amount % participants.length;
  return new Map(
    participants.map((id, i) => [id, base + (i < remainder ? 1 : 0)]),
  );
}

/**
 * Net balance per member: positive = the group owes them, negative = they owe
 * the group. Every member appears, and the balances always sum to zero.
 */
export function computeBalances(
  members: string[],
  expenses: LedgerExpense[],
  settlements: LedgerSettlement[] = [],
): Map<string, Paisa> {
  const balances = new Map<string, Paisa>(members.map((id) => [id, 0]));
  const adjust = (id: string, delta: Paisa) => {
    const current = balances.get(id);
    if (current === undefined) {
      throw new LedgerError(`${id} is not a member of this group`);
    }
    balances.set(id, current + delta);
  };

  for (const expense of expenses) {
    const shares = expense.shares
      ? exactShares(expense.amount, expense.shares)
      : splitEqually(expense.amount, expense.participants ?? []);
    adjust(expense.paidBy, expense.amount);
    for (const [id, share] of shares) adjust(id, -share);
  }

  // §9.3: a settlement counts as an expense paid by the debtor with the
  // creditor as its only participant.
  for (const s of settlements) {
    assertPositiveAmount(s.amount);
    if (s.from === s.to) {
      throw new LedgerError('A member cannot settle with themselves');
    }
    adjust(s.from, s.amount);
    adjust(s.to, -s.amount);
  }

  return balances;
}

/**
 * Greedy debt simplification (§9.2): repeatedly match the largest debtor with
 * the largest creditor until every balance is zero. Produces at most n − 1
 * payments for n members with non-zero balances. Ties break by member id so
 * the result is deterministic.
 */
export function simplifyDebts(balances: Map<string, Paisa>): Payment[] {
  const open = [...balances].filter(([, b]) => b !== 0);
  if (open.reduce((sum, [, b]) => sum + b, 0) !== 0) {
    throw new LedgerError('Balances must sum to zero');
  }

  const largest = (sign: 1 | -1) =>
    open
      .filter(([, b]) => Math.sign(b) === sign)
      .sort(
        ([idA, a], [idB, b]) => sign * (b - a) || idA.localeCompare(idB),
      )[0];

  const payments: Payment[] = [];
  let creditor = largest(1);
  let debtor = largest(-1);
  while (creditor && debtor) {
    const amount = Math.min(creditor[1], -debtor[1]);
    payments.push({ from: debtor[0], to: creditor[0], amount });
    creditor[1] -= amount;
    debtor[1] += amount;
    creditor = largest(1);
    debtor = largest(-1);
  }
  return payments;
}

function exactShares(
  amount: Paisa,
  shares: { userId: string; amount: Paisa }[],
): Map<string, Paisa> {
  assertPositiveAmount(amount);
  if (shares.length === 0) {
    throw new LedgerError('An expense needs at least one participant');
  }
  const map = new Map<string, Paisa>();
  for (const s of shares) {
    if (!Number.isInteger(s.amount) || s.amount < 0) {
      throw new LedgerError('Shares must be whole paisa, not negative');
    }
    if (map.has(s.userId)) {
      throw new LedgerError('Participants must not repeat');
    }
    map.set(s.userId, s.amount);
  }
  if (shares.reduce((t, s) => t + s.amount, 0) !== amount) {
    throw new LedgerError('Shares must add up to the expense amount');
  }
  return map;
}

function assertPositiveAmount(amount: Paisa) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new LedgerError('Amounts must be a positive whole number of paisa');
  }
}
