"use client";

import React from "react";
import { Plus, Eye, EyeOff } from "lucide-react";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
import { IvyButton } from "@/components/ui/IvyButton";
import { useTheme } from "@/components/theme/ThemeProvider";

interface HeaderProps {
  title?: string;
  onOpenAddModal: () => void;
}

export function Header({ title, onOpenAddModal }: HeaderProps) {
  const { hideBalance, toggleHideBalance } = useTheme();

  return (
    <header className="flex items-center justify-between py-4 px-4 sm:px-8 border-b border-[var(--border-color)] bg-[var(--bg-surface)]/60 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {title ? (
          <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
            {title}
          </h2>
        ) : (
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ivy-purple to-ivy-green flex items-center justify-center shadow-md">
              <span className="text-white font-black text-sm">IV</span>
            </div>
            <span className="font-extrabold text-base text-[var(--text-primary)]">
              Ivy Wallet
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Hide/Show Balance toggle */}
        <button
          onClick={toggleHideBalance}
          title={hideBalance ? "Show balance" : "Hide balance"}
          className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
        >
          {hideBalance ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>

        {/* Theme Switch */}
        <ThemeSwitch />

        {/* Desktop Add Transaction Button */}
        <div className="hidden sm:block">
          <IvyButton onClick={onOpenAddModal} size="sm" variant="primary">
            <Plus size={16} className="stroke-[2.5]" />
            <span>Add Transaction</span>
          </IvyButton>
        </div>
      </div>
    </header>
  );
}
