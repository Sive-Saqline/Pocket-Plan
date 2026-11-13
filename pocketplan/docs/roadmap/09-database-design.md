# Step 09: Database design (schema only)

**Status:** ✅ Done · **PRD:** 8

## What was built
- `apps/api/prisma/schema.prisma` describes every v4 table: users, accounts, categories, budgets, expenses (with `group_id` and `paid_by`), recurring_expenses, savings_goals, groups, group_members, expense_participants, settlements. It includes the indexes and unique rules from the PRD.
- Prisma client and `PrismaService` are set up.

## Known gaps (picked up later)
- No migrations have been run, and the app doesn't read or write the database yet: Step 22.
- **Rule for Steps 10–21:** if a feature needs a new field, add it to the feature's types **and** to `schema.prisma` in the same step, so the schema never falls behind.
