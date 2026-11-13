# Ongoing: Bug fixing & stabilization

**Type:** ongoing task, not a numbered step · **PRD:** 12 (non-functional)

Bug fixing runs **alongside every step**, not at the end. When a bug turns up while working on any step, fix it straight away, add a test where practical, and log it below.

## How it works

1. **Found a bug?** Add a row to the bug log, even if you fix it straight away.
2. **Fix it now** if it's in the area you're working on or it blocks the current step.
3. **If it's unrelated and not blocking,** log it as "Open" and fix it before the current step is marked ✅ Done. Never carry a High bug into the next step.
4. **Add a regression test** for each fix where practical.
5. **Keep fixes separate from feature work:** give them their own commit, starting with `fix:`, so they're easy to review and revert.

Every step's "Done when" list includes: *"Bugs found during this step fixed and logged."*

## Baseline (2026-11-13)

- `npm run lint`: clean · type checks (web and API): clean
- `npm test`: 50/50 pass · `npm run test:e2e`: 35/35 pass

## Already-known items (fix during whichever step touches the area, or any time)

| # | Item | Fix by |
|---|---|---|
| K1 | The API `lint` script runs with `--fix`, so it changes files. Add a check-only script for CI. | Any time |
| K2 | `test/app.e2e-spec.ts` isn't part of `npm run test:e2e`. Include it, or document that it needs a database. | Any time / Step 22 |
| K3 | The API falls back to a development secret when `JWT_SECRET` isn't set. It must refuse to start in production. | Before Step 22 |
| K4 | `POST /balances/preview` doesn't require sign-in (demo only). | Step 16 |

## Risk checklist (check whenever a step touches the area)

- **Dates:** expenses near midnight and at month or year boundaries; local date vs UTC between web and API.
- **Money:** decimal amounts stay exact through add, edit, totals, budgets, and splits.
- **Expired sign-in:** an expired token, or a password changed elsewhere, sends you to Sign In instead of showing broken pages.
- **API down:** a clear error and a Retry option on every screen.
- **Two writes at once:** the JSON-file storage doesn't lose or corrupt data on simultaneous saves (e.g. a double-tap on Save).
- **Deleted references:** an expense whose wallet, category, or group member no longer exists.
- **Empty states:** a brand-new account on every screen.
- **Form checks:** zero, negative, or very large amounts; long text; blank names.
- **Access:** a user can never read or change another user's or group's data.

## Bug log

| # | Found in step | Screen / area | Problem | Severity | Status | Fixed in |
|---|---|---|---|---|---|---|
| B1 | 10 | Sign-in / every page | When the API couldn't be reached on page load, the app sent a signed-in user to Sign In with no explanation (the saved session was kept, but it looked like a sign-out). Now shows "Can't reach PocketPlan" with **Try again** and **Sign out**; only a rejected token (401) signs the user out. | Medium | Fixed | Step 10 (`lib/auth.tsx`, `RequireAuth.tsx`) |
| B2 | 10 | Expenses: category filters | A grey horizontal scrollbar showed under the category filter chips on Windows. Hidden; the row still scrolls. | Low | Fixed | Step 10 |
| B4 | 10 | Whole app on desktop | Every page was locked to a 672px phone-width column (`max-w-2xl` in `AppShell` and `GroupScreen`), leaving large empty areas on desktop. Now: phones unchanged (bottom tab bar); tablets use the full width; desktop (≥1024px) has a sidebar and a content area up to 1280px, with two-column layouts on Home, Budgets, Profile, and the group Balances tab. | Medium | Fixed | Step 10 |
| B3 | 10 | Empty states | The planned "receipt" icon showed a **$** sign in a ৳ app. Switched to `ReceiptText`. | Low | Fixed | Step 10 |

**Severity:** High = wrong money, data loss, or a security problem · Medium = a feature broken but there's a workaround · Low = cosmetic.
