import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { BudgetsScreen } from "@/components/budgets/BudgetsScreen";

export const metadata: Metadata = { title: "Budgets · PocketPlan" };

export default function BudgetsPage() {
  return (
    <RequireAuth>
      <Suspense>
        <BudgetsScreen />
      </Suspense>
    </RequireAuth>
  );
}
