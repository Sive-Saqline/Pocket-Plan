import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RecurringScreen } from "@/components/recurring/RecurringScreen";

export const metadata: Metadata = { title: "Recurring · PocketPlan" };

export default function RecurringPage() {
  return (
    <RequireAuth>
      <RecurringScreen />
    </RequireAuth>
  );
}
