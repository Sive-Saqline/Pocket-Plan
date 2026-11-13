import "server-only";
import { NextResponse, type NextRequest } from "next/server";

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
export const fail = (message: string, status: number) => json({ message }, status);

/**
 * Cookie-based sign-in makes cross-site request forgery (CSRF) possible:
 * another site could try to submit a form to our routes with the user's
 * cookies attached. SameSite=Lax already blocks cross-site POSTs; this also
 * requires state-changing requests to say they come from our own origin.
 */
export function isSameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return true;
  const origin = req.headers.get("origin");
  return origin !== null && origin === req.nextUrl.origin;
}

/** Only same-site paths, so ?next= can't bounce users to another site. */
export function safePath(value: string | null, fallback = "/") {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

/** The session id inside a Supabase access token (read only; the API verifies tokens). */
export function sessionIdOf(accessToken: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.session_id === "string" ? payload.session_id : null;
  } catch {
    return null;
  }
}

export const RECOVERY_COOKIE = "pp_recovery";
