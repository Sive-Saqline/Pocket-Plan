// Step 18 (PRD §6.14-6.15): AI suggestions for the expense forms. They only
// ever fill a form; the user checks it and taps Save (PRD §11).

import type { SplitType } from "./group";

export interface PersonalSuggestion {
  scope: "personal";
  amount: number | null;
  description: string;
  categoryId: string | null;
  accountId: string | null;
  expenseDate: string | null;
  /** The sentence is about one of my groups: offer to add it there. */
  group: { id: string; name: string } | null;
}

export interface GroupSuggestion {
  scope: "group";
  amount: number | null;
  description: string;
  /** Category icon key */
  category: string | null;
  expenseDate: string | null;
  paidBy: string | null;
  splitType: SplitType | null;
  /** null = not said (everyone shares) */
  participants: { userId: string; value: number | null }[] | null;
}

export type ExpenseSuggestion = PersonalSuggestion | GroupSuggestion;

export interface CategoryGuess {
  /** Personal: category id. Group: icon key. */
  value: string;
  label: string;
}
