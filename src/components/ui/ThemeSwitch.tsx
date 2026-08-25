"use client";

import React from "react";
import { Sun, Moon, Sparkles } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] p-1 rounded-full">
      <button
        onClick={() => setTheme("LIGHT")}
        title="Light Mode"
        className={cn(
          "p-1.5 rounded-full transition-all duration-200",
          theme === "LIGHT"
            ? "bg-white text-ivy-orange shadow-sm scale-105"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        )}
      >
        <Sun size={16} />
      </button>

      <button
        onClick={() => setTheme("DARK")}
        title="Dark Mode"
        className={cn(
          "p-1.5 rounded-full transition-all duration-200",
          theme === "DARK"
            ? "bg-ivy-darkGray text-ivy-purple-light shadow-sm scale-105"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        )}
      >
        <Moon size={16} />
      </button>

      <button
        onClick={() => setTheme("TRUE_BLACK")}
        title="True Black (OLED)"
        className={cn(
          "p-1.5 rounded-full transition-all duration-200",
          theme === "TRUE_BLACK"
            ? "bg-black text-ivy-green shadow-sm scale-105"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        )}
      >
        <Sparkles size={16} />
      </button>
    </div>
  );
}
