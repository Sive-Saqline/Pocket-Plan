// DESIGN.md §3.4: ৳ prefix, comma thousands, decimals only when non-zero.
export function formatTaka(amount: number, { signed = false } = {}): string {
  const abs = Math.abs(amount);
  const digits = Number.isInteger(abs) ? 0 : 2;
  const body = `৳${abs.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
  if (!signed || amount === 0) return body;
  return `${amount > 0 ? "+" : "−"}${body}`;
}

/** Parses a wallet balance: any amount with ≤2 decimals, negative allowed; null if invalid. */
export function parseBalance(input: string): number | null {
  const trimmed = input.replace(/,/g, "").replace(/^−/, "-").trim();
  if (trimmed === "") return 0;
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Math.abs(value) <= 1_000_000_000 ? value : null;
}

/** Parses user input into taka; null when not a positive amount with ≤2 decimals. */
export function parseTaka(input: string): number | null {
  const trimmed = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value > 0 ? value : null;
}
