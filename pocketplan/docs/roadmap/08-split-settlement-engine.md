# Step 08: Split & settlement engine + demo screen

**Status:** ✅ Done · **PRD:** 9

## What was built
- `apps/api/src/balances/settlement.ts`: equal and "just me" splits, each member's net balance, and a simplification that reduces the group to the fewest payments. All amounts are whole paisa, so no rounding errors.
- 24 unit tests, including a check on 500 randomly generated groups that the money always adds up.
- `POST /balances/preview`: calculates balances for a group sent in the request. Sign-in not required (demo only).
- Web demo at `/groups/demo`: Balances, Expenses, and Members tabs, Settle with Undo, Add Expense (Everyone / Choose people / Just the payer). The group is stored in the browser.

## Known gaps (picked up later)
- Real groups saved on the server, linked to real user accounts: Steps 14–16.
- `/balances/preview` needs to be protected by sign-in or replaced: Step 16.
