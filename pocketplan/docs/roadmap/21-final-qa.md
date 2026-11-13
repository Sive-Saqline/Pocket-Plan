# Step 21: Final QA & release readiness

**Status:** ⏳ Not started · **PRD:** 12, Phase 16 · **Depends on:** Step 20

## Goal
One full check of the whole app before changing the storage underneath it in Step 22.

## Tasks
1. **Check against the PRD:** go through every requirement in PRD v4 §6 and §10–12 and mark it met, not met, or deferred.
2. **End-to-end walkthroughs** for each PRD use case: a flat share or mess, a couple, a trip, a shared subscription. Also a single user from sign-up to month end.
3. **Security check:** every route requires sign-in; no user can read another user's or group's data; inputs are checked; no secrets in the code.
4. **Run the full risk checklist** from [ongoing-bug-fixing.md](ongoing-bug-fixing.md) across the whole app.
5. **Write down the expected behaviour** of the API tests, so Step 22 can prove the database version behaves exactly the same.
6. Update the README and the PRD status.

## Done when
- [ ] PRD checklist complete, with any gaps either fixed or agreed as deferred
- [ ] Every walkthrough passes; no open High bugs
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
