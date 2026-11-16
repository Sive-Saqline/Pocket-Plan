"use client";

import { Copy, Link2, LogOut, Mail, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { TextField } from "@/components/auth/TextField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { FormError } from "@/components/ui/Sheet";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { roleLabel, type Balances, type GroupDetail, type GroupInvite, type GroupMember, type InviteResult } from "@/lib/group";
import { parseTaka } from "@/lib/money";
import { useApiData } from "@/lib/use-api-data";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const message = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

/** Members & roles, invitations, and group settings (PRD v4 §6.10-6.11). */
export function MembersTab({
  group,
  balances,
  onChanged,
}: {
  group: GroupDetail;
  balances: Balances | null;
  onChanged: (message: string) => void;
}) {
  const { request, state } = useAuth();
  const router = useRouter();
  const me = state.user?.id;
  const owner = group.myRole === "OWNER";
  const active = group.members.filter((m) => m.active);
  const former = group.members.filter((m) => !m.active);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<GroupMember | null>(null);

  const balanceOf = (id: string) => balances?.members.find((m) => m.userId === id)?.balance ?? 0;

  async function setRole(m: GroupMember, role: "OWNER" | "MEMBER") {
    setBusy(m.userId);
    setError(null);
    try {
      await request(`/groups/${group.id}/members/${m.userId}`, { method: "PATCH", body: { role } });
      onChanged(role === "OWNER" ? `${m.name} is now an owner` : `${m.name} is now a member`);
    } catch (err) {
      setError(message(err, "Couldn't change the role. Try again."));
    }
    setBusy(null);
  }

  async function remove(m: GroupMember) {
    setBusy(m.userId);
    setError(null);
    try {
      await request(`/groups/${group.id}/members/${m.userId}`, { method: "DELETE" });
      if (m.userId === me) {
        router.push("/groups");
        return;
      }
      setConfirm(null);
      onChanged(`${m.name} was removed from ${group.name}`);
    } catch (err) {
      setError(message(err, "Couldn't do that. Try again."));
      setConfirm(null);
    }
    setBusy(null);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
      <Card title={`${active.length} ${active.length === 1 ? "member" : "members"}`}>
        <FormError message={error} />
        <ul className="divide-y divide-border">
          {active.map((m) => {
            const self = m.userId === me;
            const owes = balanceOf(m.userId) !== 0;
            return (
              <li key={m.userId} className="py-3">
                <div className="flex items-center gap-3">
                  <UserAvatar name={m.name} avatarUrl={m.avatarUrl} className="size-10 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{self ? `${m.name} (you)` : m.name}</p>
                    <p className="truncate text-sm text-text-muted">
                      {roleLabel(m.role)} · {m.email}
                    </p>
                  </div>
                </div>
                {(owner && !self) || self ? (
                  <div className="mt-2 flex flex-wrap gap-2 pl-13">
                    {owner && !self && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy === m.userId}
                        onClick={() => setRole(m, m.role === "OWNER" ? "MEMBER" : "OWNER")}
                      >
                        {m.role === "OWNER" ? "Make member" : "Make owner"}
                      </Button>
                    )}
                    {owner && self && active.filter((x) => x.role === "OWNER").length > 1 && (
                      <Button size="sm" variant="secondary" disabled={busy === m.userId} onClick={() => setRole(m, "MEMBER")}>
                        Step down as owner
                      </Button>
                    )}
                    {((owner && !self && m.role === "MEMBER") || self) && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busy === m.userId}
                        title={owes ? "Settle up first" : undefined}
                        onClick={() => setConfirm(m)}
                      >
                        {self ? <LogOut aria-hidden size={16} /> : <Trash2 aria-hidden size={16} />}
                        {self ? "Leave group" : "Remove"}
                      </Button>
                    )}
                  </div>
                ) : null}
                {confirm?.userId === m.userId && (
                  <div className="mt-2">
                    <ConfirmDelete
                      message={
                        self
                          ? `Leave ${group.name}? You'll lose access to it. Your past expenses stay in its history.`
                          : `Remove ${m.name} from ${group.name}? Their past expenses stay in its history.`
                      }
                      busy={busy === m.userId}
                      onCancel={() => setConfirm(null)}
                      onConfirm={() => remove(m)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {former.length > 0 && (
          <p className="mt-2 border-t border-border pt-3 text-sm text-text-muted">
            Left: {former.map((m) => m.name).join(", ")}. Their past expenses stay in the history.
          </p>
        )}
        <p className="mt-2 text-sm text-text-muted">
          Owners invite and remove people and change settings. Everyone can add expenses and settle up. People can only
          leave once they&apos;re settled up.
        </p>
      </Card>

      {owner && <InvitePanel group={group} />}
      {owner && <SettingsPanel group={group} onChanged={onChanged} />}
    </div>
  );
}

function InvitePanel({ group }: { group: GroupDetail }) {
  const { request } = useAuth();
  const invites = useApiData<GroupInvite[]>(`/groups/${group.id}/invites`);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [result, setResult] = useState<InviteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function create(body: { email?: string }) {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      setResult(await request<InviteResult>(`/groups/${group.id}/invites`, { method: "POST", body }));
      setEmail("");
      invites.reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setEmailError(err.message);
      else setError(message(err, "Couldn't create the invite. Try again."));
    }
    setBusy(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL.test(value)) return setEmailError("Enter a valid email address");
    void create({ email: value });
  }

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Couldn't copy. Select the link and copy it yourself.");
    }
  }

  async function revoke(id: string) {
    try {
      await request(`/groups/${group.id}/invites/${id}`, { method: "DELETE" });
      invites.reload();
    } catch (err) {
      setError(message(err, "Couldn't cancel the invite. Try again."));
    }
  }

  return (
    <Card title="Invite people">
      <div className="flex flex-col gap-4">
        <FormError message={error} />
        <form onSubmit={submit} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1">
            <TextField
              id="invite-email"
              label="Invite by email"
              type="email"
              value={email}
              placeholder="name@example.com"
              error={emailError}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(undefined);
              }}
            />
          </div>
          <Button type="submit" disabled={busy} className="sm:mt-7">
            <Mail aria-hidden size={18} />
            Invite
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => create({})}>
            <Link2 aria-hidden size={18} />
            Create invite link
          </Button>
          <span className="text-sm text-text-muted">Share it on WhatsApp or anywhere. Works for 7 days.</span>
        </div>

        {result && (
          <div role="status" className="flex flex-col gap-2 rounded-lg border border-accent/40 bg-accent/5 p-3 text-sm">
            <p className="font-medium">
              {result.delivery === "email"
                ? `Invite email sent to ${result.invite.email}.`
                : result.delivery === "in_app"
                  ? `${result.invite.email} already uses PocketPlan: the invite is waiting on their Groups page.`
                  : result.invite.email
                    ? `Invite created for ${result.invite.email}.`
                    : "Invite link ready."}
            </p>
            {result.warning && <p className="text-danger">{result.warning}</p>}
            <p className="text-text-muted">
              {result.invite.email ? "You can also send them this link (only their account can use it):" : "Anyone with this link can join:"}
            </p>
            <div className="flex items-center gap-2">
              <input readOnly value={result.link} onFocus={(e) => e.target.select()} aria-label="Invite link" className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 font-mono text-xs" />
              <Button size="sm" variant="secondary" onClick={() => copy(result.link)}>
                <Copy aria-hidden size={16} />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-text-muted">For security the link is shown only now. Create a new one any time (it replaces the old one).</p>
          </div>
        )}

        {invites.data && invites.data.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-medium">Waiting to join</h3>
            <ul className="divide-y divide-border">
              {invites.data.map((i) => (
                <li key={i.id} className="flex items-center gap-2 py-2 text-sm">
                  {i.kind === "email" ? <Mail aria-hidden size={16} className="text-text-muted" /> : <Link2 aria-hidden size={16} className="text-text-muted" />}
                  <span className="min-w-0 flex-1 truncate">{i.email ?? "Invite link"}</span>
                  <span className="text-text-muted">
                    until {new Date(i.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => revoke(i.id)}
                    aria-label={`Cancel invite ${i.email ?? "link"}`}
                    className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-danger"
                  >
                    <X aria-hidden size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function SettingsPanel({ group, onChanged }: { group: GroupDetail; onChanged: (message: string) => void }) {
  const { request } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [budget, setBudget] = useState(group.monthlyBudget === null ? "" : String(group.monthlyBudget));
  const [errors, setErrors] = useState<{ name?: string; budget?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Name the group";
    const parsed = budget.trim() === "" ? null : parseTaka(budget);
    if (budget.trim() !== "" && parsed === null) next.budget = "Enter an amount above ৳0, or leave it empty for no budget";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setError(null);
    try {
      await request(`/groups/${group.id}`, { method: "PATCH", body: { name: name.trim(), monthlyBudget: parsed } });
      onChanged("Group settings saved");
    } catch (err) {
      setError(message(err, "Couldn't save. Try again."));
    }
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await request(`/groups/${group.id}`, { method: "DELETE" });
      router.push("/groups");
    } catch (err) {
      setError(message(err, "Couldn't delete the group."));
      setConfirmDelete(false);
      setBusy(false);
    }
  }

  return (
    <Card title="Group settings">
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <TextField
          id="group-settings-name"
          label="Name"
          value={name}
          maxLength={40}
          error={errors.name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          id="group-settings-budget"
          label="Monthly budget (optional)"
          inputMode="decimal"
          value={budget}
          placeholder="e.g. 20000"
          hint="Shown on the Overview as planned vs spent."
          error={errors.budget}
          onChange={(e) => setBudget(e.target.value)}
        />
        {confirmDelete ? (
          <ConfirmDelete
            message={`Delete ${group.name}? This can only be done while it has no expenses or payments.`}
            busy={busy}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={remove}
          />
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
              <Trash2 aria-hidden size={18} />
              Delete
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? "Saving…" : "Save settings"}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}
