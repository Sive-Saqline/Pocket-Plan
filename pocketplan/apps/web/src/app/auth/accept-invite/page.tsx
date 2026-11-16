import type { Metadata } from "next";
import { Suspense } from "react";
import { FinishInviteForm } from "@/components/auth/FinishInviteForm";

export const metadata: Metadata = { title: "Set up your account · PocketPlan" };

/** Where the Supabase invite email lands (new users invited to a group). */
export default function AcceptInvitePage() {
  return (
    <Suspense>
      <FinishInviteForm />
    </Suspense>
  );
}
