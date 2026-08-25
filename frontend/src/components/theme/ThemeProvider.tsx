import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeMode } from "@/lib/types";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  currency: string;
  setCurrency: (c: string) => void;
  hideBalance: boolean;
  toggleHideBalance: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("DARK");
  const [currency, setCurrencyState] = useState<string>("USD");
  const [hideBalance, setHideBalanceState] = useState<boolean>(false);

  useEffect(() => {
    // 1. Fetch settings from backend
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((settings) => {
        if (settings) {
          if (settings.theme) setThemeState(settings.theme);
          if (settings.currency) setCurrencyState(settings.currency);
          if (settings.hideBalance !== undefined) setHideBalanceState(settings.hideBalance);
        }
      })
      .catch(() => {
        const savedTheme = localStorage.getItem("ivy-theme") as ThemeMode;
        if (savedTheme) setThemeState(savedTheme);
      });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark", "true-black");

    if (theme === "LIGHT") {
      root.classList.add("light");
    } else if (theme === "TRUE_BLACK") {
      root.classList.add("dark", "true-black");
    } else {
      root.classList.add("dark");
    }

    localStorage.setItem("ivy-theme", theme);
  }, [theme]);

  const setTheme = async (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: mode }),
      });
    } catch {}
  };

  const setCurrency = async (c: string) => {
    setCurrencyState(c);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: c }),
      });
    } catch {}
  };

  const toggleHideBalance = async () => {
    const next = !hideBalance;
    setHideBalanceState(next);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hideBalance: next }),
      });
    } catch {}
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        currency,
        setCurrency,
        hideBalance,
        toggleHideBalance,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
