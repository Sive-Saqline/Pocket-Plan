"use client";

import { LinkIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AuthShell } from "./AuthShell";
import { FormAlert, SubmitButton } from "./SubmitButton";
import { TextField } from "./TextField";

/**
 * Opened from the password-reset email. Supabase signs the user in from the
 * link (see lib/supabase.ts, detectSessionInUrl); here they choose a new password.
 */
export function ResetPasswordForm() {
  const { state, setNewPassword } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (password.length > 72) return setError("Password must be at most 72 characters");
    setFormError(null);
    setBusy(true);
    try {
      await setNewPassword(password);
      router.replace("/");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't change your password. Try again.");
      setBusy(false);
    }
  }

  if (state.status === "loading") {
    return <AuthShell title="Reset your password" subtitle="Checking your link…" footer={null}>{null}</AuthShell>;
  }

  if (state.status === "anonymous") {
    return (
      <AuthShell title="Reset your password" subtitle="This link can't be used." footer={null}>
        <EmptyState
          icon={LinkIcon}
          title="Link expired or already used"
          text="Reset links work once and expire after a while. Ask for a new one."
        >
          <Link href="/forgot-password" className={buttonClass()}>
            Send a new link
          </Link>
        </EmptyState>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Other devices will be signed out." footer={null}>
      <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formError} />
        <TextField
          id="new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={password}
          error={error}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(undefined);
          }}
          autoFocus
        />
        <SubmitButton busy={busy}>{busy ? "Saving…" : "Save new password"}</SubmitButton>
      </form>
    </AuthShell>
  );
}
