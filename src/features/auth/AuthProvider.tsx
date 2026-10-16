"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { api, restoreSession, setAccessToken, subscribeSession } from "@/lib/api/client";
import { canUser, errorMessage, validCode } from "./models";
import type { AccessToken, AuthChallenge, User } from "./models";
export type { AuthChallenge, User } from "./models";

type Status = "loading" | "authenticated" | "unauthenticated" | "error";
type AuthContextValue = {
  user: User | null;
  status: Status;
  error: string | null;
  can: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<AuthChallenge>;
  verify: (challengeId: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
  retrySession: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

function unauthorized(error: unknown): boolean {
  return typeof error === "object" && error !== null && (("status" in error && error.status === 401) || ("statusCode" in error && error.statusCode === 401));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const loadUser = useCallback(async (expectedGeneration: number) => {
    const current = await api.get<User>("/users/me");
    if (expectedGeneration !== generation.current) return;
    if (current.status !== "ACTIVE" || !current.profileActive) {
      setAccessToken(null);
      throw new Error("Sua conta ou perfil não está ativo. Entre em contato com o gestor.");
    }
    setUser(current);
    setError(null);
    setStatus("authenticated");
  }, []);

  const restoreForGeneration = useCallback(async (expectedGeneration: number) => {
    try {
      await restoreSession();
      await loadUser(expectedGeneration);
    } catch (failure) {
      if (expectedGeneration !== generation.current) return;
      setUser(null);
      if (unauthorized(failure)) {
        setStatus("unauthenticated");
        setError(null);
      } else {
        setStatus("error");
        setError(errorMessage(failure));
      }
    }
  }, [loadUser]);

  const retrySession = useCallback(async () => {
    const expectedGeneration = ++generation.current;
    setStatus("loading");
    setError(null);
    await restoreForGeneration(expectedGeneration);
  }, [restoreForGeneration]);

  useEffect(() => {
    const unsubscribe = subscribeSession((token) => {
      if (token === null) {
        ++generation.current;
        setUser(null);
        setStatus("unauthenticated");
        setError(null);
      }
    });
    void restoreForGeneration(++generation.current);
    return unsubscribe;
  }, [restoreForGeneration]);

  const login = useCallback((email: string, password: string) => api.request<AuthChallenge>("/auth/login", {
    method: "POST", auth: false, body: { email: email.trim(), password },
  }), []);

  const verify = useCallback(async (challengeId: string, code: string) => {
    if (!validCode(code)) throw new Error("Informe o código de seis dígitos enviado ao seu e-mail.");
    const expectedGeneration = ++generation.current;
    const session = await api.request<AccessToken>("/auth/challenge/verify", { method: "POST", auth: false, body: { challengeId, code } });
    if (expectedGeneration !== generation.current) return;
    setAccessToken(session.token);
    try {
      await loadUser(expectedGeneration);
    } catch (failure) {
      // Keep the established cookie so a transient /me failure can be retried.
      if (expectedGeneration === generation.current) {
        setUser(null);
        setStatus(unauthorized(failure) ? "unauthenticated" : "error");
        setError(errorMessage(failure));
      }
      throw failure;
    }
  }, [loadUser]);

  const logout = useCallback(async () => {
    ++generation.current;
    // The transport clears access immediately; its notification also revokes UI access.
    const pending = api.request<null>("/auth/logout", { method: "POST", auth: false });
    const expectedGeneration = generation.current;
    let failure: unknown;
    try { await pending; } catch (caught) { failure = caught; }
    finally {
      // A delayed logout must not remove an account authenticated afterwards.
      if (expectedGeneration === generation.current) {
        setUser(null);
        setStatus("unauthenticated");
        setError(failure ? "A saída local foi concluída, mas o servidor não confirmou o encerramento da sessão." : null);
      }
    }
    if (failure) throw failure;
  }, []);

  const reloadUser = useCallback(async () => {
    const expectedGeneration = generation.current;
    try {
      await loadUser(expectedGeneration);
    } catch (failure) {
      if (expectedGeneration === generation.current) {
        setUser(null);
        setStatus(unauthorized(failure) ? "unauthenticated" : "error");
        setError(errorMessage(failure));
      }
      throw failure;
    }
  }, [loadUser]);
  const value = useMemo<AuthContextValue>(() => ({ user, status, error, can: (permission) => status === "authenticated" && canUser(user, permission), login, verify, logout, reloadUser, retrySession }), [user, status, error, login, verify, logout, reloadUser, retrySession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth precisa estar dentro de AuthProvider.");
  return value;
}
