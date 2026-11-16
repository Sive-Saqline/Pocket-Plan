/**
 * Groups and shared expenses, as the API returns them
 * (apps/api/src/groups). Money is in taka.
 */

export type GroupRole = "OWNER" | "MEMBER";
export type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

export const splitTypes: { value: SplitType; label: string; hint: string }[] = [
  { value: "EQUAL", label: "Equally", hint: "Everyone ticked pays the same." },
  { value: "EXACT", label: "Amounts", hint: "Type what each person owes; it must add up to the total." },
  { value: "PERCENTAGE", label: "Percent", hint: "Give each person a percentage; it must add up to 100%." },
  { value: "SHARES", label: "Shares", hint: "e.g. 2 shares pays twice as much as 1 share." },
];

export interface GroupListItem {
  id: string;
  name: string;
  myRole: GroupRole;
  monthlyBudget: number | null;
  memberCount: number;
  /** + = I'm owed, − = I owe */
  myBalance: number;
}

export interface GroupMember {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: GroupRole;
  /** false once they left or were removed (kept for history) */
  active: boolean;
  joinedAt: string;
  leftAt: string | null;
}

export interface GroupDetail {
  id: string;
  name: string;
  monthlyBudget: number | null;
  createdAt: string;
  myRole: GroupRole;
  members: GroupMember[];
}

export interface GroupExpense {
  id: string;
  amount: number;
  description: string;
  expenseDate: string;
  /** category icon key, e.g. "food" */
  category: string;
  splitType: SplitType;
  paidBy: string;
  recordedBy: string;
  participants: { userId: string; amount: number; value: number | null }[];
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDelete: boolean;
}

export interface GroupExpenseInput {
  amount: number;
  description: string;
  expenseDate: string;
  category: string;
  paidBy: string;
  splitType: SplitType;
  participants: { userId: string; value?: number }[];
}

export interface Balances {
  members: {
    userId: string;
    name: string;
    avatarUrl: string | null;
    active: boolean;
    paid: number;
    share: number;
    balance: number;
  }[];
  payments: { from: string; fromName: string; to: string; toName: string; amount: number }[];
  settlements: {
    id: string;
    from: string;
    fromName: string;
    to: string;
    toName: string;
    amount: number;
    settledAt: string;
  }[];
}

export interface GroupSummary {
  month: string;
  total: number;
  count: number;
  myShare: number;
  iPaid: number;
  myBalance: number;
  budget: { planned: number | null; spent: number; remaining: number | null; percent: number | null };
  byCategory: { category: string; total: number; share: number }[];
  byMember: { userId: string; name: string; active: boolean; paid: number; share: number }[];
  recent: GroupExpense[];
}

export interface GroupInvite {
  id: string;
  kind: "email" | "link";
  email: string | null;
  role: GroupRole;
  createdAt: string;
  expiresAt: string;
}

export interface InviteResult {
  invite: GroupInvite;
  link: string;
  /** email: Supabase sent an invite email; in_app: they already have an account; link: share it yourself */
  delivery: "email" | "in_app" | "link";
  warning: string | null;
}

export interface ReceivedInvite {
  id: string;
  groupId: string;
  groupName: string;
  memberCount: number;
  invitedBy: string;
  role: GroupRole;
  expiresAt: string;
}

export interface InvitePreview {
  groupId: string;
  groupName: string;
  memberCount: number;
  invitedBy: string;
  role: GroupRole;
  expiresAt: string;
  status: "valid" | "already_member" | "wrong_account" | "expired" | "used" | "revoked";
  invitedEmail: string | null;
}

/** My part of group spending in a month (personal monthly report). */
export interface MyGroupMonth {
  month: string;
  myShare: number;
  paid: number;
  groups: { groupId: string; name: string; myShare: number; paid: number }[];
}

export const roleLabel = (r: GroupRole) => (r === "OWNER" ? "Owner" : "Member");

/** "+৳450 you're owed" style wording for my balance. */
export function balanceWords(balance: number) {
  if (balance > 0) return "you're owed";
  if (balance < 0) return "you owe";
  return "settled up";
}

/**
 * Live preview of a split in the form, using the same rounding as the API
 * (apps/api/src/balances/split.ts): whole paisa, leftovers to the largest
 * remainders. The API recomputes and has the final say.
 */
export function previewSplit(
  amount: number | null,
  type: SplitType,
  people: { userId: string; value: number | null }[],
): { shares: Map<string, number>; problem: string | null } {
  const shares = new Map<string, number>();
  if (people.length === 0) return { shares, problem: "Tick at least one person." };
  const paisa = amount === null ? null : Math.round(amount * 100);
  const hundredths = people.map((p) => (p.value !== null && p.value > 0 ? Math.round(p.value * 100) : null));
  const total = hundredths.reduce<number>((s, v) => s + (v ?? 0), 0);

  if (type !== "EQUAL" && hundredths.some((v) => v === null)) {
    const what = type === "EXACT" ? "an amount" : type === "PERCENTAGE" ? "a percentage" : "a number of shares";
    return { shares, problem: `Give everyone ticked ${what}.` };
  }
  if (type === "EXACT") {
    people.forEach((p, i) => shares.set(p.userId, hundredths[i]! / 100));
    if (paisa !== null && total !== paisa) {
      const diff = (paisa - total) / 100;
      return {
        shares,
        problem: diff > 0 ? `${formatLeft(diff)} still to assign.` : `${formatLeft(-diff)} too much assigned.`,
      };
    }
    return { shares, problem: null };
  }
  if (type === "PERCENTAGE" && total !== 10_000) {
    return { shares, problem: `Percentages add up to ${total / 100}%; they need to make 100%.` };
  }
  if (paisa === null) return { shares, problem: null };
  const weights = type === "EQUAL" ? people.map(() => 1) : (hundredths as number[]);
  allocate(paisa, weights).forEach((p, i) => shares.set(people[i].userId, p / 100));
  return { shares, problem: null };
}

const formatLeft = (taka: number) =>
  `৳${taka.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(taka) ? 0 : 2, maximumFractionDigits: 2 })}`;

function allocate(amount: number, weights: number[]): number[] {
  const T = BigInt(weights.reduce((s, w) => s + w, 0));
  const parts = weights.map((w, index) => {
    const product = BigInt(amount) * BigInt(w);
    return { index, base: product / T, rem: product % T };
  });
  // EQUAL in the API gives leftovers to the first people in order; with equal
  // weights the remainders tie, and ties go in list order here too.
  let left = amount - parts.reduce((s, p) => s + Number(p.base), 0);
  const result = parts.map((p) => Number(p.base));
  for (const p of [...parts].sort((a, b) => (a.rem === b.rem ? a.index - b.index : a.rem > b.rem ? -1 : 1))) {
    if (left === 0) break;
    result[p.index] += 1;
    left -= 1;
  }
  return result;
}
