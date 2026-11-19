import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ReportsScreen } from "@/components/reports/ReportsScreen";

export const metadata: Metadata = { title: "Reports · PocketPlan" };

export default function ReportsPage() {
  return (
    <RequireAuth>
      <Suspense>
        <ReportsScreen />
      </Suspense>
    </RequireAuth>
  );
}
