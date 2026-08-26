import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
import { Eye, EyeOff, Plus, RefreshCw } from "lucide-react";
import { IvyButton } from "@/components/ui/IvyButton";

interface HeaderProps {
  onQuickAdd: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onQuickAdd }) => {
  const { hideBalance, toggleHideBalance } = useTheme();

  const handleSync = async () => {
    try {
      const res = await fetch("/api/sync");
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("ivy-data-updated"));
      }
    } catch {}
  };

  return (
    <header className="hidden md:flex sticky top-0 z-30 items-center justify-between px-6 lg:px-8 py-3.5 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-[var(--border-subtle)]">
      <div>
        <span className="text-xs font-semibold text-[var(--text-muted)]">
          Personal Money Management & Budgeting
        </span>
      </div>

      {/* Action buttons on the right */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Privacy Balance Toggle */}
        <button
          onClick={toggleHideBalance}
          className="p-2 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-ivy-purple/50 transition-all cursor-pointer shadow-sm"
          title={hideBalance ? "Reveal Balances" : "Hide Balances"}
          aria-label={hideBalance ? "Reveal Balances" : "Hide Balances"}
        >
          {hideBalance ? <EyeOff size={16} className="text-ivy-orange" /> : <Eye size={16} />}
        </button>

        {/* Sync Button */}
        <button
          onClick={handleSync}
          className="p-2 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-ivy-green hover:border-ivy-green/50 transition-all cursor-pointer shadow-sm"
          title="Sync Cloud / Check Updates"
          aria-label="Sync Cloud / Check Updates"
        >
          <RefreshCw size={16} />
        </button>

        {/* Theme Switcher */}
        <ThemeSwitch />

        {/* Desktop Quick Add Button */}
        <IvyButton onClick={onQuickAdd} size="sm" variant="primary">
          <Plus size={16} className="stroke-[2.5]" />
          <span>Add Transaction</span>
        </IvyButton>
      </div>
    </header>
  );
};

