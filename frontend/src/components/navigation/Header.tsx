import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
import { Eye, EyeOff, Plus } from "lucide-react";
import { IvyButton } from "@/components/ui/IvyButton";
import { SyncStatusBadge } from "@/components/ui/SyncStatusBadge";
import { UserProfileMenu } from "./UserProfileMenu";

interface HeaderProps {
  onQuickAdd: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onQuickAdd }) => {
  const { hideBalance, toggleHideBalance } = useTheme();

  return (
    <header className="hidden md:flex sticky top-0 z-30 items-center justify-between px-6 lg:px-8 py-3.5 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-[var(--border-subtle)]">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-[var(--text-muted)]">
          Personal Money Management & Budgeting
        </span>
        <SyncStatusBadge />
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

        {/* Theme Switcher */}
        <ThemeSwitch />

        {/* Desktop Quick Add Button */}
        <IvyButton onClick={onQuickAdd} size="sm" variant="primary">
          <Plus size={16} className="stroke-[2.5]" />
          <span>Add Transaction</span>
        </IvyButton>

        {/* User Profile Dropdown */}
        <div className="pl-2 border-l border-[var(--border-subtle)]">
          <UserProfileMenu />
        </div>
      </div>
    </header>
  );
};
