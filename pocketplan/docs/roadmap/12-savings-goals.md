# Step 12: Savings goals

**Status:** ⏳ Not started · **PRD:** 6.8 · **Depends on:** Step 11

## Goal
Let the user set a monthly savings target and see progress towards it.

## Tasks
1. **API:** `GET /savings-goals?month=YYYY-MM` and `PUT /savings-goals` (set the target).
   - The **saved amount is calculated, never stored**: the total of that month's expenses in the "Savings" category (PRD 6.8). This keeps one source of truth.
   - Store targets in the existing per-user ledger file (add `savingsGoals` to `UserLedger`).
2. **Web:** a savings card on Home (target, saved, % progress) and a way to set or edit the target (from Budgets or More).
3. Handle the case where the user has renamed or deleted the "Savings" category (now possible after Step 11): decide how the category is identified, e.g. a fixed system key.
4. Tests: saved amount comes from expenses, month boundaries, no target set.

## Done when
- [ ] Target can be set per month; progress shows on Home
- [ ] Saved amount is always calculated from expenses
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
