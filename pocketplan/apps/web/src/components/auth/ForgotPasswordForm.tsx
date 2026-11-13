"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AuthShell } from "./AuthShell";
import { FormAlert, SubmitButton } from "./SubmitButton";
import { TextField } from "./TextField";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!EMAIL.test(email.trim())) return setError("Enter a valid email address");
    setFormError(null);
    setBusy(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const footer = (
    <>
      Remembered it?{" "}
      <Link href="/login" className="font-semibold text-accent hover:underline">
        Sign in
      </Link>
    </>
  );

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle="Follow the link to choose a new password." footer={footer}>
        {/* Same message whether or not the email has an account, so it can't be used to find out. */}
        <EmptyState
          icon={MailCheck}
          title="Reset link sent"
          text={
            <>
              If <strong className="text-text">{email.trim()}</strong> has a PocketPlan account, a link to reset the
              password is on its way. No email? Check your spam folder.
            </>
          }
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link to choose a new one." footer={footer}>
      <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formError} />
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          error={error}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(undefined);
          }}
          autoFocus
        />
        <SubmitButton busy={busy}>{busy ? "Sending…" : "Send reset link"}</SubmitButton>
      </form>
    </AuthShell>
  );
}
