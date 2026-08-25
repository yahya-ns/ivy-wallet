"use client";

import React from "react";
import { Transaction } from "@/lib/types";
import { formatMoney, formatTime, formatRelativeDate } from "@/lib/utils";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ArrowLeftRight, Trash2, Edit2 } from "lucide-react";

interface TransactionItemProps {
  transaction: Transaction;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
}

export function TransactionItem({ transaction, onEdit, onDelete }: TransactionItemProps) {
  const { currency, hideBalance } = useTheme();

  const isIncome = transaction.type === "INCOME";
  const isExpense = transaction.type === "EXPENSE";
  const isTransfer = transaction.type === "TRANSFER";

  const catColor = transaction.category?.color || "#5C3DF5";
  const catIcon = isTransfer
    ? "wallet"
    : transaction.category?.icon || (isIncome ? "briefcase" : "tag");

  const title =
    transaction.title ||
    (isTransfer
      ? `Transfer: ${transaction.account?.name || "Account"} → ${transaction.toAccount?.name || "Account"}`
      : transaction.category?.name || (isIncome ? "Income" : "Expense"));

  return (
    <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-color)] transition-all duration-200">
      {/* Left: Icon and details */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
          style={{ backgroundColor: isTransfer ? "#3193F5" : catColor }}
        >
          {isTransfer ? <ArrowLeftRight size={20} /> : <IvyIcon name={catIcon} size={20} />}
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
            {title}
          </p>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
            <span className="font-medium text-[var(--text-secondary)]">
              {transaction.account?.name || "Account"}
            </span>
            <span>•</span>
            <span>{formatRelativeDate(transaction.dateTime)}</span>
            <span>•</span>
            <span>{formatTime(transaction.dateTime)}</span>
          </div>
        </div>
      </div>

      {/* Right: Amount & action buttons */}
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <div className="text-right">
          <p
            className={`font-bold text-sm sm:text-base tracking-tight ${
              isIncome
                ? "text-ivy-green"
                : isExpense
                ? "text-ivy-red"
                : "text-ivy-blue"
            }`}
          >
            {hideBalance ? (
              "••••••"
            ) : (
              <>
                {isIncome ? "+" : isExpense ? "-" : ""}
                {formatMoney(transaction.amount, transaction.account?.currency || currency)}
              </>
            )}
          </p>
        </div>

        {/* Hover action buttons */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(transaction)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-purple hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Edit"
            >
              <Edit2 size={15} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(transaction.id)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-red hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
