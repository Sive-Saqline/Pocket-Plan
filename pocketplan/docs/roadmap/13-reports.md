# Step 13: Reports

**Status:** ⏳ Not started · **PRD:** 6.9 · **Depends on:** Step 12

## Goal
A Reports screen with the charts listed in the PRD.

## Tasks
1. **API:** extend `/reports` with:
   - spending by category (exists, reuse)
   - spending by wallet
   - monthly trend (last 6–12 months)
   - budget use per category
   - savings progress (from Step 12)
   - leave room for an optional `?group_id=` filter. It's switched on in Step 16.
2. **Web:** a **Reports** screen with a month or range picker and the charts. Use one chart library, styled to match the Step 10 UI guide.
3. Each chart has a text or table alternative for accessibility.
4. Tests: totals in reports match the expense list exactly for the same period.

## Done when
- [ ] All five report types available and correct
- [ ] Charts readable in both themes and on a phone
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
