import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Plus,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onQuickAdd: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onQuickAdd }) => {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/transactions", label: "Activity", icon: ArrowLeftRight },
    { isAction: true, label: "Add", icon: Plus, onClick: onQuickAdd },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-surface)]/90 backdrop-blur-lg border-t border-[var(--border-color)] px-2 py-1.5 safe-pb">
      <div className="flex items-center justify-around">
        {navItems.map((item, index) => {
          if (item.isAction) {
            return (
              <button
                key={index}
                onClick={item.onClick}
                className="w-12 h-12 rounded-full bg-ivy-purple text-white flex items-center justify-center -translate-y-3 shadow-lg shadow-ivy-purple/40 active:scale-95 transition-transform"
                title="Quick Add Transaction"
              >
                <Plus size={24} className="stroke-[2.5]" />
              </button>
            );
          }

          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-bold transition-colors cursor-pointer",
                isActive
                  ? "text-ivy-purple"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon size={20} className={isActive ? "text-ivy-purple stroke-[2.5]" : "text-[var(--text-muted)]"} />
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
