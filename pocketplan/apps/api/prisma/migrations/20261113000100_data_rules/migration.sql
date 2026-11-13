-- Data rules the database enforces itself, on top of the API's validation,
-- so bad data can't get in from anywhere (API, SQL editor, table editor).
-- Prisma can't describe CHECK constraints in schema.prisma; they live here.

-- Names can't be blank.
ALTER TABLE "users"      ADD CONSTRAINT "users_name_not_blank"      CHECK (char_length(btrim("name")) > 0);
ALTER TABLE "accounts"   ADD CONSTRAINT "accounts_name_not_blank"   CHECK (char_length(btrim("name")) > 0);
ALTER TABLE "categories" ADD CONSTRAINT "categories_name_not_blank" CHECK (char_length(btrim("name")) > 0);
ALTER TABLE "groups"     ADD CONSTRAINT "groups_name_not_blank"     CHECK (char_length(btrim("name")) > 0);

-- Money: spending amounts are always above ৳0 (PRD §6). A wallet balance is
-- informational and may be anything (Decision 6).
ALTER TABLE "expenses"           ADD CONSTRAINT "expenses_amount_positive"           CHECK ("amount" > 0);
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "budgets"            ADD CONSTRAINT "budgets_planned_amount_positive"    CHECK ("planned_amount" > 0);
ALTER TABLE "savings_goals"      ADD CONSTRAINT "savings_goals_target_positive"      CHECK ("target_amount" > 0);
ALTER TABLE "groups"             ADD CONSTRAINT "groups_monthly_budget_positive"     CHECK ("monthly_budget" IS NULL OR "monthly_budget" > 0);
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_share_not_negative" CHECK ("share_amount" >= 0);
ALTER TABLE "settlements"        ADD CONSTRAINT "settlements_amount_positive"        CHECK ("amount" > 0);

-- A settlement is a payment between two different people.
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_different_people" CHECK ("from_user_id" <> "to_user_id");

-- Months are 1-12; years stay in a sensible range.
ALTER TABLE "budgets"       ADD CONSTRAINT "budgets_month_valid"       CHECK ("month" BETWEEN 1 AND 12 AND "year" BETWEEN 2000 AND 2100);
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_month_valid" CHECK ("month" BETWEEN 1 AND 12 AND "year" BETWEEN 2000 AND 2100);

-- A recurring expense can't be due before it starts.
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_due_after_start" CHECK ("next_due_date" >= "start_date");
