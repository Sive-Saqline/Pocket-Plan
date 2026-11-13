"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { safeReturnTo, useAuth } from "@/lib/auth";
import { AuthShell } from "./AuthShell";
import { FormAlert, SubmitButton } from "./SubmitButton";
import { TextField } from "./TextField";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Field = "name" | "email" | "password";

export function RegisterForm() {
  const { state, register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));
  const loginHref = returnTo === "/" ? "/login" : `/login?returnTo=${encodeURIComponent(returnTo)}`;

  const [values, setValues] = useState<Record<Field, string>>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "authenticated") router.replace(returnTo);
  }, [state.status, returnTo, router]);

  const bind = (field: Field) => ({
    value: values[field],
    error: errors[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }));
      setErrors((x) => ({ ...x, [field]: undefined }));
    },
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!values.name.trim()) next.name = "Enter your name";
    if (!EMAIL.test(values.email.trim())) next.email = "Enter a valid email address";
    if (values.password.length < 8) next.password = "Password must be at least 8 characters";
    else if (values.password.length > 72) next.password = "Password must be at most 72 characters";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const { needsEmailConfirmation } = await register(values.name.trim(), values.email.trim(), values.password);
      if (needsEmailConfirmation) {
        setSentTo(values.email.trim());
        setBusy(false);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: err.message });
      } else {
        setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      }
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="One more step to finish creating your account."
        footer={
          <>
            Confirmed already?{" "}
            <Link href={loginHref} className="font-semibold text-accent hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <EmptyState
          icon={MailCheck}
          title="Confirm your email address"
          text={
            <>
              We sent a link to <strong className="text-text">{sentTo}</strong>. Open it to confirm your account,
              then sign in. No email? Check your spam folder.
            </>
          }
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Track spending, set budgets and split costs."
      footer={
        <>
          Already have an account?{" "}
          <Link href={loginHref} className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {/* method="post": a submit before hydration must never put the password in the URL */}
      <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formError} />
        <TextField id="name" label="Name" autoComplete="name" maxLength={60} autoFocus {...bind("name")} />
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          {...bind("email")}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          {...bind("password")}
        />
        <SubmitButton busy={busy}>{busy ? "Creating account…" : "Create account"}</SubmitButton>
      </form>
    </AuthShell>
  );
}
