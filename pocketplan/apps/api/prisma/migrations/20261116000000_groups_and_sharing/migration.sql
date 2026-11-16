-- Groups, invitations and shared expenses (roadmap Steps 15-17, PRD v4 §6.10-6.13, §9, §12).
--
-- * Group expenses no longer point at anyone's personal category or wallet,
--   so deleting a personal category/wallet can never delete group history.
--   They carry a shared category key (group_category) instead.
-- * Four split methods; each participant's exact share is stored in taka and
--   the database checks (at commit) that the shares add up to the amount.
-- * Leaving or being removed from a group keeps the membership row (left_at),
--   so past expenses still show who took part.
-- * group_invites: email or shareable-link invitations; only a SHA-256 hash of
--   the invite token is stored.
-- No group data existed before this migration, so nothing needs converting.

-- ---------------------------------------------------------------------------
-- Split methods
-- ---------------------------------------------------------------------------
CREATE TYPE "SplitType" AS ENUM ('EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES');

-- ---------------------------------------------------------------------------
-- Expenses: personal ones keep category + wallet; group ones use a shared
-- category key, a payer and a split method.
-- ---------------------------------------------------------------------------
ALTER TABLE "expenses"
  ALTER COLUMN "account_id" DROP NOT NULL,
  ALTER COLUMN "category_id" DROP NOT NULL,
  ADD COLUMN "group_category" TEXT,
  ADD COLUMN "split_type" "SplitType";

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_personal_or_group_complete" CHECK (
  (
    "group_id" IS NULL
    AND "account_id" IS NOT NULL AND "category_id" IS NOT NULL
    AND "group_category" IS NULL AND "split_type" IS NULL
  )
  OR (
    "group_id" IS NOT NULL
    AND "account_id" IS NULL AND "category_id" IS NULL
    AND "group_category" IS NOT NULL AND "split_type" IS NOT NULL
    AND "paid_by" IS NOT NULL
  )
);

-- Shared history must keep its people: a user who paid for, took part in, or
-- settled a group expense can't be deleted out from under the group.
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_paid_by_fkey";
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_fkey"
  FOREIGN KEY ("paid_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expense_participants" DROP CONSTRAINT "expense_participants_user_id_fkey";
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "settlements" DROP CONSTRAINT "settlements_from_user_id_fkey";
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_user_id_fkey"
  FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_to_user_id_fkey";
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_user_id_fkey"
  FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- What the person typed for a percentage / shares / exact split, so editing
-- shows it again. share_amount stays the computed taka amount.
ALTER TABLE "expense_participants" ADD COLUMN "share_value" DECIMAL(12, 4);
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_share_value_positive"
  CHECK ("share_value" IS NULL OR "share_value" > 0);

CREATE INDEX "expense_participants_user_id_idx" ON "expense_participants"("user_id");

-- ---------------------------------------------------------------------------
-- Shares of a group expense always add up to its amount. Checked when the
-- transaction commits, so an expense and its shares can be written in any
-- order inside one transaction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_group_expense_shares(eid uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  e_amount numeric;
  e_group uuid;
  total numeric;
  n integer;
BEGIN
  SELECT amount, group_id INTO e_amount, e_group FROM public.expenses WHERE id = eid;
  IF NOT FOUND OR e_group IS NULL THEN
    RETURN; -- deleted, or a personal expense
  END IF;
  SELECT coalesce(sum(share_amount), 0), count(*) INTO total, n
  FROM public.expense_participants WHERE expense_id = eid;
  IF n = 0 OR total <> e_amount THEN
    RAISE EXCEPTION 'Shares of group expense % add up to % instead of %', eid, total, e_amount
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_shares_on_expense()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  PERFORM public.assert_group_expense_shares(NEW.id);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_shares_on_participant()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.assert_group_expense_shares(OLD.expense_id);
  ELSE
    PERFORM public.assert_group_expense_shares(NEW.expense_id);
    IF TG_OP = 'UPDATE' AND OLD.expense_id <> NEW.expense_id THEN
      PERFORM public.assert_group_expense_shares(OLD.expense_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assert_group_expense_shares(uuid), public.check_shares_on_expense(), public.check_shares_on_participant() FROM PUBLIC, anon, authenticated;

CREATE CONSTRAINT TRIGGER "expenses_shares_add_up"
  AFTER INSERT OR UPDATE OF "amount", "group_id" ON "expenses"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.check_shares_on_expense();

CREATE CONSTRAINT TRIGGER "expense_participants_shares_add_up"
  AFTER INSERT OR UPDATE OR DELETE ON "expense_participants"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.check_shares_on_participant();

-- ---------------------------------------------------------------------------
-- Membership history
-- ---------------------------------------------------------------------------
ALTER TABLE "group_members" ADD COLUMN "left_at" TIMESTAMP(3);
CREATE INDEX "group_members_group_id_left_at_idx" ON "group_members"("group_id", "left_at");

-- ---------------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------------
CREATE TABLE "group_invites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "email" TEXT,
    "token_hash" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "invited_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_by" UUID,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "group_invites_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "group_invites_email_normalized" CHECK ("email" IS NULL OR ("email" = lower(btrim("email")) AND "email" <> '')),
    CONSTRAINT "group_invites_expires_after_created" CHECK ("expires_at" > "created_at")
);

CREATE UNIQUE INDEX "group_invites_token_hash_key" ON "group_invites"("token_hash");
CREATE INDEX "group_invites_group_id_idx" ON "group_invites"("group_id");
CREATE INDEX "group_invites_email_idx" ON "group_invites"("email");

ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_invited_by_fkey"
  FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_accepted_by_fkey"
  FOREIGN KEY ("accepted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row-level security (second line of defence; the API checks every request).
-- People who left a group lose access to it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_group_member(gid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members m
    WHERE m.group_id = gid AND m.user_id = (SELECT auth.uid()) AND m.left_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner(gid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members m
    WHERE m.group_id = gid AND m.user_id = (SELECT auth.uid())
      AND m.role = 'OWNER' AND m.left_at IS NULL
  );
$$;

-- Members still see the names of people who have left (they appear in history).
CREATE OR REPLACE FUNCTION public.shares_group_with(other uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members me
    JOIN public.group_members them ON them.group_id = me.group_id
    WHERE me.user_id = (SELECT auth.uid()) AND me.left_at IS NULL AND them.user_id = other
  );
$$;

ALTER TABLE "group_invites" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "group_invites" FROM anon;

-- Owners can see their group's invites. Creating, accepting and revoking go
-- through the API only (it checks the token and the invited email).
CREATE POLICY "group_invites: owners read" ON public.group_invites
  FOR SELECT TO authenticated
  USING (public.is_group_owner(group_id));
