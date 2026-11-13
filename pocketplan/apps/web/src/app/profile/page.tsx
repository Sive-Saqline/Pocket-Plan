import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProfileScreen } from "@/components/profile/ProfileScreen";

export const metadata: Metadata = { title: "Profile · PocketPlan" };

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileScreen />
    </RequireAuth>
  );
}
