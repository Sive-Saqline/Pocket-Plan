import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { MoreScreen } from "@/components/more/MoreScreen";

export const metadata: Metadata = { title: "More · PocketPlan" };

export default function MorePage() {
  return (
    <RequireAuth>
      <MoreScreen />
    </RequireAuth>
  );
}
