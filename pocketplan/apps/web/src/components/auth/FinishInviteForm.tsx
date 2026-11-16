"use client";

import { LinkIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApiError, authRequest } from "@/lib/api";
import { useAuth, type User } from "@/lib/auth";
import { AuthShell } from "./AuthShell";
import { FormAlert, SubmitButton } from "./SubmitButton";
import { TextField } from "./TextField";

/** Only same-site paths, so ?next= can't send people to another site. */
const safeNext = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/groups");

/**
 * Landing page of Supabase's "You have been invited" email. Supabase has
 * already created the account; the link carries a sign-in in the URL
 * fragment. We turn that into a normal (HttpOnly cookie) session, then the
 * person picks their name and a password, and goes on to the group invite.
 */
export function FinishInviteForm() {
  const { state, retry, request, setUser } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [phase, setPhase] = useState<"starting" | "ready" | "invalid">("starting");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // Never leave tokens in the address bar or browser history.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (hash.get("error") || !accessToken || !refreshToken) {
      setLinkError(hash.get("error_description"));
      setPhase("invalid");
      return;
    }
    authRequest("invite-session", { accessToken, refreshToken })
      .then(() => {
        retry();
        setPhase("ready");
      })
      .catch((err) => {
        setLinkError(err instanceof ApiError ? err.message : null);
        setPhase("invalid");
      });
  }, [retry]);

  // Suggest the name the account was created with (the email's first part).
  useEffect(() => {
    if (state.status === "authenticated" && !name) setName(state.user.name);
  }, [state, name]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next_: typeof errors = {};
    if (!name.trim() || name.trim().length > 60) next_.name = "Enter your name (up to 60 characters)";
    if (password.length < 8) next_.password = "Password must be at least 8 characters";
    else if (password.length > 72) next_.password = "Password must be at most 72 characters";
    setErrors(next_);
    if (Object.keys(next_).length) return;
    setBusy(true);
    setFormError(null);
    try {
      await authRequest("finish-invite", { password });
      setUser(await request<User>("/auth/me", { method: "PATCH", body: { name: name.trim() } }));
      router.replace(next);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't finish setting up. Try again.");
      setBusy(false);
    }
  }

  if (phase === "invalid") {
    return (
      <AuthShell title="Join PocketPlan" subtitle="This invite link can't be used." footer={null}>
        <EmptyState
          icon={LinkIcon}
          title="Link expired or already used"
          text={linkError ?? "Invite emails work once and expire. If you already set a password, just sign in; otherwise ask for a new invite."}
        >
          <Link href={`/login?returnTo=${encodeURIComponent(next)}`} className={buttonClass()}>
            Sign in
          </Link>
          <Link href="/forgot-password" className={buttonClass("ghost")}>
            Forgot password
          </Link>
        </EmptyState>
      </AuthShell>
    );
  }

  if (phase === "starting" || state.status !== "authenticated") {
    return <AuthShell title="Join PocketPlan" subtitle="Checking your invite…" footer={null}>{null}</AuthShell>;
  }

  return (
    <AuthShell title="Set up your account" subtitle={`You're signing up as ${state.user.email}.`} footer={null}>
      <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formError} />
        <TextField
          id="invite-name"
          label="Your name"
          autoComplete="name"
          value={name}
          maxLength={60}
          error={errors.name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          id="invite-password"
          label="Choose a password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters. You'll use it to sign in."
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <SubmitButton busy={busy}>{busy ? "Saving…" : "Continue to the group"}</SubmitButton>
      </form>
    </AuthShell>
  );
}
