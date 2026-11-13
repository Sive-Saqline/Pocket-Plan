import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { GroupScreen } from "@/components/group/GroupScreen";

export const metadata: Metadata = {
  title: "Mess — Bashundhara · PocketPlan",
};

export default function DemoGroupPage() {
  return (
    <RequireAuth>
      <GroupScreen />
    </RequireAuth>
  );
}
