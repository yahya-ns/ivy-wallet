import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tags,
  Target,
  HandCoins,
  CalendarClock,
  BarChart3,
  Settings,
  X,
  Plus,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { cn, isNavActive } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
import { IvyButton } from "@/components/ui/IvyButton";

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickAdd: () => void;
}

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts & Wallets", icon: Wallet },
  { href: "/categories", label: "Categories & Tags", icon: Tags },
  { href: "/budgets", label: "Budgets & Limits", icon: Target },
  { href: "/loans", label: "Loans & Debts", icon: HandCoins },
  { href: "/planned", label: "Planned Payments", icon: CalendarClock },
  { href: "/reports", label: "Reports & Trends", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  onQuickAdd,
}) => {
  const [location] = useLocation();
  const { hideBalance, toggleHideBalance } = useTheme();

  // Prevent background body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSync = async () => {
    try {
      const res = await fetch("/api/sync");
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("ivy-data-updated"));
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-out Sidebar Drawer */}
      <div className="relative w-4/5 max-w-xs bg-[var(--bg-surface)] border-r border-[var(--border-color)] h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-250 ease-out select-none">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-ivy-purple to-ivy-green flex items-center justify-center text-white font-black text-base shadow-md shadow-ivy-purple/30">
              IV
            </div>
            <div>
              <h2 className="font-black text-base text-[var(--text-primary)] tracking-tight">
                Ivy Wallet
              </h2>
              <span className="text-[10px] font-bold text-ivy-purple uppercase tracking-wider">
                Web Edition
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
            title="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Add Action */}
        <div className="p-3 border-b border-[var(--border-subtle)]">
          <IvyButton
            onClick={() => {
              onClose();
              onQuickAdd();
            }}
            variant="primary"
            className="w-full justify-center py-2.5 shadow-md shadow-ivy-purple/20"
          >
            <Plus size={18} className="stroke-[2.5]" />
            <span>Add Transaction</span>
          </IvyButton>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavActive(location, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-ivy-purple text-white shadow-md shadow-ivy-purple/30 font-bold"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]"
                )}
              >
                <Icon
                  size={19}
                  className={isActive ? "text-white stroke-[2.5]" : "text-[var(--text-muted)]"}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Drawer Bottom Controls */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)]">Preferences</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleHideBalance}
                className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                title={hideBalance ? "Reveal Balances" : "Hide Balances"}
              >
                {hideBalance ? <EyeOff size={15} className="text-ivy-orange" /> : <Eye size={15} />}
              </button>
              <button
                type="button"
                onClick={handleSync}
                className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-ivy-green cursor-pointer"
                title="Sync"
              >
                <RefreshCw size={15} />
              </button>
              <ThemeSwitch />
            </div>
          </div>

          <div className="text-[10px] text-[var(--text-muted)] flex items-center justify-between pt-1">
            <span>Ivy Wallet • Go + Vite</span>
            <span className="font-semibold text-ivy-green">100% Offline & Private</span>
          </div>
        </div>
      </div>
    </div>
  );
};
