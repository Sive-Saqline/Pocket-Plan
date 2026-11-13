# Step 11: Wallets & categories: complete

**Status:** ⏳ Not started · **PRD:** 6.3, 6.4 · **Depends on:** Step 10

## Goal
Finish managing wallets and categories.

## Tasks
1. **API:** `PATCH /accounts/:id` (name, type, balance) and `DELETE /accounts/:id`.
   - Deleting a wallet that still has expenses or recurring templates: block it with a clear message (or ask for a wallet to move them to). Never delete expenses silently.
   - Balance is entered by the user and is for information only (PRD Decision 6).
2. **API:** custom categories: `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id`. Names are unique per user. The same deletion rule applies.
3. **Web:** a "Wallets & categories" screen under **More**: list, add, edit, delete, set balance.
4. Tests: unit and API tests for the new routes, including the blocked-delete case and one user trying to change another user's data.

## Out of scope
Balances that update automatically from expenses (needs income tracking, deferred in PRD §14).

## Done when
- [ ] Wallets and categories can be fully managed from the app
- [ ] Deletion rules enforced and tested
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
