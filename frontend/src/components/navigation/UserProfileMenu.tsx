import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { Link } from "wouter";
import { LogOut, User as UserIcon, Settings, ShieldCheck, ChevronDown } from "lucide-react";

interface UserProfileMenuProps {
  compact?: boolean;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ compact = false }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 rounded-2xl hover:bg-[var(--bg-surface-elevated)] border border-transparent hover:border-[var(--border-color)] transition-all cursor-pointer select-none text-left"
        aria-label="User profile menu"
      >
        {/* Avatar */}
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover border border-ivy-purple/30"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-ivy-purple to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
            {initials}
          </div>
        )}

        {!compact && (
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-[var(--text-primary)] leading-tight max-w-[120px] truncate">
              {user.name}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] leading-tight max-w-[120px] truncate">
              {user.email}
            </div>
          </div>
        )}

        <ChevronDown
          size={14}
          className={`text-[var(--text-muted)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown popup */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl rounded-2xl p-2 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
          {/* Header Info */}
          <div className="px-3 py-2 border-b border-[var(--border-subtle)] mb-1">
            <p className="text-xs font-bold text-[var(--text-primary)] truncate">{user.name}</p>
            <p className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-ivy-purple/10 text-ivy-purple border border-ivy-purple/20">
                <ShieldCheck size={10} />
                {user.provider ? user.provider.toUpperCase() : "OIDC"}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]">
                {user.role || "user"}
              </span>
            </div>
          </div>

          {/* Navigation links */}
          <div className="space-y-0.5">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-all cursor-pointer"
            >
              <Settings size={15} />
              <span>Settings & Preferences</span>
            </Link>
          </div>

          {/* Logout button */}
          <div className="pt-1 mt-1 border-t border-[var(--border-subtle)]">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-ivy-red hover:bg-ivy-red/10 transition-all cursor-pointer text-left"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
