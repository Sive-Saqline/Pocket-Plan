# Step 22: Supabase integration & deployment

**Status:** ⏳ Not started (**last step**) · **PRD:** 5, 6.1, 8, 12 · **Depends on:** Step 21

## Goal
Replace the JSON-file storage with Supabase (PostgreSQL through Prisma), switch sign-in to Supabase Auth, and deploy. Features shouldn't change: the same API tests must pass.

## Tasks
1. **Supabase project:** create it and set `DATABASE_URL` and `DIRECT_URL`. Check that `schema.prisma` matches every field added in Steps 11–19, then run the first migration.
2. **Prisma storage:** write Prisma versions of `UsersRepository`, `LedgerStore`, `GroupStore`, and any other store, and switch the app to use them.
   - Personal and group expenses move into **one** `expenses` table (PRD Decision 8).
   - Any write that touches more than one table runs in a single **transaction**: confirming a recurring expense, saving a split, recording a settlement.
3. **Supabase Auth (PRD Decision 1):** move sign-up, sign-in, sign-out, and **password reset** to Supabase. The API checks Supabase tokens. Decide how existing demo accounts are moved over or reset.
4. **Database access rules:** add row-level security in Supabase on top of the API's own checks: users see only their own rows and their groups' rows (PRD 12).
5. **Data move:** an optional one-off script to copy `.data/*.json` into the database.
   - **Profile photos:** demo storage keeps each photo as a data URL on the user record. Move them to a Supabase Storage bucket (only the owner can write), store the file's URL in `users.avatar_url`, and keep the same `PUT|DELETE /auth/me/avatar` API and checks (`apps/api/src/users/avatar.ts`).
6. **Tests:** run every API test against a test database; all of them must pass unchanged. `/health` reports `db: up`.
7. **Deploy:** API and web hosting, environment secrets, production `JWT` and Supabase settings, then a smoke test on the live site.

## Done when
- [ ] The app runs on Supabase with no JSON-file storage left in production
- [ ] Supabase Auth is live, including password reset
- [ ] Every test passes against the database
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Deployed, and the live smoke test passes
