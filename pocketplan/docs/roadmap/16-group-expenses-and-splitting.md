# Step 16: Group expenses & splitting

**Status:** 🟡 Built, waiting for your test (2026-11-16) · **PRD:** 6.6, 6.12 · **Depends on:** Step 15

> Built 2026-11-16 with all four split methods: equal, exact amounts, percentages and shares (percentage and exact moved into scope).

## Goal
Log expenses inside a group and split them between members.

## Tasks
1. **Data:** group expenses use the same `expenses` table as personal ones (`group_id` set, `paid_by` = who paid), plus `expense_participants` with each person's `share_amount` (PRD Decision 8). Saving an expense and its participants happens in **one transaction**.
2. **API:** add, view, edit, and delete expenses under `/groups/:id/expenses`.
   - Split types: **equal** (everyone, or chosen people) and **just me**.
   - Calculate shares with the existing engine (`settlement.ts`) so the amounts always add up exactly.
   - The payer and every participant must be current members.
3. **Web:** a group Expenses tab and an Add Expense sheet connected to the API (reuse the components in `components/group/`). The Expenses page can optionally show group expenses I'm part of.
4. Tests: split amounts always add up to the total (including amounts that don't divide evenly), membership checks, editing a split, a failed save leaves nothing half-saved.

## Out of scope
Percentage or exact-amount splits (deferred). Balances and Settle Up (Step 17).

## Done when
- [ ] Group expenses can be added, edited, and deleted with both split types
- [ ] Split amounts always add up exactly (tested)
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
