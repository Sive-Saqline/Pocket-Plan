-- Savings goals (roadmap Step 13, PRD v4 §6.8).
--
-- The saved amount for a month is the total of that month's expenses in the
-- user's Savings category. Since Step 12 a category can be renamed (and its
-- icon changed), so the Savings category is identified by a fixed system key
-- instead of its name. The API refuses to delete it; renaming is fine.
--
-- * categories.system_key: 'savings' on exactly one category per user, NULL
--   on every other category.
-- * Existing users: the category named "Savings" (any case) is marked; else
--   the oldest category with the savings icon; else a new "Savings" category
--   is created, so every user ends up with exactly one.
-- * New users: the sign-up trigger marks the default Savings category.

ALTER TABLE "categories" ADD COLUMN "system_key" TEXT;

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_system_key_valid" CHECK ("system_key" IN ('savings'));

-- NULLs never clash, so this only limits each user to one category per key.
CREATE UNIQUE INDEX "categories_user_id_system_key_key"
  ON "categories"("user_id", "system_key");

-- 1. A category named "Savings" (oldest first, if the name exists in two cases).
UPDATE "categories" c
SET "system_key" = 'savings'
FROM (
  SELECT DISTINCT ON ("user_id") "id"
  FROM "categories"
  WHERE lower(btrim("name")) = 'savings'
  ORDER BY "user_id", "created_at", "id"
) pick
WHERE c."id" = pick."id";

-- 2. Users still without one: the oldest category with the savings icon.
UPDATE "categories" c
SET "system_key" = 'savings'
FROM (
  SELECT DISTINCT ON ("user_id") "id"
  FROM "categories" x
  WHERE x."icon" = 'savings'
    AND NOT EXISTS (
      SELECT 1 FROM "categories" s
      WHERE s."user_id" = x."user_id" AND s."system_key" = 'savings'
    )
  ORDER BY "user_id", "created_at", "id"
) pick
WHERE c."id" = pick."id";

-- 3. Everyone else gets a new Savings category. No name clash is possible:
--    a category called "Savings" would have been picked in step 1.
INSERT INTO "categories" ("user_id", "name", "icon", "system_key")
SELECT u."id", 'Savings', 'savings', 'savings'
FROM "users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "categories" s
  WHERE s."user_id" = u."id" AND s."system_key" = 'savings'
);

-- Sign-up: same as before (migration *_auth_users_link), plus the system key
-- on the default Savings category.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (
    NEW.id,
    left(coalesce(nullif(btrim(NEW.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(NEW.email, 'user'), '@', 1)), 60),
    coalesce(lower(NEW.email), NEW.id::text)
  );

  INSERT INTO public.categories (user_id, name, icon, system_key)
  SELECT NEW.id, c.name, c.icon, c.system_key
  FROM (VALUES
    ('Food', 'food', NULL),
    ('Transport', 'transport', NULL),
    ('Bills', 'bills', NULL),
    ('Shopping', 'shopping', NULL),
    ('Health', 'health', NULL),
    ('Education', 'education', NULL),
    ('Entertainment', 'entertainment', NULL),
    ('Savings', 'savings', 'savings'),
    ('Miscellaneous', 'misc', NULL)
  ) AS c(name, icon, system_key);

  INSERT INTO public.accounts (user_id, name, type)
  VALUES (NEW.id, 'Cash', 'CASH'::public."AccountType");

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
