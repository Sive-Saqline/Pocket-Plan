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
| K2 | `test/app.e2e-spec.ts` isn't part of `npm run test:e2e`. Include it once tests run against a database. | Step 11 |
| K3 | The API falls back to a development secret when `JWT_SECRET` isn't set. Goes away when sign-in moves to Supabase Auth. | Step 11 |
| K4 | ~~`POST /balances/preview` doesn't require sign-in (demo only).~~ **Resolved 2026-11-13:** endpoint removed with the demo data. | Done |

## Risk checklist (check whenever a step touches the area)

- **Dates:** expenses near midnight and at month or year boundaries; local date vs UTC between web and API.
- **Money:** decimal amounts stay exact through add, edit, totals, budgets, and splits.
- **Expired sign-in:** an expired token, or a password changed elsewhere, sends you to Sign In instead of showing broken pages.
- **API down:** a clear error and a Retry option on every screen.
- **Two writes at once:** simultaneous saves (e.g. a double-tap on Save) don't lose or duplicate data. From Step 11, multi-table writes use database transactions.
- **Half-saved data:** a failed multi-table write (e.g. a split expense, a confirmed recurring expense) leaves nothing half-saved.
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
| B6 | 11 | Sign-in security | The Supabase session (access and refresh token) was stored in `localStorage`, readable by any script on the page (XSS risk). Moved to HttpOnly cookies set by the Next.js server; API calls go through a server-side pass-through; same-origin check on all state-changing routes. | High | Fixed | Step 11 |
| B5 | 11 | Sign In / Register / Reset password | When Supabase accepted the password but the PocketPlan API was down (or rejected the session), the button spun "Signing in…" forever. Now the form stops and says the server isn't responding (or asks to sign in again). | Medium | Fixed | Step 11 (`lib/auth.tsx`) |
| B3 | 10 | Empty states | The planned "receipt" icon showed a **$** sign in a ৳ app. Switched to `ReceiptText`. | Low | Fixed | Step 10 |

**Severity:** High = wrong money, data loss, or a security problem · Medium = a feature broken but there's a workaround · Low = cosmetic.
