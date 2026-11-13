"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiRequest, ApiError, authRequest, type RequestOptions } from "./api";
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

type AuthState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: User }
  | { status: "anonymous"; user: null }
  /** Signed in on this device, but the API couldn't be reached to confirm it. */
  | { status: "unreachable"; user: null };

export type RegisterResult = { needsEmailConfirmation: boolean };

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  /** Creates the account. With email confirmation on, the user signs in after clicking the emailed link. */
  register: (name: string, email: string, password: string) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  /** Replaces the signed-in user after a profile change. */
  setUser: (user: User) => void;
  /** Checks the current password, sets the new one and signs out other devices. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Emails a password-reset link that opens /reset-password. */
  sendPasswordReset: (email: string) => Promise<void>;
  /** Sets a new password for the user signed in through a reset link. */
  setNewPassword: (password: string) => Promise<void>;
  /** Calls the API as the signed-in user; an expired session signs them out. */
  request: <T>(path: string, options?: RequestOptions) => Promise<T>;
  /** Re-checks the session, e.g. after the API was unreachable. */
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Sign-in state for the page. The session itself is in HttpOnly cookies that
 * this code can't read (by design); the server routes in app/api/auth and
 * app/api/pp use it. Here we only know whether /auth/me succeeds.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  // The theme is a per-user preference; follow it whenever the user changes.
  const theme = state.user?.preferences.theme;
  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);

  /** Loads the profile for the current session; returns where that left us. */
  const checkSession = useCallback(async (): Promise<AuthState["status"]> => {
    setState((s) => (s.status === "authenticated" ? s : { status: "loading", user: null }));
    try {
      setState({ status: "authenticated", user: await apiRequest<User>("/auth/me") });
      return "authenticated";
    } catch (err) {
      // 401 = not signed in. Anything else (API down, network error) keeps the
      // session so Retry can restore it.
      if (err instanceof ApiError && err.status === 401) {
        setState({ status: "anonymous", user: null });
        return "anonymous";
      }
      setState({ status: "unreachable", user: null });
      return "unreachable";
    }
  }, []);

  /** After the password was accepted: load the profile, or explain why it couldn't be. */
  const finishSignIn = useCallback(async () => {
    const status = await checkSession();
    if (status === "unreachable") {
      throw new ApiError(
        "Your password is right, but PocketPlan's server isn't responding. Make sure the API is running, then try again.",
        503,
      );
    }
    if (status === "anonymous") {
      throw new ApiError("PocketPlan couldn't load your account. Try signing in again.", 401);
    }
  }, [checkSession]);

  useEffect(() => {
    // Sessions used to be kept in localStorage; remove any copies left behind.
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) localStorage.removeItem(key);
      }
    } catch {
      // storage blocked: nothing to clean up
    }
    void checkSession();
  }, [checkSession]);

  const request = useCallback(async <T,>(path: string, options: RequestOptions = {}) => {
    try {
      return await apiRequest<T>(path, options);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setState({ status: "anonymous", user: null });
      throw err;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      async login(email, password) {
        await authRequest("login", { email, password });
        await finishSignIn();
      },
      async register(name, email, password) {
        const result = await authRequest<RegisterResult>("register", { name, email, password });
        if (!result.needsEmailConfirmation) await finishSignIn();
        return result;
      },
      async logout() {
        await authRequest("logout").catch(() => undefined);
        setState({ status: "anonymous", user: null });
      },
      setUser: (user) => setState({ status: "authenticated", user }),
      async changePassword(currentPassword, newPassword) {
        await authRequest("change-password", { currentPassword, newPassword });
      },
      async sendPasswordReset(email) {
        await authRequest("forgot-password", { email });
      },
      async setNewPassword(password) {
        await authRequest("reset-password", { password });
        await finishSignIn();
      },
      request,
      retry: () => void checkSession(),
    }),
    [state, request, checkSession, finishSignIn],
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
