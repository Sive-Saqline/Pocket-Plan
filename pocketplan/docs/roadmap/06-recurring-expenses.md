# Step 06: Recurring expenses

**Status:** ✅ Done · **PRD:** 6.7

## What was built
- Templates for repeating expenses: daily, weekly, monthly, or yearly. They can be paused.
- `GET|POST /recurring-expenses`, `PATCH|DELETE /recurring-expenses/:id`, `POST /recurring-expenses/:id/confirm`.
- Nothing is added automatically. When a template is due, a banner appears on Home and a red dot on More. You review it, then Confirm or Skip.
- "Due" is worked out from the user's local date (`?today=`); there's no background job.
- A bill on the 31st falls on 28 Feb and goes back to the 31st in March.
- Unit tests: `schedule.spec.ts`. API tests: `recurring.e2e-spec.ts`.
