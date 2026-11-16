"use client";

import { LinkIcon, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card, SkeletonRows } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormError } from "@/components/ui/Sheet";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { roleLabel, type InvitePreview } from "@/lib/group";
import { useApiData } from "@/lib/use-api-data";

/** /invite/<token>: what the invite is for, then Join. */
export function AcceptInviteScreen({ token }: { token: string }) {
  const { request, state } = useAuth();
  const router = useRouter();
  const preview = useApiData<InvitePreview>(`/invites/token/${encodeURIComponent(token)}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const { groupId } = await request<{ groupId: string }>(`/invites/token/${encodeURIComponent(token)}/accept`, {
        method: "POST",
      });
      router.replace(`/groups/${groupId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't join. Try again.");
      setBusy(false);
    }
  }

  const p = preview.data;
  return (
    <AppShell title="Group invite">
      <Card className="mx-auto w-full max-w-lg">
        {preview.status === "error" && !p ? (
          <EmptyState icon={LinkIcon} title="This invite link isn't valid" text={preview.error ?? undefined}>
            <Link href="/groups" className={buttonClass("secondary")}>
              Go to groups
            </Link>
          </EmptyState>
        ) : !p ? (
          <SkeletonRows rows={2} />
        ) : (
          <EmptyState
            icon={UsersRound}
            title={p.groupName}
            text={`${p.invitedBy} invited you to join as ${roleLabel(p.role).toLowerCase()} · ${p.memberCount} ${
              p.memberCount === 1 ? "member" : "members"
            }`}
          >
            <div className="flex w-full flex-col items-center gap-3">
              <FormError message={error} />
              {p.status === "valid" && (
                <Button onClick={join} disabled={busy}>
                  {busy ? "Joining…" : `Join ${p.groupName}`}
                </Button>
              )}
              {p.status === "already_member" && (
                <Link href={`/groups/${p.groupId}`} className={buttonClass()}>
                  You&apos;re already in it: open the group
                </Link>
              )}
              {p.status === "wrong_account" && (
                <p className="text-sm text-text-muted">
                  This invite was sent to {p.invitedEmail}. You&apos;re signed in as {state.user?.email}. Sign in with that
                  account to accept it.
                </p>
              )}
              {(p.status === "expired" || p.status === "revoked" || p.status === "used") && (
                <p className="text-sm text-text-muted">
                  {p.status === "expired"
                    ? "This invite has expired."
                    : p.status === "used"
                      ? "This invite has already been used."
                      : "This invite was cancelled."}{" "}
                  Ask {p.invitedBy} for a new one.
                </p>
              )}
            </div>
          </EmptyState>
        )}
      </Card>
    </AppShell>
  );
}
