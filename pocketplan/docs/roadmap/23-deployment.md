# Step 23: Deployment

**Status:** ⏳ Not started (**last step**) · **PRD:** 5, Phase 16 · **Depends on:** Step 22

## Goal
Put PocketPlan live: production Supabase, hosted API and web app, and a checked release.

## Tasks
1. **Production Supabase project**, separate from development (Step 11): run all migrations, turn on row-level security, create the Storage bucket, set the Auth settings (site URL, password-reset email, redirect URLs).
2. **Hosting:** choose and set up hosting for the web app and the API. Set all secrets as environment variables there; never in the code.
3. **Production settings:** `WEB_ORIGIN` set to the real site address; error responses don't leak internal details; the AI key only on the server.
4. **Release process:** staging deploys on every merge to `main`; production needs a manual approval (team practice, see `org.md`). Write down how to **roll back** a release.
5. **Monitoring:** at least a health check (`/health`) and an error-rate alert, and a place to see logs.
6. **Smoke test on the live site:** sign up, reset a password, add an expense, set a budget, confirm a recurring expense, upload a profile photo, create a group and settle up.

## Done when
- [ ] The app is live on its production address
- [ ] The smoke test passes on the live site
- [ ] The rollback steps are written down and were tried once on staging
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
