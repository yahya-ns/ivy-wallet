import React, { useState, useRef } from "react";
import { Transaction } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { ArrowLeftRight, Trash2 } from "lucide-react";

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

  // Swipe state
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchInitialOffsetX = useRef(0);
  const hasMovedSignificant = useRef(false);

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

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchInitialOffsetX.current = offsetX;
    hasMovedSignificant.current = false;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    // Only handle horizontal swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
      hasMovedSignificant.current = true;
      const newOffset = Math.min(0, Math.max(-88, touchInitialOffsetX.current + deltaX));
      setOffsetX(newOffset);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (offsetX < -40) {
      setOffsetX(-80); // Snap open to reveal delete button
    } else {
      setOffsetX(0); // Snap closed
    }
  };

  // Mouse Drag / Swipe Handlers (desktop swipe support)
  const isMouseDown = useRef(false);
  const mouseStartX = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click
    if (e.button !== 0) return;
    isMouseDown.current = true;
    mouseStartX.current = e.clientX;
    touchInitialOffsetX.current = offsetX;
    hasMovedSignificant.current = false;
    setIsSwiping(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current) return;
    const deltaX = e.clientX - mouseStartX.current;
    if (Math.abs(deltaX) > 6) {
      hasMovedSignificant.current = true;
      const newOffset = Math.min(0, Math.max(-88, touchInitialOffsetX.current + deltaX));
      setOffsetX(newOffset);
    }
  };

  const handleMouseUp = () => {
    if (!isMouseDown.current) return;
    isMouseDown.current = false;
    setIsSwiping(false);
    if (offsetX < -40) {
      setOffsetX(-80);
    } else {
      setOffsetX(0);
    }
  };

  // Click card handler (open edit modal if not swiping/revealed)
  const handleClick = (e: React.MouseEvent) => {
    if (hasMovedSignificant.current) {
      e.stopPropagation();
      return;
    }
    if (offsetX !== 0) {
      setOffsetX(0);
      e.stopPropagation();
      return;
    }
    if (onEdit) {
      onEdit(transaction);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(transaction.id);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl select-none group bg-ivy-red"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background Revealed Delete Action */}
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-ivy-red text-white z-0">
        <button
          type="button"
          onClick={handleDeleteClick}
          className="w-full h-full flex flex-col items-center justify-center gap-1 text-white hover:bg-black/10 active:scale-95 transition-all cursor-pointer"
          title="Delete Transaction"
        >
          <Trash2 size={20} className="stroke-[2.5]" />
          <span className="text-[10px] font-extrabold tracking-wider uppercase">Delete</span>
        </button>
      </div>

      {/* Foreground Sliding Transaction Item */}
      <div
        onClick={handleClick}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="relative z-10 flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-color)] transition-colors cursor-pointer"
      >
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
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm text-[var(--text-primary)] truncate">
                {getTitle()}
              </p>

              {/* Sub-category Pill Badge if exists */}
              {transaction.subcategory && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  › {transaction.subcategory.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] flex-wrap">
              <span className="truncate">{transaction.account?.name || "Account"}</span>
              <span>•</span>
              <span>{formatTime(transaction.dateTime)}</span>

              {/* Tag Pills */}
              {transaction.tags && transaction.tags.length > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {transaction.tags.map((tg) => (
                      <span
                        key={tg.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{
                          backgroundColor: `${tg.color}18`,
                          color: tg.color,
                          border: `1px solid ${tg.color}30`,
                        }}
                      >
                        <span
                          className="w-1 h-1 rounded-full shrink-0"
                          style={{ backgroundColor: tg.color }}
                        />
                        <span>#{tg.name}</span>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-sm sm:text-base font-extrabold ${getAmountColor()}`}>
            {hideBalance
              ? "••••••"
              : `${getAmountPrefix()}${formatMoney(
                  transaction.amount,
                  transaction.account?.currency || currency
                )}`}
          </span>
        </div>
      </div>
    </div>
  );
};
