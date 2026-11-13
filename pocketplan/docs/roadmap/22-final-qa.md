# Step 22: Final QA & release readiness

**Status:** ⏳ Not started · **PRD:** 12, Phase 16 · **Depends on:** Step 21

## Goal
One full check of the whole app before it goes live in Step 23.

## Tasks
1. **Check against the PRD:** go through every requirement in PRD v4 §6 and §10–12 and mark it met, not met, or deferred.
2. **End-to-end walkthroughs** for each PRD use case: a flat share or mess, a couple, a trip, a shared subscription. Also a single user from sign-up (including password reset) to month end.
3. **Security check:** every route requires sign-in; no user can read another user's or group's data (through the API **and** through Supabase directly with the public key); row-level security is on for every table; inputs are checked; no secrets in the code.
4. **Run the full risk checklist** from [ongoing-bug-fixing.md](ongoing-bug-fixing.md) across the whole app.
5. **Performance:** pages load quickly with a realistic amount of data (e.g. a year of expenses and a 6-person group).
6. Update the README and the PRD status.

## Done when
- [ ] PRD checklist complete, with any gaps either fixed or agreed as deferred
- [ ] Every walkthrough passes; no open High bugs
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
