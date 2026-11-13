# Step 11: Supabase integration (database, sign-in, photo storage)

**Status:** 🟡 In progress · **PRD:** 5, 6.1, 8, 12 · **Depends on:** Step 10 (partially done is fine)

## Progress
- ✅ **Decisions:** one Supabase project for development; email confirmation **on**; tokens use Supabase signing keys (ES256), so no JWT secret.
- ✅ **Task 1:** credentials in `apps/api/.env` and `apps/web/.env.local` (git-ignored), connections tested.
- ✅ **Task 2:** tables created in Supabase by 4 migrations in `apps/api/prisma/migrations/`:
  1. `…_init`: all 11 tables, enums and indexes from `schema.prisma` (added `users.theme`; ids and `updated_at` now have database defaults).
  2. `…_data_rules`: CHECK rules (amounts above 0, months 1–12, names not blank, settlements between two different people, ...).
  3. `…_auth_users_link`: `users.id` → `auth.users`; sign-up creates the profile, the 9 default categories and a Cash wallet; email changes sync.
  4. `…_row_level_security`: RLS on every table with owner and group-member rules; the public (anon) role has no table access.
  Verified with a temporary Supabase user (created, checked, deleted).
- ✅ **Task 6:** row-level security (done in migration 4).
- ✅ **Task 3:** the API stores everything in Supabase (`PrismaLedgerStore`, `PrismaUsersRepository`). Each save runs in one transaction that locks the user's row. A user's data loads in one query. The app's database connection uses the session pooler (port 5432): ~5× faster than the transaction pooler from here.
- ✅ **Task 4:** sign-up (with email confirmation), sign-in, sign-out, change password and **forgot / reset password** through Supabase Auth. The API checks tokens against the project's public signing keys. Its own login code (bcrypt, `users.json`, `JWT_SECRET`) is gone.
- ✅ **Task 5:** profile photos in the Supabase Storage bucket `avatars` (migration 5).
- 🟡 **Task 7:** API tests run with test stand-ins for Supabase (no database needed). A live check against Supabase passed on 2026-11-13. Still to add: automated tests against a test database.
- 🟡 **Task 8:** ✅ old `apps/api/.data/` demo files deleted, and all dummy data removed (sample month, demo group, `/balances/preview`, `demo/mess-month.json`) on 2026-11-13. ⏳ Still to remove: the unused `bcryptjs` and `@nestjs/jwt` packages.
- ⏳ **Your test:** see "How to test" in the conversation / README Accounts section.

## Goal
Move everything that exists today off the demo JSON files and onto Supabase: data in PostgreSQL (through Prisma), sign-in with Supabase Auth, profile photos in Supabase Storage. **The app should look and behave the same**, and every existing API test must still pass. Deployment is a separate, final step (Step 23).

## In scope (what exists today)
Accounts and profile (name, theme, photo), categories, wallets, expenses, budgets, recurring expenses, home summary.
**Not in scope:** groups, savings goals, reports, AI. Their tables are already in `schema.prisma`, but the features don't exist yet; each later step builds its feature straight on the database.

## Decisions to make at the start
1. **Supabase project:** one project for development now; a separate one for production at Step 23. Recommended.
2. **Existing demo accounts** in `.data/users.json`: either **start fresh** (recommended: it's demo data) or import them. Supabase can import bcrypt password hashes, so a one-off script could keep the current logins.
3. **How tests run:** against a local Supabase (Supabase CLI + Docker) or a separate test project. Recommended: local Supabase CLI.

## Tasks
1. **Set up the project.** Create the Supabase project. Fill in `apps/api/.env` (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, server-side key) and `apps/web/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Nothing secret is committed; update both `.env.example` files.
2. **Line the schema up with today's app, then run the first migration.**
   - Add what's missing, such as the user's **theme** preference (only `avatar_url` exists so far).
   - Check every field the API uses against `schema.prisma` (e.g. budgets store `month` + `year`, while the API uses `YYYY-MM`).
   - Then `npm run db:migrate`. `GET /health` should report `"db": "up"`.
3. **Read and write individual records instead of whole files.** Today `LedgerStore` loads and saves a user's whole data file on every change. Replace it with Prisma queries per action (list expenses for a month, add one, update one, ...). Keep the API routes and responses unchanged. Any write that touches more than one table runs in a **transaction**, e.g. confirming a recurring expense (adds an expense and moves the due date on). New users still get the 9 default categories and a Cash wallet.
4. **Sign-in with Supabase Auth (PRD Decision 1).**
   - Web: sign up, sign in, sign out and **password reset** through Supabase; keep the current screens and wording.
   - API: the guard checks Supabase tokens. The first authenticated request creates the user's row (and their default categories and wallet). Change password goes through Supabase.
   - Remove our own login code: bcrypt, `users.json`, `JWT_SECRET` (this also closes known item K3).
   - Keep the "Can't reach PocketPlan" screen (bug B1) working.
5. **Profile photos to Supabase Storage.** Add an `avatars` bucket. The API keeps validating the image (`users/avatar.ts`), uploads it, and stores its URL in `users.avatar_url`. Same `PUT|DELETE /auth/me/avatar` API as now.
6. **Database security (PRD 12).** Turn on row-level security for every table. The web app never reads tables directly; all data goes through the API, which checks the user on every query. Users can only write their own photo in Storage.
7. **Tests.** Run the API tests against the test database; they must pass unchanged. Add tests for: one user can't see or change another user's data; a failed multi-table write leaves nothing half-saved.
8. **Clean up.** Remove the JSON-file storage code and `.data/`. Optionally run a one-off import of demo data (decision 2). Update the README setup steps.

## Out of scope
Deployment and production settings (Step 23). New features.

## Done when
- [ ] The app runs on Supabase locally; nothing reads or writes `.data/` any more
- [ ] Sign up, sign in, sign out, change password and **password reset** work through Supabase Auth
- [ ] Profile photos are stored in Supabase Storage
- [ ] Row-level security is on for every table
- [ ] All existing API tests pass against the database, plus the new access and transaction tests
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
