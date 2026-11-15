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
3. `npm run db:migrate`: applies the migrations in `apps/api/prisma/migrations/` to Supabase (tables, data rules, the sign-up trigger, and row-level security). It runs `prisma migrate deploy`; `prisma migrate dev` isn't used, because Supabase doesn't allow its temporary "shadow" database.
4. `npm run dev:api` and `npm run dev:web`

The web app always runs on **port 3000** (the API only accepts requests from there). If something else is already using 3000, `dev:web` stops with `EADDRINUSE` instead of quietly moving to another port. Stop the other process first. On Windows, `netstat -ano | findstr :3000` shows its PID.

`GET http://localhost:3001/health` returns `{ "status": "ok", "db": "up" }` once the database is reachable.

## Scripts

| Script | What it does |
|---|---|
| `npm run build` | Build both apps |
| `npm run lint` | Lint both apps |
| `npm test` | API unit tests |
| `npm run test:e2e` | API HTTP tests (profile, personal expenses, recurring, balances). Supabase is replaced by test stand-ins, so no database or network is needed. |
| `npm run db:migrate` | Apply new migrations to Supabase |
| `npm run db:studio` | Browse the database in Prisma Studio |

### Adding a database change

1. Edit `apps/api/prisma/schema.prisma`.
2. Generate the SQL for just that change into a new, timestamped folder (from `apps/api`):
   `npx prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<yyyymmddhhmmss>_<name>/migration.sql`
3. Add any CHECK rules or row-level-security policies for new tables to that file by hand.
4. `npm run db:migrate`, then `npm run db:generate` (stop the API first on Windows, or the engine file is locked).

## Accounts (sign up / sign in)

Sign-in runs on **Supabase Auth**; all data is stored in Supabase (PostgreSQL) through the API.

- **Register** sends a confirmation email (email confirmation is on). After clicking the link you can sign in. Signing up creates your profile, the 9 default categories and a Cash wallet (database trigger `on_auth_user_created`).
- **Forgot password?** on Sign In emails a reset link that opens `/reset-password`.
- **Change password** (Profile) checks your current password and signs out your other devices.
- **Where the session lives:** only in **HttpOnly cookies** (`SameSite=Lax`, `Secure` in production). Page JavaScript can't read them, so an injected script can't steal the session. Nothing is kept in `localStorage`.
  - Sign-in actions run on the Next.js server: `app/api/auth/[action]` (login, register, logout, forgot-password, reset-password, change-password). Email links come back through `app/auth/callback`.
  - The browser calls the API through `app/api/pp/[...path]`, which reads the cookie, renews the token when needed and adds `Authorization: Bearer …`. The API checks the token against the project's public signing keys (no JWT secret needed).
  - State-changing requests must come from the app's own origin (CSRF protection).
- API: `GET|PATCH /auth/me`, `PUT|DELETE /auth/me/avatar`. There are no register, login or password routes in the API any more.
- Supabase dashboard settings: **Authentication → URL Configuration**: Site URL `http://localhost:3000`, Redirect URLs `http://localhost:3000/**`.

## Personal expenses

Signed-in users get a **Home** dashboard (this month vs last, spending by category, recent expenses, per-wallet totals) and an **Expenses** page (month switcher, category filters, list grouped by day). Add, edit and delete from the **+** button; create wallets inline with **+ Add**.

- API (all require sign-in, all scoped to the signed-in user): `GET /categories`, `GET|POST /accounts`, `GET|POST /expenses`, `PATCH|DELETE /expenses/:id`, `GET /reports/summary?month=YYYY-MM`.
- New users get the 9 default categories (PRD §6.3) and a Cash wallet.
- **Storage:** Supabase tables `accounts`, `categories`, `expenses`, `budgets`, `recurring_expenses` (through `PrismaLedgerStore`). API tests use temporary JSON files instead, so they need no database.

## Wallets & categories

**More → Wallets & categories**: add, rename and delete wallets and categories; set a wallet's type and **balance** (typed in by you and informational only, PRD Decision 6; negative allowed, e.g. a credit card). Custom categories pick from 23 icons.

- Deleting a wallet or category that expenses or recurring expenses still use is refused, with a message saying how many use it. Nothing is deleted silently.
- Your last wallet and last category can't be deleted. Deleting a category removes its budgets too.
- Names are unique per user, ignoring upper/lower case.
- API: `POST /accounts` (with optional `balance`), `PATCH|DELETE /accounts/:id`, `POST /categories`, `PATCH|DELETE /categories/:id`. Icon keys: `CATEGORY_ICONS` in `apps/api/src/ledger/ledger.types.ts` (keep in sync with `CATEGORY_ICON_OPTIONS` in the web app).

## Budgets

**Budgets** tab: set a monthly limit per category, plan one month ahead, and **Copy** last month's budgets in one tap. Bars follow EXPERIENCE.md §5.6: teal under 80%, amber 80–99%, red at 100%+, always with a text label too. Home shows "৳X of ৳Y budgeted" and your fullest budgets; the Add Expense sheet warns *"This puts Transport at 105% of budget."* before you save.

- API: `GET /budgets?month=YYYY-MM`, `PUT /budgets` (create or replace), `DELETE /budgets/:categoryId?month=`, `POST /budgets/copy`.

## Recurring expenses

**More → Recurring expenses**: save bills and subscriptions with how often they repeat (daily, weekly, monthly, yearly). Nothing is added automatically (PRD §6.7 reminder model): when one is due, Home shows *"N recurring expenses are due · Review →"* and the **More** tab gets a red dot. Review them one at a time, edit if needed, then **Confirm** (adds the expense, moves the due date on) or **Skip** (changes nothing). **Not now** hides the banner for this session. Missed months are confirmed one at a time.

- API: `GET|POST /recurring-expenses`, `PATCH|DELETE /recurring-expenses/:id`, `POST /recurring-expenses/:id/confirm`. "Due" is computed against `?today=YYYY-MM-DD` (the user's local date); there is no background job.
- Monthly dates keep their day: a bill on the 31st falls on 28 Feb and returns to 31 Mar.

## Profile

Tap your avatar (top right), or **More → Profile & settings**: **add, change or remove a profile photo** (JPG, PNG or WebP; cropped to a square and shrunk in the browser before upload), edit your name (email is read-only), pick a **System / Light / Dark** theme (saved to your account, applied before first paint so it never flashes), **change password** (other devices are signed out; this one stays signed in), and **Sign out**.

- API: `PATCH /auth/me` (`name`, `preferences.theme`), `POST /auth/change-password`, `PUT /auth/me/avatar` (`{ image: "data:image/jpeg;base64,…" }`) and `DELETE /auth/me/avatar`. The API checks the image's real file type and caps it at 64 KB; `GET /auth/me` returns it as `avatarUrl`.
- **Storage:** photos are in the public Supabase Storage bucket `avatars` (random file names; only the API can upload or delete).

## Split & settlement engine

The PRD §9 calculations live in [apps/api/src/balances/settlement.ts](apps/api/src/balances/settlement.ts): equal / "just me" splits, net balances, and greedy debt simplification, all in integer paisa, covered by unit tests (`npm test`) including a 500-group randomised money-correctness check. Real groups that use it arrive in roadmap Steps 15–17; there is no demo group or sample data.
