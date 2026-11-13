"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";

/** EXPERIENCE.md §2: signed-out users go to Sign In, keeping returnTo. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state.status === "anonymous") {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [state.status, pathname, router]);

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
