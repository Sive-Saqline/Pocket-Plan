import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { GroupScreen } from "@/components/group/GroupScreen";

export const metadata: Metadata = { title: "Group · PocketPlan" };

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAuth>
      <GroupScreen key={id} groupId={id} />
    </RequireAuth>
  );
}
