import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { WalletsScreen } from "@/components/wallets/WalletsScreen";

export const metadata: Metadata = { title: "Wallets & categories · PocketPlan" };

export default function WalletsPage() {
  return (
    <RequireAuth>
      <WalletsScreen />
    </RequireAuth>
  );
}
