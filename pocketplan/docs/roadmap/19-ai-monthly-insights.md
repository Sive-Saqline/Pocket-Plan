# Step 19: AI: monthly insights

**Status:** ⏳ Not started · **PRD:** 6.16, 11 · **Depends on:** Step 18

## Goal
A short summary of the month in plain language, based on the user's real numbers.

## Tasks
1. `POST /ai/insights` (for the user, or for a group with `group_id`): the API gathers category totals, budgets, the previous month for comparison, and the Step 18 flags, then asks Claude for:
   - a short summary,
   - one note on anything unusual,
   - one forecast for next month.
2. Use only the user's actual numbers. Write it as information, never financial advice (PRD 11 and §14).
3. **Web:** an "Insights" card on Home and on Reports, generated **only when the user asks**, with loading, error, and retry states.
4. Tests with a fake AI: the right numbers are sent, failures are handled, and the user's data isn't changed.

## Done when
- [ ] Insights can be generated for personal and group views
- [ ] Clear error and retry when the AI is unavailable
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
