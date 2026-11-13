"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiRequest, ApiError, type RequestOptions } from "./api";
import { applyTheme, type Theme } from "./theme";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  preferences: { theme: Theme };
  /** Profile photo, usable as an <img src>; null when none is set. */
  avatarUrl: string | null;
}

export interface AuthResult {
  accessToken: string;
  user: User;
}

type AuthState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: User }
  | { status: "anonymous"; user: null }
  /** Signed in on this device, but the API couldn't be reached to confirm it. */
  | { status: "unreachable"; user: null };

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Replaces the signed-in user after a profile change. */
  setUser: (user: User) => void;
  /** Adopts a fresh session, e.g. after a password change. */
  acceptSession: (result: AuthResult) => void;
  /** Calls the API as the signed-in user; an expired session signs them out. */
  request: <T>(path: string, options?: Omit<RequestOptions, "token">) => Promise<T>;
  /** Re-checks the saved session, e.g. after the API was unreachable. */
  retry: () => void;
}

const TOKEN_KEY = "pocketplan.token";
const AuthContext = createContext<AuthContextValue | null>(null);

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
const writeToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage blocked: the session lasts until the tab closes
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  // The theme is a per-user preference; follow it whenever the user changes.
  const theme = state.user?.preferences.theme;
  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);

  const checkSession = useCallback(() => {
    const token = readToken();
    if (!token) {
      setState({ status: "anonymous", user: null });
      return;
    }
    setState({ status: "loading", user: null });
    apiRequest<User>("/auth/me", { token })
      .then((user) => setState({ status: "authenticated", user }))
      .catch((err: unknown) => {
        // Only a rejected token signs the user out. Anything else (API down,
        // network error, server error) keeps the session so Retry can restore it.
        if (err instanceof ApiError && err.status === 401) {
          writeToken(null);
          setState({ status: "anonymous", user: null });
        } else {
          setState({ status: "unreachable", user: null });
        }
      });
  }, []);

  useEffect(checkSession, [checkSession]);

  const accept = useCallback(({ accessToken, user }: AuthResult) => {
    writeToken(accessToken);
    setState({ status: "authenticated", user });
  }, []);

  const logout = useCallback(() => {
    writeToken(null);
    setState({ status: "anonymous", user: null });
  }, []);

  const request = useCallback(
    async <T,>(path: string, options: Omit<RequestOptions, "token"> = {}) => {
      try {
        return await apiRequest<T>(path, { ...options, token: readToken() });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) logout();
        throw err;
      }
    },
    [logout],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      login: async (email, password) =>
        accept(await apiRequest<AuthResult>("/auth/login", { method: "POST", body: { email, password } })),
      register: async (name, email, password) =>
        accept(
          await apiRequest<AuthResult>("/auth/register", { method: "POST", body: { name, email, password } }),
        ),
      logout,
      request,
      setUser: (user) => setState({ status: "authenticated", user }),
      acceptSession: accept,
      retry: checkSession,
    }),
    [state, accept, logout, request, checkSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Only same-site paths, so ?returnTo= can't bounce users to another site. */
export function safeReturnTo(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
