import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, clearToken, getMe, getToken, login as apiLogin, setToken } from "../api/client";
import type { User } from "../api/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setIsLoading(false);
      return;
    }
    getMe()
      .then(setUser)
      .catch((err) => {
        // Only a genuinely invalid/expired token should sign the user
        // out. A network blip, a slow/temporarily-down backend, or any
        // other transient failure here used to clear the token too --
        // silently logging someone out mid-session for reasons that
        // have nothing to do with their login being invalid.
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const token = await apiLogin(email, password);
    setToken(token);
    const me = await getMe();
    setUser(me);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
