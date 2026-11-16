import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { fail, INVITE_COOKIE, isSameOrigin, json, RECOVERY_COOKIE, sessionIdOf } from "@/lib/server/http";
import { friendlyAuthError, supabaseServer } from "@/lib/server/supabase";

/**
 * Sign-in actions, run on the server so the session only ever lives in
 * HttpOnly cookies:
 *   POST /api/auth/login            { email, password }
 *   POST /api/auth/register         { name, email, password }
 *   POST /api/auth/logout
 *   POST /api/auth/forgot-password  { email }
 *   POST /api/auth/reset-password   { password }            (after a reset link)
 *   POST /api/auth/change-password  { currentPassword, newPassword }
 *   POST /api/auth/invite-session   { accessToken, refreshToken }  (from a group-invite email)
 *   POST /api/auth/finish-invite    { password }                   (first password after that)
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const passwordProblem = (p: string) =>
  p.length < 8 ? "Password must be at least 8 characters" : p.length > 72 ? "Password must be at most 72 characters" : null;

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  if (!isSameOrigin(req)) return fail("Request blocked: it didn't come from PocketPlan.", 403);
  const { action } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const supabase = await supabaseServer();
  const origin = req.nextUrl.origin;

  switch (action) {
    case "login": {
      const email = str(body.email).trim();
      const password = str(body.password);
      if (!EMAIL.test(email) || !password) return fail("Enter your email and password", 400);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const e = friendlyAuthError(error);
        return fail(e.message, e.status);
      }
      return json({ ok: true });
    }

    case "register": {
      const name = str(body.name).trim();
      const email = str(body.email).trim();
      const password = str(body.password);
      if (!name || name.length > 60) return fail("Enter your name (up to 60 characters)", 400);
      if (!EMAIL.test(email)) return fail("Enter a valid email address", 400);
      const weak = passwordProblem(password);
      if (weak) return fail(weak, 400);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // `name` becomes the profile name (database trigger on_auth_user_created)
        options: { data: { name }, emailRedirectTo: `${origin}/auth/callback?next=/` },
      });
      if (error) {
        const e = friendlyAuthError(error);
        return fail(e.message, e.status);
      }
      // With confirmation on, an existing email comes back with no identities.
      if (data.user && data.user.identities?.length === 0) {
        return fail("An account with this email already exists", 409);
      }
      return json({ needsEmailConfirmation: !data.session });
    }

    case "logout": {
      await supabase.auth.signOut();
      (await cookies()).delete(RECOVERY_COOKIE);
      (await cookies()).delete(INVITE_COOKIE);
      return json({ ok: true });
    }

    case "forgot-password": {
      const email = str(body.email).trim();
      if (!EMAIL.test(email)) return fail("Enter a valid email address", 400);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });
      // Same answer whether or not the email has an account (no account probing),
      // except for rate limits, which the user needs to know about.
      if (error && error.status === 429) {
        const e = friendlyAuthError(error);
        return fail(e.message, e.status);
      }
      return json({ ok: true });
    }

    case "reset-password": {
      const password = str(body.password);
      const weak = passwordProblem(password);
      if (weak) return fail(weak, 400);
      const store = await cookies();
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      // Only a session that came from a reset link may skip the current password.
      if (!session || store.get(RECOVERY_COOKIE)?.value !== sessionIdOf(session.access_token)) {
        return fail("This reset link has expired. Ask for a new one.", 403);
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const e = friendlyAuthError(error);
        return fail(e.message, e.status);
      }
      store.delete(RECOVERY_COOKIE);
      await supabase.auth.signOut({ scope: "others" });
      return json({ ok: true });
    }

    case "change-password": {
      const currentPassword = str(body.currentPassword);
      const newPassword = str(body.newPassword);
      if (!currentPassword) return fail("Enter your current password", 400);
      const weak = passwordProblem(newPassword);
      if (weak) return fail(weak, 400);
      const { data } = await supabase.auth.getUser();
      if (!data.user?.email) return fail("Sign in again to change your password", 401);
      const check = await supabase.auth.signInWithPassword({ email: data.user.email, password: currentPassword });
      if (check.error) {
        const e = friendlyAuthError(check.error);
        return e.message === "Incorrect email or password"
          ? fail("Current password is incorrect", 400)
          : fail(e.message, e.status);
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        const e = friendlyAuthError(error);
        return fail(e.message, e.status);
      }
      await supabase.auth.signOut({ scope: "others" });
      return json({ ok: true });
    }

    case "invite-session": {
      // Supabase's invite email signs the person in with tokens in the URL
      // fragment (the server never sees it), so the page posts them here and
      // they move into HttpOnly cookies like any other session.
      const accessToken = str(body.accessToken);
      const refreshToken = str(body.refreshToken);
      if (!accessToken || !refreshToken) return fail("This invite link is incomplete. Ask for a new one.", 400);
      const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error || !data.session || !data.user?.invited_at) {
        return fail("This invite link has expired or was already used. Ask for a new one.", 401);
      }
      (await cookies()).set(INVITE_COOKIE, sessionIdOf(data.session.access_token) ?? "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      });
      return json({ ok: true });
    }

    case "finish-invite": {
      const password = str(body.password);
      const weak = passwordProblem(password);
      if (weak) return fail(weak, 400);
      const store = await cookies();
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      // Only the session that came from the invite email may set a password
      // without knowing a current one.
      if (!session || store.get(INVITE_COOKIE)?.value !== sessionIdOf(session.access_token)) {
        return fail("This setup link has expired. Sign in, or use Forgot password.", 403);
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const e = friendlyAuthError(error);
        return fail(e.message, e.status);
      }
      store.delete(INVITE_COOKIE);
      return json({ ok: true });
    }

    default:
      return fail("Not found", 404);
  }
}
