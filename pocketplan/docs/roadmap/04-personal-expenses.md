# Step 04: Personal expenses

**Status:** ✅ Done · **PRD:** 6.6 (personal part)

## What was built
- Add, view, edit, and delete expenses: `GET|POST /expenses`, `PATCH|DELETE /expenses/:id`.
- Expenses page: month switcher, category filters, list grouped by day.
- ~~"Load sample month"~~: removed 2026-11-13 (no dummy data; testing uses real entries).
- Each user's data is stored in `apps/api/.data/ledger/<userId>.json` behind the `LedgerStore` interface.

## Known gaps (picked up later)
- The `groupId` and `paidBy` fields from PRD 6.6: Step 16.
