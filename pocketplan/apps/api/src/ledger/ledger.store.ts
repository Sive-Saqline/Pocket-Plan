import { UserLedger } from './ledger.types';
import type { ReportSource } from './reports';

/**
 * Storage seam for a user's personal finance data. The file-backed
 * implementation keeps demos working without a database; a Prisma one
 * replaces it when the database work lands.
 */
export abstract class LedgerStore {
  /** The user's ledger, created with default categories and a Cash wallet on first use. */
  abstract read(userId: string): Promise<UserLedger>;

  /**
   * Applies `change` to a copy of the ledger and saves it atomically. Changes
   * for one user run one at a time; if `change` throws, nothing is saved.
   */
  abstract mutate<T>(
    userId: string,
    change: (ledger: UserLedger) => T,
  ): Promise<T>;

  /**
   * Personal spending from `from` to `to` (YYYY-MM, inclusive), totalled per
   * month × category × wallet, with the budgets and savings targets in range.
   */
  abstract report(
    userId: string,
    from: string,
    to: string,
  ): Promise<ReportSource>;
}
