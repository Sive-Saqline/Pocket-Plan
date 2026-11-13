"use client";

import { usePathname, useRouter } from "next/navigation";
import { CloudOff } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth";

/** EXPERIENCE.md §2: signed-out users go to Sign In, keeping returnTo. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state, retry, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state.status === "anonymous") {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [state.status, pathname, router]);

  if (state.status === "unreachable") {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <div role="alert" className="w-full max-w-sm rounded-xl bg-surface p-5 shadow-card">
          <EmptyState
            icon={CloudOff}
            title="Can't reach PocketPlan"
            text="You're still signed in. Check your connection, or that the API is running, then try again."
          >
            <Button onClick={retry}>Try again</Button>
            <Button variant="ghost" onClick={logout}>
              Sign out
            </Button>
          </EmptyState>
        </div>
      </main>
    );
  }

  if (state.status !== "authenticated") {
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy="true">
        <span className="size-8 animate-spin rounded-full border-3 border-border border-t-accent" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  return <>{children}</>;
}
