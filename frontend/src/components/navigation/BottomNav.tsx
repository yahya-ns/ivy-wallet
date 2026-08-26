import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Wallet,
  Tags,
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
    { href: "/accounts", label: "Accounts", icon: Wallet },
    { isAction: true, label: "Add", icon: Plus, onClick: onQuickAdd },
    { href: "/categories", label: "Categories", icon: Tags },
    { isMenu: true, label: "Menu", icon: Menu, onClick: onOpenMobileMenu },
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
                className="w-12 h-12 rounded-full bg-ivy-purple text-white flex items-center justify-center -translate-y-3 shadow-lg shadow-ivy-purple/40 active:scale-95 transition-transform cursor-pointer"
                title="Quick Add Transaction"
              >
                <Plus size={24} className="stroke-[2.5]" />
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
                className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] active:text-ivy-purple transition-colors cursor-pointer"
                title="All Navigation Menu"
              >
                <Icon size={20} className="stroke-[2.2]" />
                <span className="mt-1">{item.label}</span>
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

