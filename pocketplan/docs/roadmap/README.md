# PocketPlan Roadmap

Step-by-step plan to finish PocketPlan against [PRD v4](../PocketPlan-PRD-v4.md).
Work through the steps **one at a time, in order**. Each step has its own file with its goal, tasks, and a "Done when" checklist.

Last re-planned: 2026-11-13. Supabase moved forward to Step 11, so every later feature is built directly on the database.

## Ground rules

- **One step at a time.** Start a step only when the previous one is done, unless we agree to pause one, as with Step 10.
- **Fix bugs as they're found.** Bug fixing is an ongoing task that runs alongside every step (see below), not a step of its own.
- **Database first, from Step 11 on.** After Step 11, all data lives in Supabase (PostgreSQL through Prisma). Every step that needs new tables or fields adds them to `schema.prisma` **with a migration in the same step**, and adds row-level security for any new table.
- **Keep `main` green.** At the end of every step, `npm run lint`, `npm test`, and `npm run test:e2e` pass, and the web app builds.
- **Update the tables below** when a step starts or finishes.

## Status key

✅ Done · 🟡 In progress / partially done · ⏳ Not started · 🔁 Ongoing

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
| 10 | [UI polish & branding](10-ui-polish-and-branding.md) | — | 🟡 Partially done |

## Remaining steps (do in order)

| # | Step | PRD | Status |
|---|---|---|---|
| **11** | [**Supabase integration**: database, sign-in, photo storage](11-supabase-integration.md) | 5, 6.1, 8, 12 | 🟡 In progress (tables + RLS done) |
| 12 | [Wallets & categories: complete](12-wallets-complete.md) | 6.3, 6.4 | 🟡 Built, waiting for your test |
| 13 | [Savings goals](13-savings-goals.md) | 6.8 | ⏳ |
| 14 | [Reports](14-reports.md) | 6.9 | ⏳ |
| 15 | [Groups & members](15-groups-and-members.md) | 6.10, 6.11 | 🟡 Built, waiting for your test |
| 16 | [Group expenses & splitting](16-group-expenses-and-splitting.md) | 6.12 | 🟡 Built, waiting for your test |
| 17 | [Balances, settlements & group budgets](17-balances-settlements-group-budgets.md) | 6.13, 9 | 🟡 Built, waiting for your test |
| 18 | [AI: plain-language entry & auto-categorize](18-ai-entry-and-categorize.md) | 6.14, 6.15 | ⏳ |
| 19 | [Smart checks: unusual, duplicate & repeating expenses](19-smart-checks.md) | 6.17, 6.18 | ⏳ |
| 20 | [AI: monthly insights](20-ai-monthly-insights.md) | 6.16 | ⏳ |
| 21 | [Installable app (PWA)](21-pwa.md) | Phase 8 | ⏳ |
| 22 | [Final QA & release readiness](22-final-qa.md) | Phase 16 | ⏳ |
| 23 | [Deployment](23-deployment.md) | Phase 16 | ⏳ (last) |

## Why this order

1. **11: Supabase first.** Moving the existing features onto the real database, real sign-in and real file storage now means nothing built later needs moving again. It also brings password reset and proper data security early. Deployment is split off into its own last step.
2. **12 → 14: finish the personal app** directly on the database. Reports (14) comes after Savings (13) because it shows savings progress.
3. **15 → 17: groups, built in layers.** Groups need members, members are needed to split expenses, and splits are needed to work out balances. The PRD requires groups to be correct and tested before any AI work (Decision 12).
4. **18 → 20: AI, from simplest to richest.** Plain-language entry and categorizing first. Then the checks that need no AI call (they're plain statistics). Insights last, because they draw on reports, budgets, and groups.
5. **21: installable app.** It needs the final set of screens; the icons already exist (Step 10).
6. **22 → 23: one full check, then go live.**

## What changed in the re-plan (2026-11-13)

| Before | Now | Why |
|---|---|---|
| Supabase was the last step (22), together with deployment | Supabase is **Step 11**; deployment is its own last step (**23**) | Build every new feature on the real database from the start |
| Steps 11–21 used the JSON-file storage | Steps 12–21 use the database, each adding its own migration | No second move of data later |
| Final QA came before the database switch | Final QA (22) checks the app as it will run live | Tests the real setup |
| Step 10 was to be finished first | Step 10 is **partially done**; its open items are listed in its file | Paused by choice; can be finished alongside later steps |

## Not in this roadmap (deferred by the PRD)

Capacitor app-store wrap (optional Phase 15), multi-currency, receipt scanning, bank integrations, voice input, push notifications, income tracking. See PRD §14.
