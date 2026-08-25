import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Sun, Moon, Sparkles } from "lucide-react";
import { ThemeMode } from "@/lib/types";

export const ThemeSwitch: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const sequence: ThemeMode[] = ["LIGHT", "DARK", "TRUE_BLACK"];
    const nextIndex = (sequence.indexOf(theme) + 1) % sequence.length;
    setTheme(sequence[nextIndex]);
  };

  const getIcon = () => {
    switch (theme) {
      case "LIGHT":
        return <Sun size={18} className="text-ivy-orange" />;
      case "DARK":
        return <Moon size={18} className="text-ivy-purple-light" />;
      case "TRUE_BLACK":
        return <Sparkles size={18} className="text-ivy-green" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case "LIGHT":
        return "Light";
      case "DARK":
        return "Dark";
      case "TRUE_BLACK":
        return "OLED Black";
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] hover:border-ivy-purple/50 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-sm"
      title={`Current: ${getLabel()} (Click to toggle)`}
    >
      {getIcon()}
      <span className="hidden sm:inline">{getLabel()}</span>
    </button>
  );
};
