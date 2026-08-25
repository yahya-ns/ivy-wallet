import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ThemeMode } from "@/lib/types";
import {
  formatDate as utilFormatDate,
  formatTimeOnly as utilFormatTimeOnly,
  formatDateTime as utilFormatDateTime,
  formatRelativeDate as utilFormatRelativeDate,
} from "@/lib/utils";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  currency: string;
  setCurrency: (c: string) => void;
  hideBalance: boolean;
  toggleHideBalance: () => void;
  dateFormat: string;
  setDateFormat: (format: string) => void;
  timeFormat: string;
  setTimeFormat: (format: string) => void;
  formatDate: (date: string | Date) => string;
  formatTime: (date: string | Date) => string;
  formatDateTime: (date: string | Date) => string;
  formatRelative: (date: string | Date) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("DARK");
  const [currency, setCurrencyState] = useState<string>("USD");
  const [hideBalance, setHideBalanceState] = useState<boolean>(false);
  const [dateFormat, setDateFormatState] = useState<string>("YYYY-MM-DD");
  const [timeFormat, setTimeFormatState] = useState<string>("24_HOUR");

  const loadSettings = useCallback(() => {
    // 1. Fetch settings from backend
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((settings) => {
        if (settings) {
          if (settings.theme) setThemeState(settings.theme);
          if (settings.currency) setCurrencyState(settings.currency);
          if (settings.hideBalance !== undefined) setHideBalanceState(settings.hideBalance);
          if (settings.dateFormat) {
            setDateFormatState(settings.dateFormat);
            localStorage.setItem("ivy-date-format", settings.dateFormat);
          }
          if (settings.timeFormat) {
            setTimeFormatState(settings.timeFormat);
            localStorage.setItem("ivy-time-format", settings.timeFormat);
          }
        }
      })
      .catch(() => {
        const savedTheme = localStorage.getItem("ivy-theme") as ThemeMode;
        if (savedTheme) setThemeState(savedTheme);
        const savedDateFormat = localStorage.getItem("ivy-date-format");
        if (savedDateFormat) setDateFormatState(savedDateFormat);
        const savedTimeFormat = localStorage.getItem("ivy-time-format");
        if (savedTimeFormat) setTimeFormatState(savedTimeFormat);
      });
  }, []);

  useEffect(() => {
    loadSettings();
    const handleUpdate = () => loadSettings();
    window.addEventListener("ivy-data-updated", handleUpdate);
    return () => window.removeEventListener("ivy-data-updated", handleUpdate);
  }, [loadSettings]);

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

  const setDateFormat = async (df: string) => {
    setDateFormatState(df);
    localStorage.setItem("ivy-date-format", df);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateFormat: df }),
      });
    } catch {}
  };

  const setTimeFormat = async (tf: string) => {
    setTimeFormatState(tf);
    localStorage.setItem("ivy-time-format", tf);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeFormat: tf }),
      });
    } catch {}
  };

  const formatDate = useCallback(
    (date: string | Date) => utilFormatDate(date, dateFormat),
    [dateFormat]
  );

  const formatTime = useCallback(
    (date: string | Date) => utilFormatTimeOnly(date, timeFormat),
    [timeFormat]
  );

  const formatDateTime = useCallback(
    (date: string | Date) => utilFormatDateTime(date, dateFormat, timeFormat),
    [dateFormat, timeFormat]
  );

  const formatRelative = useCallback(
    (date: string | Date) => utilFormatRelativeDate(date, dateFormat),
    [dateFormat]
  );

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        currency,
        setCurrency,
        hideBalance,
        toggleHideBalance,
        dateFormat,
        setDateFormat,
        timeFormat,
        setTimeFormat,
        formatDate,
        formatTime,
        formatDateTime,
        formatRelative,
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

