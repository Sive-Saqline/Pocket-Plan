"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "./api";
import { useAuth } from "./auth";

type State<T> =
  | { status: "loading"; data: T | null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "error"; data: T | null; error: string };

/** GETs `path` as the signed-in user; keeps the last good data while reloading. */
export function useApiData<T>(path: string | null) {
  const { request } = useAuth();
  const [state, setState] = useState<State<T>>({ status: "loading", data: null, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setState((s) => ({ status: "loading", data: s.data, error: null }));
    request<T>(path, { signal: controller.signal })
      .then((data) => setState({ status: "ready", data, error: null }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState((s) => ({
          status: "error",
          data: s.data,
          error: err instanceof ApiError ? err.message : "Something went wrong.",
        }));
      });
    return () => controller.abort();
  }, [path, request, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}
