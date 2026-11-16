import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { GroupsScreen } from "@/components/group/GroupsScreen";

export const metadata: Metadata = { title: "Groups · PocketPlan" };

export default function GroupsPage() {
  return (
    <RequireAuth>
      <GroupsScreen />
    </RequireAuth>
  );
}
