# Step 14: Reports

**Status:** 🟡 Built, waiting for your test · **PRD:** 6.9 · **Depends on:** Step 13

> Built 2026-11-19.
> - **API:** `GET /reports?from=YYYY-MM&to=YYYY-MM` (up to 12 months) returns all five reports. Totals are summed in the database in one query (`PrismaLedgerStore.report`, `GROUP BY` month × category × wallet). The shaping is shared code in `apps/api/src/ledger/reports.ts`. `&group_id=` is switched on: the same reports for one group, with "by person" in place of "by wallet" and no savings (code in `src/reports/`, `GroupExpensesService.report`).
> - **Range rules:** a budget only counts spending from months that had a budget. A group's plan for a range is its monthly budget × the number of months. Group shares stay out of personal reports (decision of 2026-11-16).
> - **Web:** a Reports tab (5th tab on phones, in the sidebar on desktop) with an end-month switcher, 1 / 3 / 6 / 12 months, and a personal-or-group picker. No chart library was added. The app's 6 chart colours fail the colour-blind check, so every chart uses one colour plus printed labels: a monthly trend column chart (exact amount on hover, tap or focus, plus a Chart/Table switch), ranked bars by category and wallet, budget bars with status labels, and a savings progress meter with a per-month table.
> - **Tests:** `test/reports.e2e-spec.ts` checks that totals match `/expenses` to the paisa. The SQL was also compared read-only against the real database: it matched for every user and group.

## Goal
A Reports screen with the charts listed in the PRD.

## Tasks
1. **API:** extend `/reports`, calculating totals in the database (SQL `GROUP BY` through Prisma) rather than in JavaScript:
   - spending by category (exists, reuse)
   - spending by wallet
   - monthly trend (last 6–12 months)
   - budget use per category
   - savings progress (from Step 13)
   - leave room for an optional `?group_id=` filter. It's switched on in Step 17.
2. **Web:** a **Reports** screen with a month or range picker and the charts. Use one chart library, styled to match the [UI guide](../ui-guide.md); two columns on desktop.
3. Each chart has a text or table alternative for accessibility.
4. Tests: totals in reports match the expense list exactly for the same period.

## Done when
- [ ] All five report types available and correct *(API tests pass; waiting for your check in the app)*
- [ ] Charts readable in both themes and at phone, tablet and desktop widths *(waiting for your check)*
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass *(lint, type check, unit and e2e tests pass; `next build` not run yet because it clashes with the running dev server)*
