import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  Plus,
  Menu,
} from "lucide-react";
import { cn, isNavActive } from "@/lib/utils";

interface BottomNavProps {
  onQuickAdd: () => void;
  onOpenMobileMenu?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onQuickAdd, onOpenMobileMenu }) => {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/transactions", label: "Transaction", icon: ArrowLeftRight },
    { isAction: true, label: "New Transaction", icon: Plus, onClick: onQuickAdd },
    { href: "/budgets", label: "Budget", icon: Target },
    { isMenu: true, label: "Menu", icon: Menu, onClick: onOpenMobileMenu },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-md border-t border-[var(--border-color)] px-2 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-lg shadow-black/5">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item, index) => {
          if (item.isAction) {
            return (
              <button
                key={index}
                type="button"
                onClick={item.onClick}
                className="w-14 h-14 rounded-full bg-ivy-purple text-white flex items-center justify-center -translate-y-4 shadow-xl shadow-ivy-purple/45 ring-4 ring-[var(--bg-surface)] active:scale-90 hover:scale-105 transition-all duration-200 cursor-pointer"
                title="Quick Add Transaction"
                aria-label="Add Transaction"
              >
                <Plus size={28} className="stroke-[2.5]" />
              </button>
            );
          }

          if (item.isMenu) {
            const Icon = item.icon;
            return (
              <button
                key={index}
                type="button"
                onClick={item.onClick}
                className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] active:text-ivy-purple transition-colors cursor-pointer"
                title="Open Navigation Menu"
                aria-label="Open Navigation Menu"
              >
                <Icon size={20} className="stroke-[2]" />
                <span className="mt-0.5">{item.label}</span>
              </button>
            );
          }

          const isActive = item.href ? isNavActive(location, item.href) : false;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer",
                isActive
                  ? "text-ivy-purple font-bold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon
                size={20}
                className={isActive ? "text-ivy-purple stroke-[2.5]" : "text-[var(--text-muted)] stroke-[2]"}
              />
              <span className="mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};


