import React from "react";
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
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { cn, isNavActive } from "@/lib/utils";
import { useAuth } from "@/lib/authContext";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/loans", label: "Loans & Debts", icon: HandCoins },
  { href: "/planned", label: "Planned", icon: CalendarClock },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const Sidebar: React.FC = () => {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-[var(--border-color)] bg-[var(--bg-surface)] p-4 z-40 select-none">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-3 py-4 mb-4">
        <img
          src="/pwa-192x192.png"
          alt="Ivy Wallet Logo"
          className="w-10 h-10 rounded-2xl object-cover shadow-sm"
        />
        <div>
          <h1 className="font-extrabold text-lg text-[var(--text-primary)] tracking-tight">
            Ivy Wallet
          </h1>
          <p className="text-[10px] text-[var(--text-muted)] font-medium">Multi-User & OIDC</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = isNavActive(location, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer",
                isActive
                  ? "bg-ivy-purple text-white shadow-md shadow-ivy-purple/30 font-bold"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon size={19} className={isActive ? "text-white" : "text-[var(--text-muted)]"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Card in Sidebar Footer */}
      {user && (
        <div className="pt-3 border-t border-[var(--border-subtle)] px-1">
          <div className="p-2.5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-ivy-purple/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-ivy-purple to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{user.name}</p>
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                  <ShieldCheck size={10} className="text-ivy-purple shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-xl hover:bg-ivy-red/10 text-[var(--text-muted)] hover:text-ivy-red transition-all cursor-pointer shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
