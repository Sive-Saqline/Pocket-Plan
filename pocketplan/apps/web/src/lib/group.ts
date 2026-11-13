/**
 * Shapes used by the group screens in components/group (Balances, Expenses,
 * Members tabs, Add expense sheet). Real groups are built on these in roadmap
 * Steps 15-17; there is no demo or sample group any more.
 */
export interface Member {
  id: string;
  name: string;
}

export interface GroupExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  /** Fixed when the expense is saved; "everyone" means the members at that time. */
  participants: string[];
}

export interface GroupSettlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  settledAt: string;
}

export interface Group {
  name: string;
  members: Member[];
  expenses: GroupExpense[];
  settlements: GroupSettlement[];
}

/** Balances and suggested payments for a group (PRD §9). */
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
