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
        <SubmitButton busy={busy}>{busy ? "Signing in…" : "Sign in"}</SubmitButton>
      </form>
    </AuthShell>
  );
}
