import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { formatMoney } from "@/lib/utils";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react";
import { TransactionType } from "@/lib/types";

interface BalanceCardProps {
  totalBalance: number;
  totalIncomeMonth: number;
  totalExpenseMonth: number;
  onQuickAction: (type: TransactionType) => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  totalBalance,
  totalIncomeMonth,
  totalExpenseMonth,
  onQuickAction,
}) => {
  const { currency, hideBalance } = useTheme();

  return (
    <IvyCard className="relative overflow-hidden bg-gradient-to-br from-ivy-purple via-ivy-purple/90 to-indigo-900 text-white p-6 sm:p-8 shadow-xl shadow-ivy-purple/20 border-none">
      {/* Subtle Background Glow */}
      <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute right-24 bottom-0 w-48 h-48 bg-ivy-green/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Top: Balance Label & Amount */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-white/80 uppercase tracking-wider">
              Total Balance
            </span>
            <span className="text-[11px] font-semibold bg-white/15 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
              All Wallets
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight drop-shadow-sm">
            {hideBalance ? "••••••••" : formatMoney(totalBalance, currency)}
          </h2>
        </div>

        {/* Middle: Monthly Cash Flow Badges */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Monthly Income */}
          <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="w-8 h-8 rounded-xl bg-ivy-green/20 text-ivy-green flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold text-white/70 uppercase">This Month Income</span>
              <span className="block text-sm sm:text-base font-extrabold text-ivy-green truncate">
                {hideBalance ? "••••••" : `+${formatMoney(totalIncomeMonth, currency)}`}
              </span>
            </div>
          </div>

          {/* Monthly Expense */}
          <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="w-8 h-8 rounded-xl bg-ivy-red/20 text-ivy-red flex items-center justify-center shrink-0">
              <TrendingDown size={18} />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold text-white/70 uppercase">This Month Spent</span>
              <span className="block text-sm sm:text-base font-extrabold text-ivy-red truncate">
                {hideBalance ? "••••••" : `-${formatMoney(totalExpenseMonth, currency)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom: Quick Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 pt-2">
          <IvyButton
            onClick={() => onQuickAction("EXPENSE")}
            className="flex-1 bg-white text-ivy-purple hover:bg-white/90 shadow-none border-none text-xs sm:text-sm py-2.5 font-extrabold"
          >
            <ArrowDownLeft size={16} className="stroke-[2.5]" />
            <span>Expense</span>
          </IvyButton>

          <IvyButton
            onClick={() => onQuickAction("INCOME")}
            className="flex-1 bg-white/20 hover:bg-white/30 text-white backdrop-blur-md shadow-none border border-white/20 text-xs sm:text-sm py-2.5 font-extrabold"
          >
            <ArrowUpRight size={16} className="stroke-[2.5]" />
            <span>Income</span>
          </IvyButton>

          <IvyButton
            onClick={() => onQuickAction("TRANSFER")}
            className="flex-1 bg-white/20 hover:bg-white/30 text-white backdrop-blur-md shadow-none border border-white/20 text-xs sm:text-sm py-2.5 font-extrabold"
          >
            <ArrowLeftRight size={16} className="stroke-[2.5]" />
            <span>Transfer</span>
          </IvyButton>
        </div>
      </div>
    </IvyCard>
  );
};
