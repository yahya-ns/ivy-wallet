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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-[var(--border-color)] bg-[var(--bg-surface)] p-4 z-40 select-none">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-3 py-4 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-ivy-purple to-ivy-green flex items-center justify-center text-white font-black text-lg shadow-lg shadow-ivy-purple/25">
          IV
        </div>
        <div>
          <h1 className="font-extrabold text-base text-[var(--text-primary)] tracking-tight">
            Ivy Wallet
          </h1>
          <span className="text-[10px] font-bold text-ivy-purple uppercase tracking-wider">
            Web Edition
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
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

      {/* Footer info */}
      <div className="pt-4 border-t border-[var(--border-subtle)] px-3 text-[11px] text-[var(--text-muted)]">
        <p className="font-medium">Ivy Wallet • Go + Vite</p>
        <p className="opacity-75">100% Offline & Private</p>
      </div>
    </aside>
  );
};
