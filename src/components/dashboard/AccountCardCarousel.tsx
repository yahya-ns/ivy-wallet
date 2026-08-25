"use client";

import React from "react";
import Link from "next/link";
import { Account } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Plus, ChevronRight, Wallet } from "lucide-react";

interface AccountCardCarouselProps {
  accounts: Account[];
  onAddAccount: () => void;
}

export function AccountCardCarousel({ accounts, onAddAccount }: AccountCardCarouselProps) {
  const { currency, hideBalance } = useTheme();

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
          Accounts & Wallets
        </h3>
        <Link
          href="/accounts"
          className="text-xs font-semibold text-ivy-purple hover:underline flex items-center gap-0.5"
        >
          <span>Manage</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      <div className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-none snap-x">
        {accounts.map((account) => {
          return (
            <div
              key={account.id}
              className="min-w-[170px] sm:min-w-[190px] p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-ivy-purple/40 shadow-sm transition-all duration-200 snap-start flex flex-col justify-between shrink-0"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: account.color || "#5C3DF5" }}
                >
                  <IvyIcon name={account.icon || "wallet"} size={19} />
                </div>
                <span className="text-[11px] font-bold text-[var(--text-muted)] bg-[var(--bg-surface-elevated)] px-2 py-0.5 rounded-full uppercase">
                  {account.currency || currency}
                </span>
              </div>

              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)] truncate">
                  {account.name}
                </p>
                <p className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] mt-0.5 tracking-tight">
                  {hideBalance ? "••••••" : formatMoney(account.balance || 0, account.currency || currency)}
                </p>
              </div>
            </div>
          );
        })}

        {/* Add Account Card Button */}
        <button
          onClick={onAddAccount}
          className="min-w-[140px] p-4 rounded-2xl border-2 border-dashed border-[var(--border-color)] hover:border-ivy-purple bg-[var(--bg-surface-elevated)]/50 hover:bg-ivy-purple/5 transition-all duration-200 snap-start flex flex-col items-center justify-center text-[var(--text-muted)] hover:text-ivy-purple cursor-pointer shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface-elevated)] flex items-center justify-center mb-2 shadow-inner">
            <Plus size={20} />
          </div>
          <span className="text-xs font-bold">New Account</span>
        </button>
      </div>
    </div>
  );
}
