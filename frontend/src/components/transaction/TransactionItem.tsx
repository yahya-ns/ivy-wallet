import React from "react";
import { Transaction } from "@/lib/types";
import { formatMoney, formatTimeOnly } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { ArrowLeftRight, Trash2, Edit2 } from "lucide-react";

interface TransactionItemProps {
  transaction: Transaction;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onEdit,
  onDelete,
}) => {
  const { currency, hideBalance, formatTime } = useTheme();
  const isExpense = transaction.type === "EXPENSE";
  const isIncome = transaction.type === "INCOME";
  const isTransfer = transaction.type === "TRANSFER";

  const getIconName = () => {
    if (isTransfer) return "arrow-left-right";
    return transaction.category?.icon || (isIncome ? "wallet" : "shopping-bag");
  };

  const getBgColor = () => {
    if (isTransfer) return "#3193F5";
    return transaction.category?.color || (isIncome ? "#12B880" : "#5C3DF5");
  };

  const getAmountColor = () => {
    if (isIncome) return "text-ivy-green";
    if (isExpense) return "text-ivy-red";
    return "text-ivy-blue";
  };

  const getAmountPrefix = () => {
    if (isIncome) return "+";
    if (isExpense) return "-";
    return "";
  };

  const getTitle = () => {
    if (transaction.title) return transaction.title;
    if (isTransfer) {
      return `Transfer: ${transaction.account?.name || "Account"} → ${
        transaction.toAccount?.name || "Account"
      }`;
    }
    return transaction.category?.name || "Uncategorized";
  };

  return (
    <div className="group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-color)] transition-all duration-200">
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Icon Avatar */}
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
          style={{ backgroundColor: getBgColor() }}
        >
          {isTransfer ? (
            <ArrowLeftRight size={18} />
          ) : (
            <IvyIcon name={getIconName()} size={18} />
          )}
        </div>

        {/* Title & Metadata */}
        <div className="min-w-0">
          <p className="font-bold text-sm text-[var(--text-primary)] truncate">
            {getTitle()}
          </p>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
            <span className="truncate">{transaction.account?.name || "Account"}</span>
            <span>•</span>
            <span>{formatTime(transaction.dateTime)}</span>
          </div>
        </div>
      </div>

      {/* Amount & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-sm sm:text-base font-extrabold ${getAmountColor()}`}>
          {hideBalance
            ? "••••••"
            : `${getAmountPrefix()}${formatMoney(
                transaction.amount,
                transaction.account?.currency || currency
              )}`}
        </span>

        {/* Action buttons on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={() => onEdit(transaction)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-purple hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Edit Transaction"
            >
              <Edit2 size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(transaction.id)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-red hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Delete Transaction"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
