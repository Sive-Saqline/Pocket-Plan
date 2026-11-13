import { NextResponse, type NextRequest } from "next/server";
import { RECOVERY_COOKIE, safePath, sessionIdOf } from "@/lib/server/http";
import { supabaseServer } from "@/lib/server/supabase";

/**
 * Where Supabase sends people back from email links (sign-up confirmation and
 * password reset). Exchanges the one-time ?code= for a session, which is
 * stored in HttpOnly cookies, then continues to ?next=.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = safePath(url.searchParams.get("next"));
  const toLogin = (params: Record<string, string>) =>
    NextResponse.redirect(new URL(`/login?${new URLSearchParams(params)}`, url.origin));

  // Supabase reports expired or already-used links in the query string.
  const errorCode = url.searchParams.get("error_code");
  if (errorCode || url.searchParams.get("error")) {
    return toLogin({ error_code: errorCode ?? "link_error" });
  }

  const code = url.searchParams.get("code");
  if (!code) return toLogin({ error_code: "link_error" });

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    // Typically: the link was opened in another browser than the one that asked
    // for it. A sign-up link has already confirmed the email at this point.
    return toLogin({ error_code: next === "/reset-password" ? "reset_other_browser" : "confirmed_sign_in" });
  }

  const response = NextResponse.redirect(new URL(next, url.origin));
  if (next === "/reset-password") {
    // Lets /api/auth/reset-password set a new password without the old one,
    // but only for this session and for 15 minutes.
    response.cookies.set(RECOVERY_COOKIE, sessionIdOf(data.session.access_token) ?? "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
  }
  return response;
}
