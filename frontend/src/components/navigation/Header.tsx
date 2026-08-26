import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
import { Eye, EyeOff, Plus, RefreshCw, Menu } from "lucide-react";
import { IvyButton } from "@/components/ui/IvyButton";

interface HeaderProps {
  onQuickAdd: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onQuickAdd, onOpenMobileMenu }) => {
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
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-[var(--border-subtle)]">
      {/* Mobile brand title with Hamburger button */}
      <div className="flex items-center gap-2.5 md:hidden">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="p-2 -ml-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
          title="Open Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu size={22} className="stroke-[2.5]" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ivy-purple to-ivy-green flex items-center justify-center text-white font-black text-xs shadow-md">
            IV
          </div>
          <span className="font-extrabold text-sm text-[var(--text-primary)]">
            Ivy Wallet
          </span>
        </div>
      </div>

      <div className="hidden md:block">
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
        >
          {hideBalance ? <EyeOff size={16} className="text-ivy-orange" /> : <Eye size={16} />}
        </button>

        {/* Sync Button */}
        <button
          onClick={handleSync}
          className="p-2 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-ivy-green hover:border-ivy-green/50 transition-all cursor-pointer shadow-sm"
          title="Sync Cloud / Check Updates"
        >
          <RefreshCw size={16} />
        </button>

        {/* Theme Switcher */}
        <ThemeSwitch />

        {/* Desktop Quick Add Button */}
        <div className="hidden md:block">
          <IvyButton onClick={onQuickAdd} size="sm" variant="primary">
            <Plus size={16} className="stroke-[2.5]" />
            <span>Add Transaction</span>
          </IvyButton>
        </div>
      </div>
    </header>
  );
};
