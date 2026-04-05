import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { User } from "@/data/types";
import { authApi, buildRegisterFormData, TOKEN_KEY, USER_KEY, USER_TYPE_KEY } from "@/lib/api";
import { mapApiUserToUser, roleToBackendType, type ApiUser } from "@/lib/authMap";
import type { UserRole } from "@/data/types";

/** RIDER: cadastro da conta ok, mas falta POST do veículo — AppContent mostra o passo antes do dashboard. */
export const PENDING_RIDER_VEHICLE_KEY = "oxente_pending_vehicle";

interface RegisterAccountParams {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  address?: string;
  coordinates?: string;
  avatarFile?: File | null;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  registerAccount: (params: RegisterAccountParams) => Promise<{ token: string; user: ApiUser }>;
  setSessionFromApi: (data: { token: string; user: ApiUser }) => void;
  updateLocalUser: (partial: Partial<User>) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    if (!parsed.userType) {
      parsed.userType = "USER";
    }
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const setSessionFromApi = useCallback((data: { token: string; user: ApiUser }) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_TYPE_KEY, String(data.user.type));
    const u = mapApiUserToUser(data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const updateLocalUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const stored = readStoredUser();
      if (stored) setUser(stored);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await authApi.login(email, password);
      setSessionFromApi(data);
    },
    [setSessionFromApi]
  );

  const registerAccount = useCallback(
    async (params: RegisterAccountParams) => {
      const fd = buildRegisterFormData({
        name: params.name,
        email: params.email,
        password: params.password,
        phone: params.phone,
        type: roleToBackendType(params.role),
        address: params.address,
        coordinates: params.coordinates,
        image: params.avatarFile ?? null,
      });
      const { data } = await authApi.register(fd);
      if (params.role === "rider") {
        sessionStorage.setItem(PENDING_RIDER_VEHICLE_KEY, "1");
      }
      setSessionFromApi(data);
      return data;
    },
    [setSessionFromApi]
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_TYPE_KEY);
    try {
      sessionStorage.removeItem(PENDING_RIDER_VEHICLE_KEY);
    } catch {
      /* noop */
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, login, registerAccount, setSessionFromApi, updateLocalUser, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
