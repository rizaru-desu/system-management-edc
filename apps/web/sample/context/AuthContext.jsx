import { createContext, useContext, useState, useEffect } from "react";
import { MOCK_USERS } from "@/data/mockData";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeRole, setActiveRole] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("edc_auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed.user);
      setActiveRole(parsed.activeRole);
    }
  }, []);

  const login = (email, password) => {
    const found = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return { ok: false, error: "Invalid email or password" };
    setUser(found);
    setActiveRole(found.role);
    localStorage.setItem("edc_auth", JSON.stringify({ user: found, activeRole: found.role }));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    setActiveRole(null);
    localStorage.removeItem("edc_auth");
  };

  const switchRole = (role) => {
    setActiveRole(role);
    if (user) {
      localStorage.setItem("edc_auth", JSON.stringify({ user, activeRole: role }));
    }
  };

  return (
    <AuthContext.Provider value={{ user, activeRole, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
