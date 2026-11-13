# Step 15: Group expenses & splitting

**Status:** ⏳ Not started · **PRD:** 6.6, 6.12 · **Depends on:** Step 14

## Goal
Log expenses inside a group and split them between members.

## Tasks
1. **Data shape:** add `groupId` (null = personal) and `paidBy` to the `Expense` type, plus a participants list with each person's `shareAmount` (PRD 8). Use the **same shape** for personal and group expenses so Step 22 moves both into one table.
2. **API:** add, view, edit, and delete expenses under `/groups/:id/expenses`.
   - Split types: **equal** (everyone, or chosen people) and **just me**.
   - Calculate shares with the existing engine (`settlement.ts`) so the amounts always add up exactly.
   - The payer and every participant must be current members.
3. **Web:** a group Expenses tab and an Add Expense sheet connected to the API (reuse the demo components). The Expenses page can optionally show group expenses I'm part of.
4. Tests: split amounts always add up to the total (including amounts that don't divide evenly), membership checks, editing a split.

## Out of scope
Percentage or exact-amount splits (deferred). Balances and Settle Up (Step 16).

## Done when
- [ ] Group expenses can be added, edited, and deleted with both split types
- [ ] Split amounts always add up exactly (tested)
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
