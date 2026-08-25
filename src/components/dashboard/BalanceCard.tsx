"use client";

import React from "react";
import { IvyCard } from "@/components/ui/IvyCard";
import { formatMoney } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Plus, Minus, ArrowLeftRight, Eye, EyeOff, Wallet } from "lucide-react";
import { TransactionType } from "@/lib/types";

interface BalanceCardProps {
  totalBalance: number;
  totalIncomeMonth: number;
  totalExpenseMonth: number;
  onQuickAction: (type: TransactionType) => void;
}

export function BalanceCard({
  totalBalance,
  totalIncomeMonth,
  totalExpenseMonth,
  onQuickAction,
}: BalanceCardProps) {
  const { currency, hideBalance, toggleHideBalance } = useTheme();

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-ivy-purple via-ivy-purple-dark to-ivy-purple-extraDark text-white p-6 sm:p-7 shadow-xl shadow-ivy-purple/20">
      {/* Background ambient pattern */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 rounded-full bg-ivy-green/20 blur-2xl pointer-events-none" />

      {/* Top row: Label and Eye icon */}
      <div className="relative z-10 flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-white/15 backdrop-blur-md">
            <Wallet size={16} className="text-white" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-white/80 uppercase tracking-wider">
            Total Balance
          </span>
        </div>

        <button
          onClick={toggleHideBalance}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/90 cursor-pointer"
          title={hideBalance ? "Show balance" : "Hide balance"}
        >
          {hideBalance ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {/* Main Balance Display */}
      <div className="relative z-10 my-3">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight drop-shadow-sm">
          {hideBalance ? "••••••••" : formatMoney(totalBalance, currency)}
        </h2>
      </div>

      {/* Monthly Mini Flow Summary */}
      <div className="relative z-10 grid grid-cols-2 gap-3 my-5 pt-3 border-t border-white/15">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-ivy-green/20 flex items-center justify-center text-ivy-green-light shrink-0">
            <Plus size={16} className="stroke-[3]" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-white/70">Income this month</p>
            <p className="text-xs sm:text-sm font-bold text-white">
              {hideBalance ? "••••••" : formatMoney(totalIncomeMonth, currency)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-ivy-red/20 flex items-center justify-center text-ivy-red-light shrink-0">
            <Minus size={16} className="stroke-[3]" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-white/70">Expense this month</p>
            <p className="text-xs sm:text-sm font-bold text-white">
              {hideBalance ? "••••••" : formatMoney(totalExpenseMonth, currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="relative z-10 grid grid-cols-3 gap-2.5 sm:gap-3 mt-1">
        <button
          onClick={() => onQuickAction("INCOME")}
          className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-white/15 hover:bg-ivy-green hover:text-white backdrop-blur-md text-white font-bold text-xs sm:text-sm transition-all duration-200 shadow-sm active:scale-95 cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-full bg-ivy-green group-hover:bg-white text-white group-hover:text-ivy-green flex items-center justify-center transition-colors">
            <Plus size={14} className="stroke-[3]" />
          </div>
          <span>Income</span>
        </button>

        <button
          onClick={() => onQuickAction("EXPENSE")}
          className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-white/15 hover:bg-ivy-red hover:text-white backdrop-blur-md text-white font-bold text-xs sm:text-sm transition-all duration-200 shadow-sm active:scale-95 cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-full bg-ivy-red group-hover:bg-white text-white group-hover:text-ivy-red flex items-center justify-center transition-colors">
            <Minus size={14} className="stroke-[3]" />
          </div>
          <span>Expense</span>
        </button>

        <button
          onClick={() => onQuickAction("TRANSFER")}
          className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-white/15 hover:bg-ivy-blue hover:text-white backdrop-blur-md text-white font-bold text-xs sm:text-sm transition-all duration-200 shadow-sm active:scale-95 cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-full bg-ivy-blue group-hover:bg-white text-white group-hover:text-ivy-blue flex items-center justify-center transition-colors">
            <ArrowLeftRight size={14} className="stroke-[2.5]" />
          </div>
          <span>Transfer</span>
        </button>
      </div>
    </div>
  );
}
