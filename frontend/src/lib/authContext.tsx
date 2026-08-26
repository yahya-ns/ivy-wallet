import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, AuthConfig } from "./types";
import { API_BASE, fetchJson } from "./api";

interface AuthContextType {
  user: User | null;
  authConfig: AuthConfig | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginOIDC: () => void;
  loginLocal: (email: string, password?: string) => Promise<void>;
  devLogin: (email: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch Auth Config and Current User
  const refreshUser = async () => {
    try {
      // 1. Load config
      const conf = await fetchJson<AuthConfig>("/auth/config");
      setAuthConfig(conf);

      // 2. Load user profile
      const meRes = await fetchJson<{ user: User }>("/auth/me");
      if (meRes && meRes.user) {
        setUser(meRes.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const loginOIDC = () => {
    window.location.href = `${API_BASE}/auth/oidc/login`;
  };

  const loginLocal = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await fetchJson<{ user: User }>("/auth/login/local", {
        method: "POST",
        body: JSON.stringify({ email, password: password || "" }),
      });
      if (res && res.user) {
        setUser(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const devLogin = async (email: string, name: string) => {
    setIsLoading(true);
    try {
      const res = await fetchJson<{ user: User }>("/auth/dev-login", {
        method: "POST",
        body: JSON.stringify({ email, name }),
      });
      if (res && res.user) {
        setUser(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetchJson("/auth/logout", {
        method: "POST",
      });
      setUser(null);
      // Redirect to login page
      window.location.href = "/login";
    } catch {
      setUser(null);
      window.location.href = "/login";
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = !authConfig?.authEnabled || user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        authConfig,
        isLoading,
        isAuthenticated,
        loginOIDC,
        loginLocal,
        devLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
