import { UserLedger } from './ledger.types';
import type { ReportRange, ReportSource } from './reports';

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
   * Personal spending from `start` to `end` (YYYY-MM-DD, inclusive),
   * totalled per day × category × wallet, with the budgets and savings
   * targets of the months the range touches.
   */
  abstract report(userId: string, range: ReportRange): Promise<ReportSource>;
}
