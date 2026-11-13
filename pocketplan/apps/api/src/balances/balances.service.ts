import { BadRequestException, Injectable } from '@nestjs/common';
import { BalancePreviewDto } from './preview.dto';
import {
  computeBalances,
  LedgerError,
  simplifyDebts,
  splitEqually,
  toPaisa,
  toTaka,
} from './settlement';

@Injectable()
export class BalancesService {
  /** Runs the §9 engine over a caller-supplied group; nothing is persisted. */
  preview({ members, expenses, settlements = [] }: BalancePreviewDto) {
    const ids = members.map((m) => m.id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Member ids must be unique');
    }
    const nameOf = new Map(members.map((m) => [m.id, m.name]));

    const ledgerExpenses = expenses.map((e) => ({
      amount: toPaisa(e.amount),
      paidBy: e.paidBy,
      participants: e.participants ?? ids,
    }));
    const ledgerSettlements = settlements.map((s) => ({
      ...s,
      amount: toPaisa(s.amount),
    }));

    try {
      const balances = computeBalances(ids, ledgerExpenses, ledgerSettlements);
      return {
        currency: 'BDT',
        expenses: expenses.map((e, i) => ({
          description: e.description ?? null,
          amount: e.amount,
          paidBy: e.paidBy,
          shares: [
            ...splitEqually(
              ledgerExpenses[i].amount,
              ledgerExpenses[i].participants,
            ),
          ].map(([memberId, share]) => ({ memberId, share: toTaka(share) })),
        })),
        balances: [...balances].map(([memberId, balance]) => ({
          memberId,
          name: nameOf.get(memberId),
          balance: toTaka(balance),
        })),
        payments: simplifyDebts(balances).map((p) => ({
          from: p.from,
          fromName: nameOf.get(p.from),
          to: p.to,
          toName: nameOf.get(p.to),
          amount: toTaka(p.amount),
        })),
      };
    } catch (err) {
      if (err instanceof LedgerError)
        throw new BadRequestException(err.message);
      throw err;
    }
  }
}
