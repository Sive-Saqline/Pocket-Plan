import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AcceptInviteScreen } from "@/components/group/AcceptInviteScreen";

export const metadata: Metadata = { title: "Group invite · PocketPlan" };

// Signed-out visitors go to Sign in (or Register) and come straight back here.
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <RequireAuth>
      <AcceptInviteScreen token={token} />
    </RequireAuth>
  );
}
