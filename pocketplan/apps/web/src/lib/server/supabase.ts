import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { AuthError } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Supabase Auth on the Next.js server. The session (access + refresh token)
 * lives only in HttpOnly cookies: page JavaScript can never read it, so a
 * script injected into the page (XSS) can't steal it. The browser talks to
 * our own /api/* routes; those read the cookies and act on the user's behalf.
 *
 * Cookies are SameSite=Lax (not sent on cross-site POSTs) and Secure in
 * production. PKCE flow: email links come back as ?code= to /auth/callback.
 */
export async function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in apps/web/.env.local");
  }
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        for (const { name, value, options } of list) {
          store.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          });
        }
      },
    },
  });
}

/** Supabase's messages in the app's words, with an HTTP status for our routes. */
export function friendlyAuthError(err: AuthError): { message: string; status: number } {
  const msg = err.message.toLowerCase();
  if (err.code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return { message: "Incorrect email or password", status: 400 };
  }
  if (err.code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return { message: "Confirm your email first: open the link we sent you, then sign in.", status: 400 };
  }
  if (err.code === "user_already_exists" || msg.includes("already registered")) {
    return { message: "An account with this email already exists", status: 409 };
  }
  if (err.code === "same_password" || msg.includes("different from the old")) {
    return { message: "New password must be different from the current one", status: 400 };
  }
  if (err.code === "weak_password" || msg.includes("password should")) {
    return { message: err.message, status: 400 };
  }
  if (err.status === 429 || msg.includes("rate limit")) {
    return { message: "Too many attempts. Wait a minute and try again.", status: 429 };
  }
  return { message: "The sign-in service had a problem. Try again.", status: 502 };
}
