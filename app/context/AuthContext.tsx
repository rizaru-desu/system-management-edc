import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { MOCK_USERS } from "~/data/mockData";

import type { RoleKey, User } from "~/data/mockData";

type StoredAuth = {
  user: User;
  activeRole: RoleKey;
};

type LoginResult = { ok: true } | { ok: false; error: string };

type AuthContextValue = {
  user: User | null;
  activeRole: RoleKey | null;
  ready: boolean;
  login: (email: string, password: string) => LoginResult;
  logout: () => void;
  switchRole: (role: RoleKey) => void;
};

const storageKey = "edc_auth";
const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return null;
    return JSON.parse(stored) as StoredAuth;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<RoleKey | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredAuth();
    if (!stored) {
      setReady(true);
      return;
    }

    setUser(stored.user);
    setActiveRole(stored.activeRole);
    setReady(true);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const login = (email: string, password: string): LoginResult => {
      const found = MOCK_USERS.find(
        (mockUser) =>
          mockUser.email.toLowerCase() === email.trim().toLowerCase() &&
          mockUser.password === password,
      );

      if (!found) return { ok: false, error: "Invalid email or password" };

      setUser(found);
      setActiveRole(found.role);
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ user: found, activeRole: found.role }),
      );

      return { ok: true };
    };

    const logout = () => {
      setUser(null);
      setActiveRole(null);
      window.localStorage.removeItem(storageKey);
    };

    const switchRole = (role: RoleKey) => {
      setActiveRole(role);
      if (!user) return;

      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ user, activeRole: role }),
      );
    };

    return { user, activeRole, ready, login, logout, switchRole };
  }, [activeRole, ready, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
