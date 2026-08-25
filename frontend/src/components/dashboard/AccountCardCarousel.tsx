import React from "react";
import { Account } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { Plus } from "lucide-react";

interface AccountCardCarouselProps {
  accounts: Account[];
  onAddAccount: () => void;
}

export const AccountCardCarousel: React.FC<AccountCardCarouselProps> = ({
  accounts,
  onAddAccount,
}) => {
  const { hideBalance } = useTheme();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
          Accounts & Wallets
        </h3>
        <button
          onClick={onAddAccount}
          className="text-xs font-bold text-ivy-purple hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Plus size={14} />
          <span>New Wallet</span>
        </button>
      </div>

      <div className="flex items-center gap-3.5 overflow-x-auto pb-3 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {accounts.map((acc) => (
          <IvyCard
            key={acc.id}
            className="flex-shrink-0 w-44 sm:w-52 p-4 flex flex-col justify-between h-32 hover:border-ivy-purple/50 cursor-pointer relative group"
          >
            <div className="flex items-center justify-between">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: acc.color }}
              >
                <IvyIcon name={acc.icon || "wallet"} size={18} />
              </div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-surface-elevated)] px-2 py-0.5 rounded-full uppercase">
                {acc.currency}
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] truncate">
                {acc.name}
              </p>
              <p className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-tight">
                {hideBalance ? "••••••" : formatMoney(acc.balance || 0, acc.currency)}
              </p>
            </div>
          </IvyCard>
        ))}

        {/* Add Account Card */}
        <button
          onClick={onAddAccount}
          className="flex-shrink-0 w-36 sm:w-44 h-32 rounded-[24px] border-2 border-dashed border-[var(--border-color)] hover:border-ivy-purple bg-[var(--bg-surface-elevated)]/50 hover:bg-ivy-purple/5 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--bg-surface-elevated)] group-hover:bg-ivy-purple group-hover:text-white flex items-center justify-center text-[var(--text-muted)] transition-colors mb-1.5 shadow-sm">
            <Plus size={18} className="stroke-[2.5]" />
          </div>
          <span className="text-xs font-bold text-[var(--text-primary)]">Add Wallet</span>
        </button>
      </div>
    </div>
  );
};
