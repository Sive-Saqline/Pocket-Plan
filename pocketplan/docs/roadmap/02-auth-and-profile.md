# Step 02: Accounts, sign-in & profile

**Status:** ✅ Done · **PRD:** 6.1, 6.2

## What was built
- Register, sign in, and "who am I": `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
- Edit profile (name, theme) and change password: `PATCH /auth/me`, `POST /auth/change-password`. Changing the password signs out other devices.
- Passwords stored as bcrypt hashes; sign-in tokens are 7-day JWTs.
- Web: Sign In and Register pages, pages require sign-in, Profile screen, System/Light/Dark theme with no flash on load.
- Users stored in `apps/api/.data/users.json` behind the `UsersRepository` interface.

## Known gaps (picked up later)
- The PRD asks for **Supabase Auth**. Switching happens in Step 11.
- Password reset is not built. It comes with Supabase Auth in Step 11.
