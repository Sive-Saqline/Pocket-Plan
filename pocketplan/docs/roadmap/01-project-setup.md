# Step 01: Project setup

**Status:** ✅ Done · **PRD:** Phase 0

## What was built
- Monorepo with npm workspaces: `apps/api` (NestJS 10) and `apps/web` (Next.js 15, App Router, Tailwind 4).
- Shared scripts: `build`, `lint`, `test`, `test:e2e`, `dev:api`, `dev:web`, `db:*`.
- `GET /health` endpoint.
- `.env.example` files for both apps.

## Known gaps (picked up later)
- No Supabase project connected yet: Step 22.
- `apps/web/public/` is empty (no logo or app icons): Step 10.
