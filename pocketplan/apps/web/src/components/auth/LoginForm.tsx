"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { safeReturnTo, useAuth } from "@/lib/auth";
import { AuthShell } from "./AuthShell";
import { FormAlert, SubmitButton } from "./SubmitButton";
import { TextField } from "./TextField";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const { state, login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));
  const registerHref = returnTo === "/" ? "/register" : `/register?returnTo=${encodeURIComponent(returnTo)}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state.status === "authenticated") router.replace(returnTo);
  }, [state.status, returnTo, router]);

  // Email links that couldn't sign the user in come back here with a reason
  // (app/auth/callback/route.ts).
  const linkCode = params.get("error_code");
  const linkNotice =
    linkCode === "confirmed_sign_in"
      ? { info: true, text: "Your email is confirmed. Sign in to continue." }
      : linkCode === "reset_other_browser"
        ? { info: false, text: "Open the reset link in the same browser where you asked for it, or request a new one." }
        : linkCode
          ? { info: false, text: "That email link has expired or was already used. Sign in, or request a new link." }
          : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!EMAIL.test(email.trim())) next.email = "Enter a valid email address";
    if (!password) next.password = "Enter your password";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see your budgets and groups."
      footer={
        <>
          New to PocketPlan?{" "}
          <Link href={registerHref} className="font-semibold text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {/* method="post": a submit before hydration must never put the password in the URL */}
      <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {linkNotice && !formError && (
          <p
            role="status"
            className={`rounded-lg border px-3 py-2.5 text-sm ${
              linkNotice.info ? "border-success/40 bg-success/10" : "border-warning/50 bg-warning/15"
            }`}
          >
            {linkNotice.text}
          </p>
        )}
        <FormAlert message={formError} />
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors((x) => ({ ...x, email: undefined }));
          }}
          error={errors.email}
          autoFocus
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((x) => ({ ...x, password: undefined }));
          }}
          error={errors.password}
        />
        <Link href="/forgot-password" className="-mt-2 self-end text-sm font-semibold text-accent hover:underline">
          Forgot password?
        </Link>
        <SubmitButton busy={busy}>{busy ? "Signing in…" : "Sign in"}</SubmitButton>
      </form>
    </AuthShell>
  );
}
