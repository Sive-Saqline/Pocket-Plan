import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ExpensesScreen } from "@/components/expenses/ExpensesScreen";

export const metadata: Metadata = { title: "Expenses · PocketPlan" };

export default function ExpensesPage() {
  return (
    <RequireAuth>
      <Suspense>
        <ExpensesScreen />
      </Suspense>
    </RequireAuth>
  );
}
