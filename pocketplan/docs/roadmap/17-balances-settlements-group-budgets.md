# Step 17: Balances, settlements & group budgets

**Status:** ⏳ Not started · **PRD:** 6.13, 9 · **Depends on:** Step 16

## Goal
Finish the group features: who owes whom, Settle Up, and a monthly group budget. After this step, groups are complete and tested, which the PRD requires before any AI work (Decision 12).

## Tasks
1. **API:**
   - `GET /groups/:id/balances`: each member's balance and the suggested payments, calculated fresh each time from expenses and settlements (never stored).
   - `POST /groups/:id/settlements` and `GET`; deleting a settlement covers Undo. Uses the `settlements` table.
   - Group monthly budget: `PATCH /groups/:id` with `monthlyBudget`; planned vs actual for the group.
   - Switch on `/reports?group_id=` (from Step 14).
2. **Balances endpoint:** the old unauthenticated demo endpoint is gone; the real one is `GET /groups/:id/balances` (members only).
3. **Web:** the Balances tab, Settle button, settlement history with Undo, and the group budget bar, all connected to the API.
4. **Money-correctness tests (required by PRD 12):** after any sequence of expenses and settlements, all balances add up to 0; settling every suggested payment brings everyone to 0; repeat the random 500-group test through the API.

## Done when
- [ ] Balances, Settle Up, Undo, and the group budget all work against the API
- [ ] Money-correctness tests pass
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
