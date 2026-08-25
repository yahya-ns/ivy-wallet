"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeMode } from "@/lib/types";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  currency: string;
  setCurrency: (currency: string) => void;
  hideBalance: boolean;
  setHideBalance: (hide: boolean) => void;
  toggleHideBalance: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("DARK");
  const [currency, setCurrencyState] = useState<string>("USD");
  const [hideBalance, setHideBalanceState] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    // Load local storage first for instant flicker-free rendering
    const localTheme = (localStorage.getItem("ivy_theme") as ThemeMode) || "DARK";
    const localCurrency = localStorage.getItem("ivy_currency") || "USD";
    const localHide = localStorage.getItem("ivy_hide_balance") === "true";

    setThemeState(localTheme);
    setCurrencyState(localCurrency);
    setHideBalanceState(localHide);
    applyThemeClass(localTheme);
    setMounted(true);

    // Fetch from settings API in background
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.theme) {
          setThemeState(data.theme);
          setCurrencyState(data.currency || "USD");
          setHideBalanceState(!!data.hideBalance);
          applyThemeClass(data.theme);
        }
      })
      .catch(() => {});
  }, []);

  const applyThemeClass = (selectedTheme: ThemeMode) => {
    const root = document.documentElement;
    root.classList.remove("dark", "true-black");

    if (selectedTheme === "DARK") {
      root.classList.add("dark");
    } else if (selectedTheme === "TRUE_BLACK") {
      root.classList.add("dark", "true-black");
    }
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem("ivy_theme", newTheme);
    applyThemeClass(newTheme);

    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {});
  };

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    localStorage.setItem("ivy_currency", newCurrency);

    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency: newCurrency }),
    }).catch(() => {});
  };

  const setHideBalance = (hide: boolean) => {
    setHideBalanceState(hide);
    localStorage.setItem("ivy_hide_balance", hide ? "true" : "false");

    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hideBalance: hide }),
    }).catch(() => {});
  };

  const toggleHideBalance = () => {
    setHideBalance(!hideBalance);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        currency,
        setCurrency,
        hideBalance,
        setHideBalance,
        toggleHideBalance,
      }}
    >
      <div className={!mounted ? "opacity-0" : "opacity-100 transition-opacity duration-200"}>
        {children}
      </div>
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
