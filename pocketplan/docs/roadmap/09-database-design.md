# Step 09: Database design (schema only)

**Status:** ✅ Done · **PRD:** 8

## What was built
- `apps/api/prisma/schema.prisma` describes every v4 table: users, accounts, categories, budgets, expenses (with `group_id` and `paid_by`), recurring_expenses, savings_goals, groups, group_members, expense_participants, settlements. It includes the indexes and unique rules from the PRD.
- Prisma client and `PrismaService` are set up.

## Known gaps (picked up later)
- No migrations have been run, and the app doesn't read or write the database yet: Step 11.
- The schema doesn't store the user's theme preference yet (added in Step 11). `avatar_url` was added in Step 10.
- **Rule from Step 11 on:** a feature that needs new tables or fields adds them to `schema.prisma` **with a migration in the same step**, plus row-level security for any new table.
