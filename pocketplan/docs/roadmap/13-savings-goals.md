# Step 13: Savings goals

**Status:** 🟡 Built, waiting for your test (2026-11-16) · **PRD:** 6.8 · **Depends on:** Step 12

## Goal
Let the user set a monthly savings target and see progress towards it.

## Tasks
1. **API:** `GET /savings-goals?month=YYYY-MM` and `PUT /savings-goals` (set the target), using the existing `savings_goals` table.
   - The **saved amount is calculated, never stored**: the total of that month's expenses in the "Savings" category (PRD 6.8). This keeps one source of truth.
2. **Web:** a savings card on Home (target, saved, % progress) and a way to set or edit the target (from Budgets or More).
3. Handle the case where the user has renamed or deleted the "Savings" category (possible after Step 12): decide how the category is identified, e.g. a fixed system key. Add a migration if a new column is needed.
4. Tests: the saved amount comes from expenses, month boundaries, no target set.

## What was built (2026-11-16)
- **Savings category = a system key, not a name.** New column `categories.system_key` (migration `20261116000100_savings_category`). Exactly one category per user has `'savings'`. Existing users: the category named "Savings" is marked; failing that, the oldest one with the savings icon; failing that, a new "Savings" category is created. The sign-up trigger marks it for new users.
- **It can be renamed and its icon changed, but not deleted** (API returns 409; the Delete button is hidden and the sheet explains why). A new category called "Savings" doesn't take over.
- **API:** `GET /savings-goals?month=`, `PUT /savings-goals` `{ month, targetAmount }`, `DELETE /savings-goals?month=`. The view returns target, saved, remaining, percent (rounded down, can pass 100) and status (`none` / `saving` / `reached`). `GET /reports/summary` now includes `savings` too, so Home needs no extra request.
- **Saved amount** is the month's personal expenses in the Savings category, summed in paisa (exact). Group expenses don't count.
- **Web:** "Savings goal" card on Home (current month) and on Budgets (any month, via the month switcher); a sheet to set, change or remove the target. Wallets & categories marks the Savings category "Counts as savings".
- **Tests:** `src/ledger/savings.spec.ts` (6 unit tests) and `test/savings.e2e-spec.ts` (10 API tests): month boundaries, no target, exact decimals, rename, refused delete, validation, privacy.

## Done when
- [x] A target can be set per month; progress shows on Home (pending your manual test)
- [x] The saved amount is always calculated from expenses
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass *(lint, type checks, `npm test` 89/89 and API e2e 54/54 pass; `npm run build` not run yet: stop your dev server first)*
