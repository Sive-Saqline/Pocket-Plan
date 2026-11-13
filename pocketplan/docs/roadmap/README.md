# PocketPlan Roadmap

Step-by-step plan to finish PocketPlan against [PRD v4](../PocketPlan-PRD-v4.md).
Work through the steps **one at a time, in order**. Each step has its own file with its goal, tasks, and a "Done when" checklist.

Last reviewed: 2026-11-13

## Ground rules

- **One step at a time.** Start a step only when the previous one is marked ✅ Done.
- **Fix bugs as they're found.** Bug fixing is an ongoing task that runs alongside every step (see below), not a step of its own.
- **Storage stays as it is until Step 22.** Every new feature uses the existing demo storage (JSON files behind a store interface, like `LedgerStore` and `UsersRepository`). That way Step 22 only swaps the storage layer, and features don't need rewriting.
- **Keep `main` green.** At the end of every step, `npm run lint`, `npm test`, and `npm run test:e2e` pass, and the web app builds.
- **Update the tables below** when a step starts or finishes.

## Status key

✅ Done · 🟡 In progress · ⏳ Not started · 🔁 Ongoing

## Ongoing task (runs alongside every step)

| Task | When | Status |
|---|---|---|
| [Bug fixing & stabilization](ongoing-bug-fixing.md) | Any bug found while working on a step is fixed straight away, tested where practical, and logged. A step isn't ✅ Done while it has open High bugs. | 🔁 Ongoing |

## Completed steps

| # | Step | PRD | Status |
|---|---|---|---|
| 01 | [Project setup](01-project-setup.md) | Phase 0 | ✅ Done |
| 02 | [Accounts, sign-in & profile](02-auth-and-profile.md) | 6.1, 6.2 | ✅ Done |
| 03 | [Categories & wallets (basic)](03-categories-and-wallets.md) | 6.3, 6.4 | ✅ Done |
| 04 | [Personal expenses](04-personal-expenses.md) | 6.6 | ✅ Done |
| 05 | [Budgets](05-budgets.md) | 6.5 | ✅ Done |
| 06 | [Recurring expenses](06-recurring-expenses.md) | 6.7 | ✅ Done |
| 07 | [Home dashboard & monthly summary](07-home-dashboard.md) | 6.9 (part) | ✅ Done |
| 08 | [Split & settlement engine + demo screen](08-split-settlement-engine.md) | 9 | ✅ Done |
| 09 | [Database design (schema only)](09-database-design.md) | 8 | ✅ Done |

## Remaining steps (do in order)

| # | Step | PRD | Status |
|---|---|---|---|
| **10** | [**UI polish & branding**](10-ui-polish-and-branding.md) | — | 🟡 Partially done |
| 11 | [Wallets & categories: complete](11-wallets-complete.md) | 6.3, 6.4 | ⏳ |
| 12 | [Savings goals](12-savings-goals.md) | 6.8 | ⏳ |
| 13 | [Reports](13-reports.md) | 6.9 | ⏳ |
| 14 | [Groups & members](14-groups-and-members.md) | 6.10, 6.11 | ⏳ |
| 15 | [Group expenses & splitting](15-group-expenses-and-splitting.md) | 6.12 | ⏳ |
| 16 | [Balances, settlements & group budgets](16-balances-settlements-group-budgets.md) | 6.13, 9 | ⏳ |
| 17 | [AI: plain-language entry & auto-categorize](17-ai-entry-and-categorize.md) | 6.14, 6.15 | ⏳ |
| 18 | [Smart checks: unusual, duplicate & repeating expenses](18-smart-checks.md) | 6.17, 6.18 | ⏳ |
| 19 | [AI: monthly insights](19-ai-monthly-insights.md) | 6.16 | ⏳ |
| 20 | [Installable app (PWA)](20-pwa.md) | Phase 8 | ⏳ |
| 21 | [Final QA & release readiness](21-final-qa.md) | Phase 16 | ⏳ |
| 22 | [Supabase integration & deployment](22-supabase-integration.md) | 5, 6.1, 8 | ⏳ (last) |

## Why this order

1. **10: polish first.** Set up the icon set, logo, and visual style before building new screens, so Steps 11–21 use them from day one instead of being reworked later.
2. **11 → 13: finish the personal app.** These steps are small and self-contained. Reports (13) comes after Savings (12) because it shows savings progress.
3. **14 → 16: groups, built in layers.** Groups need members, members are needed to split expenses, and splits are needed to work out balances. The PRD requires groups to be correct and tested before any AI work (Decision 12).
4. **17 → 19: AI, from simplest to richest.** Plain-language entry and categorizing first. Then the checks that need no AI call (they're plain statistics). Insights last, because they draw on reports, budgets, and groups.
5. **20: installable app.** It needs the final logo and icons (Step 10) and the final set of screens.
6. **21: one full test pass** across everything before changing the storage underneath.
7. **22: Supabase last.** Swap the JSON-file storage for Prisma and Supabase, switch sign-in to Supabase Auth, then deploy.

## Not in this roadmap (deferred by the PRD)

Capacitor app-store wrap (optional Phase 15), multi-currency, percentage or exact-amount splits, receipt scanning, bank integrations, voice input, push notifications, income tracking. See PRD §14.
