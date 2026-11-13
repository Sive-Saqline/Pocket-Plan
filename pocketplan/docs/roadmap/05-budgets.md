# Step 05: Budgets

**Status:** ✅ Done · **PRD:** 6.5

## What was built
- A monthly limit per category; you can plan one month ahead and copy last month's budgets.
- `GET /budgets`, `PUT /budgets`, `DELETE /budgets/:categoryId`, `POST /budgets/copy`.
- Budget bars change colour as spending rises (teal, then amber at 80%, red at 100%), always with a text label as well.
- The Add Expense sheet warns before saving if the expense would go over budget.
- Unit tests: `budgets.spec.ts`.
