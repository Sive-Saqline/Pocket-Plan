# Step 08: Split & settlement engine

**Status:** ✅ Done · **PRD:** 9

## What was built
- `apps/api/src/balances/settlement.ts`: equal and "just me" splits, each member's net balance, and a simplification that reduces the group to the fewest payments. All amounts are whole paisa, so no rounding errors.
- 24 unit tests, including a check on 500 randomly generated groups that the money always adds up.
- A demo endpoint (`POST /balances/preview`) and a browser-only demo group page (`/groups/demo`) existed for trying it out; **both removed 2026-11-13** with all other dummy data. The group screen components (Balances, Expenses, Members tabs, Add expense sheet) are kept in `apps/web/src/components/group/` for Steps 15–17.

## Known gaps (picked up later)
- Real groups saved on the server, linked to real user accounts: Steps 15–17.
- `/balances/preview` needs to be protected by sign-in or replaced: Step 17.
