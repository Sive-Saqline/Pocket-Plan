// The four ways to divide a group expense (PRD v4 §6.12, §9.1).
// Everything works in whole paisa so the shares always add up to exactly the
// amount: no floating-point drift, and every leftover paisa is placed
// deliberately.

import { LedgerError, Paisa, splitEqually } from './settlement';

export const SPLIT_TYPES = ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'] as const;
export type SplitType = (typeof SPLIT_TYPES)[number];

export interface SplitInput {
  userId: string;
  /**
   * EQUAL: ignored. EXACT: the person's share in taka. PERCENTAGE: percent
   * (up to 2 decimals). SHARES: a share count, e.g. 2 for "double share".
   */
  value?: number;
}

export interface Share {
  userId: string;
  amount: Paisa;
  /** What was typed (null for EQUAL), kept so editing can show it again. */
  value: number | null;
}

/** "12.5" -> 1250 hundredths; null when it has more than 2 decimals or isn't positive. */
function hundredths(value: number | undefined): number | null {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return null;
  const scaled = Math.round(value * 100);
  return Math.abs(scaled - value * 100) < 1e-6 ? scaled : null;
}

/**
 * Divides `amount` in proportion to integer `weights` (largest-remainder
 * method). Each person first gets the rounded-down part; the paisa left over
 * go one each to the largest fractional remainders, ties in list order.
 */
export function allocate(amount: Paisa, weights: number[]): Paisa[] {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) throw new LedgerError('Weights must add up to more than 0');
  // BigInt: amount (up to 1e9 paisa) × weight can exceed 2^53.
  const big = BigInt(amount);
  const T = BigInt(total);
  const parts = weights.map((w, index) => {
    const product = big * BigInt(w);
    return { index, base: product / T, remainder: product % T };
  });
  let left = amount - parts.reduce((s, p) => s + Number(p.base), 0);
  const order = [...parts].sort((a, b) =>
    a.remainder === b.remainder
      ? a.index - b.index
      : a.remainder > b.remainder
        ? -1
        : 1,
  );
  const result = parts.map((p) => Number(p.base));
  for (const p of order) {
    if (left === 0) break;
    result[p.index] += 1;
    left -= 1;
  }
  return result;
}

/**
 * Works out each participant's share. Throws LedgerError with a message fit
 * to show the user when the split is invalid.
 */
export function computeSplit(
  amount: Paisa,
  type: SplitType,
  participants: SplitInput[],
): Share[] {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new LedgerError('Enter an amount above ৳0');
  }
  if (participants.length === 0) {
    throw new LedgerError('Pick at least one person to split with');
  }
  const ids = participants.map((p) => p.userId);
  if (new Set(ids).size !== ids.length) {
    throw new LedgerError('Each person can only appear once in a split');
  }

  if (type === 'EQUAL') {
    const shares = splitEqually(amount, ids);
    return ids.map((userId) => ({
      userId,
      amount: shares.get(userId)!,
      value: null,
    }));
  }

  const values = participants.map((p) => hundredths(p.value));
  if (values.some((v) => v === null)) {
    throw new LedgerError(
      type === 'EXACT'
        ? 'Each amount must be above ৳0 with at most 2 decimals'
        : type === 'PERCENTAGE'
          ? 'Each percentage must be above 0 with at most 2 decimals'
          : 'Each share must be above 0 with at most 2 decimals',
    );
  }
  const scaled = values as number[];
  const total = scaled.reduce((s, v) => s + v, 0);

  if (type === 'EXACT') {
    // taka in hundredths = paisa
    if (total !== amount) {
      throw new LedgerError(
        `The amounts add up to ৳${fmt(total)}, not ৳${fmt(amount)}`,
      );
    }
    return participants.map((p, i) => ({
      userId: p.userId,
      amount: scaled[i],
      value: p.value!,
    }));
  }

  if (type === 'PERCENTAGE' && total !== 10_000) {
    throw new LedgerError(`The percentages add up to ${fmt(total)}%, not 100%`);
  }
  if (type === 'SHARES' && total > 100_000_00) {
    throw new LedgerError('Use smaller share numbers');
  }
  const amounts = allocate(amount, scaled);
  return participants.map((p, i) => ({
    userId: p.userId,
    amount: amounts[i],
    value: p.value!,
  }));
}

/** 1250 -> "12.5", 1200 -> "12" */
function fmt(hundredthsValue: number) {
  return String(hundredthsValue / 100);
}
