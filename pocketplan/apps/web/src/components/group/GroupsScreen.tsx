"use client";

import { ChevronRight, Mail, Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/app/AppShell";
import { TextField } from "@/components/auth/TextField";
import { Button } from "@/components/ui/Button";
import { Card, ErrorBanner, SkeletonRows } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormError, Sheet } from "@/components/ui/Sheet";
import { Toast, useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { balanceWords, roleLabel, type GroupDetail, type GroupListItem, type ReceivedInvite } from "@/lib/group";
import { formatTaka } from "@/lib/money";
import { useApiData } from "@/lib/use-api-data";

/** Groups list (PRD v4 §6.10): my groups, invites waiting for me, create a group. */
export function GroupsScreen() {
  const groups = useApiData<GroupListItem[]>("/groups");
  const invites = useApiData<ReceivedInvite[]>("/invites/received");
  const { request } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [busyInvite, setBusyInvite] = useState<string | null>(null);

  async function respond(invite: ReceivedInvite, accept: boolean) {
    setBusyInvite(invite.id);
    try {
      if (accept) {
        await request(`/invites/received/${invite.id}/accept`, { method: "POST" });
        router.push(`/groups/${invite.groupId}`);
        return;
      }
      await request(`/invites/received/${invite.id}/decline`, { method: "POST" });
      toast.show(`Declined the invite to ${invite.groupName}`);
      invites.reload();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Couldn't do that. Try again.");
      invites.reload();
    }
    setBusyInvite(null);
  }

  return (
    <AppShell
      title="Groups"
      actions={
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus aria-hidden size={16} />
          New group
        </Button>
      }
    >
      {groups.error && <ErrorBanner message={groups.error} onRetry={groups.reload} />}

      {invites.data && invites.data.length > 0 && (
        <Card title="Invites for you">
          <ul className="divide-y divide-border">
            {invites.data.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                  <Mail size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{i.groupName}</p>
                  <p className="text-sm text-text-muted">
                    {i.invitedBy} invited you · {i.memberCount} {i.memberCount === 1 ? "member" : "members"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" disabled={busyInvite === i.id} onClick={() => respond(i, false)}>
                    Decline
                  </Button>
                  <Button size="sm" disabled={busyInvite === i.id} onClick={() => respond(i, true)}>
                    Join
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        {!groups.data ? (
          <SkeletonRows rows={3} />
        ) : groups.data.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No groups yet."
            text="Share costs with roommates, family or a trip: add expenses, split them, and see who owes whom."
          >
            <Button onClick={() => setCreating(true)}>Create a group</Button>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {groups.data.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-lg px-1 py-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                    <UsersRound size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{g.name}</span>
                    <span className="block text-sm text-text-muted">
                      {g.memberCount} {g.memberCount === 1 ? "member" : "members"} · {roleLabel(g.myRole)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span
                      className={`block font-mono font-semibold tabular-nums ${
                        g.myBalance > 0 ? "text-success" : g.myBalance < 0 ? "text-danger" : "text-text-muted"
                      }`}
                    >
                      {g.myBalance === 0 ? "৳0" : formatTaka(g.myBalance, { signed: true })}
                    </span>
                    <span className="block text-xs text-text-muted">{balanceWords(g.myBalance)}</span>
                  </span>
                  <ChevronRight aria-hidden size={18} className="shrink-0 text-text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <CreateGroupSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(g) => router.push(`/groups/${g.id}`)}
      />
      <Toast message={toast.message} />
    </AppShell>
  );
}

function CreateGroupSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (g: GroupDetail) => void;
}) {
  const { request } = useAuth();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Name the group, e.g. Flat 4B or Cox's Bazar trip");
    setBusy(true);
    setFormError(null);
    try {
      const group = await request<GroupDetail>("/groups", { method: "POST", body: { name: name.trim() } });
      setName("");
      onCreated(group);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't create the group. Try again.");
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        setBusy(false);
        setError(undefined);
        setFormError(null);
        onClose();
      }}
      title="New group"
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <FormError message={formError} />
        <TextField
          id="group-name"
          label="Group name"
          value={name}
          maxLength={40}
          placeholder="e.g. Flat 4B, Family, Sylhet trip"
          error={error}
          autoFocus
          onChange={(e) => {
            setName(e.target.value);
            setError(undefined);
          }}
        />
        <p className="-mt-2 text-sm text-text-muted">You&apos;ll be the owner. Invite people from the group&apos;s Members tab.</p>
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create group"}
        </Button>
      </form>
    </Sheet>
  );
}
