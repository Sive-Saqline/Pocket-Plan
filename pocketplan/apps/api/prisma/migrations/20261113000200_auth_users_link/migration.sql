-- Links PocketPlan's users table to Supabase Auth (auth.users).
--
-- * users.id IS the Supabase Auth user id; deleting the auth user deletes the
--   profile and, through the existing cascades, all of that user's data.
-- * Signing up creates the profile row, the 9 default categories (PRD §6.3,
--   icon keys from apps/web/src/components/ui/icons.tsx) and a Cash wallet,
--   all in the same transaction as the sign-up itself.
-- * Changing the sign-in email in Supabase Auth updates users.email.
--
-- The web app passes the display name at sign-up as user metadata:
--   supabase.auth.signUp({ email, password, options: { data: { name } } })

ALTER TABLE "public"."users"
  ADD CONSTRAINT "users_id_fkey"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

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

  INSERT INTO public.categories (user_id, name, icon)
  SELECT NEW.id, c.name, c.icon
  FROM (VALUES
    ('Food', 'food'),
    ('Transport', 'transport'),
    ('Bills', 'bills'),
    ('Shopping', 'shopping'),
    ('Health', 'health'),
    ('Education', 'education'),
    ('Entertainment', 'entertainment'),
    ('Savings', 'savings'),
    ('Miscellaneous', 'misc')
  ) AS c(name, icon);

  INSERT INTO public.accounts (user_id, name, type)
  VALUES (NEW.id, 'Cash', 'CASH'::public."AccountType");

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_user_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users
  SET email = coalesce(lower(NEW.email), NEW.id::text), updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger functions only; nobody should call them through the API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_email_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_user_email_change();
