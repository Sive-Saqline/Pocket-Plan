# Step 13: Savings goals

**Status:** ⏳ Not started · **PRD:** 6.8 · **Depends on:** Step 12

## Goal
Let the user set a monthly savings target and see progress towards it.

## Tasks
1. **API:** `GET /savings-goals?month=YYYY-MM` and `PUT /savings-goals` (set the target), using the existing `savings_goals` table.
   - The **saved amount is calculated, never stored**: the total of that month's expenses in the "Savings" category (PRD 6.8). This keeps one source of truth.
2. **Web:** a savings card on Home (target, saved, % progress) and a way to set or edit the target (from Budgets or More).
3. Handle the case where the user has renamed or deleted the "Savings" category (possible after Step 12): decide how the category is identified, e.g. a fixed system key. Add a migration if a new column is needed.
4. Tests: the saved amount comes from expenses, month boundaries, no target set.

## Done when
- [ ] A target can be set per month; progress shows on Home
- [ ] The saved amount is always calculated from expenses
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
