"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PieChart,
  Target,
  HandCoins,
  CalendarClock,
  Settings,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Accounts", href: "/accounts", icon: Wallet },
  { label: "Categories", href: "/categories", icon: Tags },
  { label: "Budgets", href: "/budgets", icon: Target },
  { label: "Loans & Debts", href: "/loans", icon: HandCoins },
  { label: "Planned", href: "/planned", icon: CalendarClock },
  { label: "Reports", href: "/reports", icon: PieChart },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-[var(--bg-surface)] border-r border-[var(--border-color)] p-5 z-30 justify-between">
      <div>
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 px-3 py-3 mb-8 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-ivy-purple to-ivy-green flex items-center justify-center shadow-lg shadow-ivy-purple/30 group-hover:scale-105 transition-transform">
            <span className="text-white font-black text-xl tracking-tighter">IV</span>
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-[var(--text-primary)] leading-tight tracking-tight">
              Ivy Wallet
            </h1>
            <span className="text-xs text-ivy-green font-medium tracking-wide">
              Web Edition
            </span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3.5 px-4 py-3 rounded-2xl font-medium text-sm transition-all duration-200",
                  isActive
                    ? "bg-ivy-purple text-white shadow-md shadow-ivy-purple/20 font-semibold translate-x-1"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]"
                )}
              >
                <Icon size={19} className={isActive ? "text-white" : "text-[var(--text-muted)]"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)] px-3">
        <div className="flex items-center justify-between">
          <span>Ivy Wallet Web</span>
          <span className="text-[10px] bg-ivy-green/15 text-ivy-green font-bold px-2 py-0.5 rounded-full">
            v1.0.0
          </span>
        </div>
      </div>
    </aside>
  );
}
