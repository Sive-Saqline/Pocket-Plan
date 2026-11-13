import type { NextRequest } from "next/server";
import { fail, isSameOrigin } from "@/lib/server/http";
import { supabaseServer } from "@/lib/server/supabase";

/**
 * Pass-through to the PocketPlan API: /api/pp/<path> → API_URL/<path>.
 * The browser never holds a token. This route reads the session from the
 * HttpOnly cookies (renewing it when it has expired) and adds
 * "Authorization: Bearer <token>" itself. The API still verifies every token.
 */

const API_URL = (process.env.API_URL ?? "http://localhost:3001").replace(/\/+$/, "");
// Routes the API serves without signing in.
const PUBLIC = new Set(["health"]);
const TIMEOUT_MS = 20_000;

async function forward(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (!isSameOrigin(req)) return fail("Request blocked: it didn't come from PocketPlan.", 403);
  const path = (await params).path.join("/");

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getSession(); // refreshes an expired access token
  const token = data.session?.access_token;
  if (!token && !PUBLIC.has(path)) return fail("Sign in to continue", 401);

  const headers = new Headers({ Accept: "application/json" });
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/${path}${req.nextUrl.search}`, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    return fail("Can't reach the PocketPlan API.", 503);
  }
  if (res.status === 204) return new Response(null, { status: 204 });
  return new Response(await res.arrayBuffer(), {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
