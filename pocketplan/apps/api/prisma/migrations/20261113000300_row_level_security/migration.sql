-- Row-level security (PRD §12): every table is locked down.
--
-- How access works:
-- * The NestJS API connects as the database owner through Prisma and checks
--   the signed-in user on every query itself. These policies don't affect it.
-- * Anyone using Supabase's public endpoints (anon key) sees nothing.
-- * A signed-in user (authenticated role) going to Supabase directly can only
--   reach their own rows, plus the groups they belong to. This is a second
--   line of defence if a key leaks or the web app ever reads Supabase directly.
--
-- auth.uid() is wrapped in (select ...) so Postgres evaluates it once per
-- query, not once per row (Supabase's recommended pattern).

-- ---------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so they can read group_members without tripping
-- group_members' own policies (which would otherwise recurse).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_group_member(gid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members m
    WHERE m.group_id = gid AND m.user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner(gid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members m
    WHERE m.group_id = gid AND m.user_id = (SELECT auth.uid()) AND m.role = 'OWNER'
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_group_with(other uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members me
    JOIN public.group_members them ON them.group_id = me.group_id
    WHERE me.user_id = (SELECT auth.uid()) AND them.user_id = other
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid), public.is_group_owner(uuid), public.shares_group_with(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid), public.is_group_owner(uuid), public.shares_group_with(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Turn RLS on everywhere (including Prisma's own bookkeeping table), and take
-- away the public (anon) role's table access entirely.
-- ---------------------------------------------------------------------------
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._prisma_migrations   ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON public._prisma_migrations FROM authenticated;

-- ---------------------------------------------------------------------------
-- Profile: read your own, and the people you share a group with (to show
-- their names); edit only your own. Rows are created by the sign-up trigger
-- and removed when the auth user is deleted.
-- ---------------------------------------------------------------------------
CREATE POLICY "users: read self and group mates" ON public.users
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR public.shares_group_with(id));

CREATE POLICY "users: update self" ON public.users
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- Personal data: only the owner, for every action.
-- ---------------------------------------------------------------------------
CREATE POLICY "accounts: owner only" ON public.accounts
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "categories: owner only" ON public.categories
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "budgets: owner only" ON public.budgets
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "recurring_expenses: owner only" ON public.recurring_expenses
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "savings_goals: owner only" ON public.savings_goals
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- Expenses: personal ones belong to whoever recorded them; group ones are
-- visible to every member of that group. Only the recorder edits or deletes.
-- ---------------------------------------------------------------------------
CREATE POLICY "expenses: read own and my groups" ON public.expenses
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR paid_by = (SELECT auth.uid())
    OR (group_id IS NOT NULL AND public.is_group_member(group_id))
  );

CREATE POLICY "expenses: add own" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (group_id IS NULL OR public.is_group_member(group_id))
  );

CREATE POLICY "expenses: recorder edits" ON public.expenses
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (group_id IS NULL OR public.is_group_member(group_id))
  );

CREATE POLICY "expenses: recorder deletes" ON public.expenses
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Shares follow the expense: visible if the expense is visible, written only
-- by the person who recorded the expense.
CREATE POLICY "expense_participants: read with expense" ON public.expense_participants
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id));

CREATE POLICY "expense_participants: recorder writes" ON public.expense_participants
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND e.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND e.user_id = (SELECT auth.uid())));

-- ---------------------------------------------------------------------------
-- Groups (PRD §6.10-6.11): members read; the creator makes it; owners manage.
-- ---------------------------------------------------------------------------
CREATE POLICY "groups: members read" ON public.groups
  FOR SELECT TO authenticated
  USING (public.is_group_member(id) OR created_by = (SELECT auth.uid()));

CREATE POLICY "groups: create as yourself" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "groups: owners update" ON public.groups
  FOR UPDATE TO authenticated
  USING (public.is_group_owner(id)) WITH CHECK (public.is_group_owner(id));

CREATE POLICY "groups: owners delete" ON public.groups
  FOR DELETE TO authenticated
  USING (public.is_group_owner(id));

CREATE POLICY "group_members: members read" ON public.group_members
  FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));

-- Owners add people; a group's creator can add themselves as its first owner.
CREATE POLICY "group_members: owners add" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_group_owner(group_id)
    OR (
      user_id = (SELECT auth.uid())
      AND role = 'OWNER'
      AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by = (SELECT auth.uid()))
    )
  );

CREATE POLICY "group_members: owners change roles" ON public.group_members
  FOR UPDATE TO authenticated
  USING (public.is_group_owner(group_id)) WITH CHECK (public.is_group_owner(group_id));

-- Owners remove people; anyone can leave.
CREATE POLICY "group_members: owners remove, members leave" ON public.group_members
  FOR DELETE TO authenticated
  USING (public.is_group_owner(group_id) OR user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- Settlements (PRD §9.3): members read; only the two people involved record
-- or undo one.
-- ---------------------------------------------------------------------------
CREATE POLICY "settlements: members read" ON public.settlements
  FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));

CREATE POLICY "settlements: parties record" ON public.settlements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_group_member(group_id)
    AND (SELECT auth.uid()) IN (from_user_id, to_user_id)
  );

CREATE POLICY "settlements: parties undo" ON public.settlements
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IN (from_user_id, to_user_id));
