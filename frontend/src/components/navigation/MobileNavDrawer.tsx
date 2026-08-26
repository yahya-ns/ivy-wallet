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
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { cn, isNavActive } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/lib/authContext";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
import { IvyButton } from "@/components/ui/IvyButton";
import { SyncStatusBadge } from "@/components/ui/SyncStatusBadge";

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
  const { user, logout } = useAuth();

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

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

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
            <img
              src="/pwa-192x192.png"
              alt="Ivy Wallet Logo"
              className="w-10 h-10 rounded-2xl object-cover"
            />
            <div>
              <h2 className="font-black text-lg text-[var(--text-primary)] tracking-tight">
                Ivy Wallet
              </h2>
              <p className="text-[10px] text-[var(--text-muted)]">Multi-User & OIDC</p>
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

        {/* User Card in Mobile Drawer */}
        {user && (
          <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/40">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-ivy-purple/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-ivy-purple to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">{user.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{user.email}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  logout();
                }}
                title="Sign Out"
                className="p-1.5 rounded-xl hover:bg-ivy-red/10 text-ivy-red transition-all cursor-pointer shrink-0"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}

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
            <span className="text-xs font-bold text-[var(--text-muted)]">Status & Sync</span>
            <SyncStatusBadge />
          </div>

          <div className="flex items-center justify-between pt-1">
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
              <ThemeSwitch />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
