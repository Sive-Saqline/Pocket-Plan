"use client";

import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/app/AppShell";
import { TextField } from "@/components/auth/TextField";
import { Card } from "@/components/ui/Card";
import { Toast, useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import { useAuth, type AuthResult, type User } from "@/lib/auth";
import { applyTheme, type Theme } from "@/lib/theme";

const themes: { value: Theme; label: string; icon: string }[] = [
  { value: "system", label: "System", icon: "🖥️" },
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
];

const errorText = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export function ProfileScreen() {
  const { state, logout } = useAuth();
  const user = state.user!;
  const toast = useToast();

  return (
    <AppShell title="Profile">
      <section className="flex items-center gap-4 rounded-xl bg-surface p-4 shadow-card">
        <span
          aria-hidden
          className="grid size-16 shrink-0 place-items-center rounded-full bg-accent text-2xl font-semibold text-text-inverse"
        >
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold">{user.name}</p>
          <p className="truncate text-text-muted">{user.email}</p>
          <p className="text-sm text-text-muted">
            Member since{" "}
            {new Date(user.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
        </div>
      </section>

      <DetailsCard user={user} onSaved={() => toast.show("Profile updated")} />
      <ThemeCard user={user} onError={toast.show} />
      <PasswordCard onChanged={() => toast.show("Password changed. Other devices have been signed out.")} />

      <button
        type="button"
        onClick={logout}
        className="h-13 rounded-xl border border-border bg-surface font-semibold text-danger shadow-card hover:bg-danger/10"
      >
        Sign out
      </button>

      <Toast message={toast.message} />
    </AppShell>
  );
}

function DetailsCard({ user, onSaved }: { user: User; onSaved: () => void }) {
  const { request, setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const changed = name.trim() !== user.name;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Enter your name");
    setBusy(true);
    try {
      const updated = await request<User>("/auth/me", { method: "PATCH", body: { name: name.trim() } });
      setUser(updated);
      setName(updated.name);
      onSaved();
    } catch (err) {
      setError(errorText(err, "Couldn't save. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Your details">
      <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-4 pt-1">
        <TextField
          id="profile-name"
          label="Name"
          autoComplete="name"
          maxLength={60}
          value={name}
          error={error ?? undefined}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
        <TextField
          id="profile-email"
          label="Email"
          type="email"
          value={user.email}
          readOnly
          hint="This is your sign-in email and can't be changed here yet."
          className="h-12 w-full cursor-not-allowed rounded-lg border border-border bg-surface-muted px-3 text-text-muted"
        />
        <button
          type="submit"
          disabled={!changed || busy}
          className="h-11 self-end rounded-lg bg-accent px-5 font-semibold text-text-inverse hover:bg-accent-hover disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
    </Card>
  );
}

function ThemeCard({ user, onError }: { user: User; onError: (message: string) => void }) {
  const { request, setUser } = useAuth();
  const current = user.preferences.theme;

  async function choose(theme: Theme) {
    if (theme === current) return;
    applyTheme(theme); // instant, then persist
    try {
      setUser(await request<User>("/auth/me", { method: "PATCH", body: { preferences: { theme } } }));
    } catch (err) {
      applyTheme(current);
      onError(errorText(err, "Couldn't save your theme"));
    }
  }

  return (
    <Card title="Theme">
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2 pt-1">
        {themes.map((t) => {
          const on = t.value === current;
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(t.value)}
              className={`flex h-16 flex-col items-center justify-center gap-0.5 rounded-lg border text-sm font-medium ${
                on ? "border-accent bg-accent/10 text-accent ring-1 ring-accent" : "border-border hover:bg-surface-muted"
              }`}
            >
              <span aria-hidden className="text-lg">
                {t.icon}
              </span>
              {t.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-sm text-text-muted">System follows your device&apos;s light or dark setting.</p>
    </Card>
  );
}

function PasswordCard({ onChanged }: { onChanged: () => void }) {
  const { request, acceptSession } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found: typeof errors = {};
    if (!current) found.current = "Enter your current password";
    if (next.length < 8) found.next = "New password must be at least 8 characters";
    else if (next.length > 72) found.next = "New password must be at most 72 characters";
    else if (next === current) found.next = "New password must be different from the current one";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      acceptSession(
        await request<AuthResult>("/auth/change-password", {
          method: "POST",
          body: { currentPassword: current, newPassword: next },
        }),
      );
      setCurrent("");
      setNext("");
      onChanged();
    } catch (err) {
      const message = errorText(err, "Couldn't change your password. Try again.");
      setErrors(message.startsWith("Current") ? { current: message } : { next: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Change password">
      <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-4 pt-1">
        <TextField
          id="current-password"
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={current}
          error={errors.current}
          onChange={(e) => {
            setCurrent(e.target.value);
            setErrors((x) => ({ ...x, current: undefined }));
          }}
        />
        <TextField
          id="new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters. Other devices will be signed out."
          value={next}
          error={errors.next}
          onChange={(e) => {
            setNext(e.target.value);
            setErrors((x) => ({ ...x, next: undefined }));
          }}
        />
        <button
          type="submit"
          disabled={busy}
          className="h-11 self-end rounded-lg bg-accent px-5 font-semibold text-text-inverse hover:bg-accent-hover disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {busy ? "Changing…" : "Change password"}
        </button>
      </form>
    </Card>
  );
}
