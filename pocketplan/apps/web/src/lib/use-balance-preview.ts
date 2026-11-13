"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, previewBalances, type BalancePreview } from "./api";
import type { Group } from "./group";

type State =
  | { status: "loading"; data: BalancePreview | null }
  | { status: "ready"; data: BalancePreview }
  | { status: "error"; data: BalancePreview | null; message: string };

/** Recomputes balances on the API whenever the group changes. */
export function useBalancePreview(group: Group, enabled: boolean) {
  const [state, setState] = useState<State>({ status: "loading", data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState((s) => ({ status: "loading", data: s.data }));
    const timer = setTimeout(() => {
      previewBalances(group, controller.signal)
        .then((data) => setState({ status: "ready", data }))
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setState((s) => ({
            status: "error",
            data: s.data,
            message: err instanceof ApiError ? err.message : "Something went wrong.",
          }));
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [group, enabled, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
