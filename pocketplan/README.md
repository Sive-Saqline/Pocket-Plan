# PocketPlan

Collaborative expense & budgeting app. Requirements: [docs/PocketPlan-PRD-v4.md](docs/PocketPlan-PRD-v4.md).

| Workspace | Stack | Port |
|---|---|---|
| `apps/api` | NestJS 10, Prisma 6, PostgreSQL (Supabase) | 3001 |
| `apps/web` | Next.js 15 (App Router), Tailwind 4, PWA | 3000 |

## Setup

1. `npm install` (also generates the Prisma client)
2. Create a Supabase project, then copy the env files and fill them in:
   - `apps/api/.env.example` → `apps/api/.env`
   - `apps/web/.env.example` → `apps/web/.env.local`
3. `npm run db:migrate` — creates the schema in Supabase
4. `npm run dev:api` and `npm run dev:web`

`GET http://localhost:3001/health` returns `{ "status": "ok", "db": "up" }` once the database is reachable.

## Scripts

| Script | What it does |
|---|---|
| `npm run build` | Build both apps |
| `npm run lint` | Lint both apps |
| `npm test` | API unit tests |
| `npm run test:e2e` | API HTTP tests (auth, personal expenses, balances; no database needed) |
| `npm run db:studio` | Browse the database in Prisma Studio |

## Accounts (sign up / sign in)

Open http://localhost:3000. You land on **Sign In**; use **Create an account** to register. Every page requires sign-in and returns you to the page you asked for afterwards.

- API: `POST /auth/register`, `POST /auth/login` (return a 7-day JWT) and `GET /auth/me` (Bearer token).
- Passwords are bcrypt-hashed. Wrong password and unknown email give the same error.
- **Demo storage:** accounts live in `apps/api/.data/users.json` (git-ignored) behind a `UsersRepository` interface, until the Supabase work replaces it. Delete that file to wipe all accounts (restart the API afterwards).
- Set `JWT_SECRET` in `apps/api/.env` for anything beyond local demos; the API warns when it falls back to a dev secret.

## Personal expenses

Signed-in users get a **Home** dashboard (this month vs last, spending by category, recent expenses, per-wallet totals) and an **Expenses** page (month switcher, category filters, list grouped by day). Add, edit and delete from the **+** button; create wallets inline with **+ Add**. A new account can use **Load sample month** to get about two months of realistic data.

- API (all require sign-in, all scoped to the signed-in user): `GET /categories`, `GET|POST /accounts`, `GET|POST /expenses`, `PATCH|DELETE /expenses/:id`, `POST /expenses/sample-data`, `GET /reports/summary?month=YYYY-MM`.
- New users get the 9 default categories (PRD §6.3) and a Cash wallet.
- **Demo storage:** one JSON file per user in `apps/api/.data/ledger/`, behind a `LedgerStore` interface, until the database work lands.

## Budgets

**Budgets** tab: set a monthly limit per category, plan one month ahead, and **Copy** last month's budgets in one tap. Bars follow EXPERIENCE.md §5.6: teal under 80%, amber 80–99%, red at 100%+, always with a text label too. Home shows "৳X of ৳Y budgeted" and your fullest budgets; the Add Expense sheet warns *"This puts Transport at 105% of budget."* before you save.

- API: `GET /budgets?month=YYYY-MM`, `PUT /budgets` (create or replace), `DELETE /budgets/:categoryId?month=`, `POST /budgets/copy`. **Load sample month** includes budgets for this month and last.

## Recurring expenses

**More → Recurring expenses**: save bills and subscriptions with how often they repeat (daily, weekly, monthly, yearly). Nothing is added automatically (PRD §6.7 reminder model): when one is due, Home shows *"N recurring expenses are due · Review →"* and the **More** tab gets a red dot. Review them one at a time, edit if needed, then **Confirm** (adds the expense, moves the due date on) or **Skip** (changes nothing). **Not now** hides the banner for this session. Missed months are confirmed one at a time.

- API: `GET|POST /recurring-expenses`, `PATCH|DELETE /recurring-expenses/:id`, `POST /recurring-expenses/:id/confirm`. "Due" is computed against `?today=YYYY-MM-DD` (the user's local date); there is no background job.
- Monthly dates keep their day: a bill on the 31st falls on 28 Feb and returns to 31 Mar.
- **Load sample month** includes 2 due, 2 upcoming and 1 paused template.

## Profile

Tap your avatar (top right), or **More → Profile & settings**: edit your name (email is read-only), pick a **System / Light / Dark** theme (saved to your account, applied before first paint so it never flashes), **change password** (other devices are signed out; this one stays signed in), and **Sign out**.

- API: `PATCH /auth/me` (`name`, `preferences.theme`), `POST /auth/change-password`.

## Demo: split & settlement engine (no database needed)

The PRD §9 engine lives in [apps/api/src/balances/settlement.ts](apps/api/src/balances/settlement.ts): equal / "just me" splits, net balances, and greedy debt simplification, all in integer paisa.

```bash
npm test            # 24 unit tests, incl. a 500-group randomised money-correctness check
npm run test:e2e    # HTTP tests against POST /balances/preview

npm run dev:api     # then, in another terminal:
curl -X POST localhost:3001/balances/preview \
  -H "Content-Type: application/json" \
  --data @apps/api/demo/mess-month.json
```

[demo/mess-month.json](apps/api/demo/mess-month.json) is a 4-person shared flat for one month (rent, bazar, bills, a 3-way gas split, a "just me" item, and one settlement already paid). Omit `participants` on an expense to split it among all members.

## Demo: Settle Up screen

```bash
npm run dev:api     # terminal 1
npm run dev:web     # terminal 2 → open http://localhost:3000 → "Open demo group"
```

A working version of the v4 group-detail mock. Every change is sent to `POST /balances/preview`, so the numbers on screen come from the tested API engine, not from the browser.

- **Balances:** each member's net position, suggested payments with **Settle** buttons, and settlement history with **Undo**.
- **Expenses:** tap a row to see the exact per-person shares; the **+** button adds an expense (Everyone / Choose people / Just the payer).
- **Members:** add people; anyone with expenses or settlements can't be removed.
- **Reset demo** restores the sample month. Data is kept in browser storage until the database work lands.
- Stop the API to see the error banner and **Retry**.
