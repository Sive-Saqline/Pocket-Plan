# Step 12: Wallets & categories: complete

**Status:** 🟡 Built, waiting for your test (2026-11-13) · **PRD:** 6.3, 6.4 · **Depends on:** Step 11

## Goal
Finish managing wallets and categories.

## Tasks
1. **API:** `PATCH /accounts/:id` (name, type, balance) and `DELETE /accounts/:id`.
   - Deleting a wallet that still has expenses or recurring templates: block it with a clear message (or ask for a wallet to move them to). Never delete expenses silently.
   - Balance is entered by the user and is for information only (PRD Decision 6).
2. **API:** custom categories: `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id`. Names are unique per user (already a database rule). The same deletion rule applies. Users pick the icon from the icon keys in the [UI guide](../ui-guide.md).
3. **Web:** a "Wallets & categories" screen under **More**: list, add, edit, delete, set balance.
4. Tests: API tests for the new routes, including the blocked delete, a duplicate name, and one user trying to change another user's data.

## Out of scope
Balances that update automatically from expenses (needs income tracking, deferred in PRD §14).

## What was built
- API: edit and delete wallets (name, type, balance), add/edit/delete categories (name, 23 icons), with the rules above plus: last wallet / last category can't be deleted, and deleting a category removes its budgets.
- Web: **More → Wallets & categories** (`/wallets`), with add/edit sheets and a delete confirmation; wallet balances and a total.
- Tests: 13 new API tests (`test/wallets.e2e-spec.ts`).

## Done when
- [x] Wallets and categories can be fully managed from the app (pending your manual test)
- [x] Deletion rules enforced and tested
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
