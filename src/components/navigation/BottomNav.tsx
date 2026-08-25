"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Plus,
  PieChart,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onOpenAddModal: () => void;
}

export function BottomNav({ onOpenAddModal }: BottomNavProps) {
  const pathname = usePathname();

  const NAV_ITEMS = [
    { label: "Overview", href: "/", icon: LayoutDashboard },
    { label: "Activity", href: "/transactions", icon: ArrowLeftRight },
    { label: "Reports", href: "/reports", icon: PieChart },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-surface)]/90 backdrop-blur-lg border-t border-[var(--border-color)] pb-safe">
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto relative">
        {/* First 2 items */}
        {NAV_ITEMS.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 text-xs transition-colors",
                isActive
                  ? "text-ivy-purple font-semibold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon size={20} className={isActive ? "text-ivy-purple stroke-[2.5]" : ""} />
              <span className="text-[11px] mt-1">{item.label}</span>
            </Link>
          );
        })}

        {/* Center Floating Action Button */}
        <div className="flex items-center justify-center flex-1 -mt-6">
          <button
            onClick={onOpenAddModal}
            aria-label="Add Transaction"
            className="w-13 h-13 rounded-full bg-gradient-to-r from-ivy-purple to-ivy-purple-kindaDark text-white flex items-center justify-center shadow-xl shadow-ivy-purple/40 active:scale-90 transition-transform cursor-pointer border-4 border-[var(--bg-surface)]"
          >
            <Plus size={28} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Last 2 items */}
        {NAV_ITEMS.slice(2, 4).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 text-xs transition-colors",
                isActive
                  ? "text-ivy-purple font-semibold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon size={20} className={isActive ? "text-ivy-purple stroke-[2.5]" : ""} />
              <span className="text-[11px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
