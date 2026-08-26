import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Account } from "@/lib/types";
import { IvyIcon } from "./IvyIcon";
import { formatMoney } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ChevronDown, Check, Wallet } from "lucide-react";

interface AccountSelectProps {
  value: string;
  onChange: (accountId: string) => void;
  accounts: Account[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const AccountSelect: React.FC<AccountSelectProps> = ({
  value,
  onChange,
  accounts,
  label,
  placeholder = "Select Account",
  disabled = false,
  className = "",
}) => {
  const { hideBalance } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [popoverCoords, setPopoverCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    placement: "top" | "bottom";
  } | null>(null);

  const selectedAccount = accounts.find((a) => a.id === value);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(Math.max(rect.width, 240), window.innerWidth - 32);
    const popoverHeight = 260; // Estimated max height for dropdown

    // Horizontal alignment
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - 16 - popoverWidth;
    }
    if (left < 16) left = 16;

    // Check vertical space
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
      setPopoverCoords({
        bottom: window.innerHeight - rect.top + 6,
        left,
        width: popoverWidth,
        placement: "top",
      });
    } else {
      setPopoverCoords({
        top: rect.bottom + 6,
        left,
        width: popoverWidth,
        placement: "bottom",
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (accId: string) => {
    onChange(accId);
    setIsOpen(false);
  };

  const popoverContent = isOpen && popoverCoords && (
    <div
      ref={popoverRef}
      style={{
        position: "fixed",
        top: popoverCoords.top !== undefined ? `${popoverCoords.top}px` : undefined,
        bottom: popoverCoords.bottom !== undefined ? `${popoverCoords.bottom}px` : undefined,
        left: `${popoverCoords.left}px`,
        width: `${popoverCoords.width}px`,
        zIndex: 9999,
      }}
      className={`bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-1.5 space-y-1 max-h-60 overflow-y-auto backdrop-blur-xl ${
        popoverCoords.placement === "top"
          ? "animate-in fade-in slide-in-from-bottom-2 duration-150"
          : "animate-in fade-in slide-in-from-top-2 duration-150"
      }`}
    >
      {accounts.length === 0 ? (
        <div className="p-3 text-center text-xs text-[var(--text-muted)]">
          No accounts available
        </div>
      ) : (
        accounts.map((acc) => {
          const isSelected = acc.id === value;
          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => handleSelect(acc.id)}
              className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left cursor-pointer transition-all duration-150 ${
                isSelected
                  ? "bg-ivy-purple/10 border border-ivy-purple/30 text-[var(--text-primary)] font-bold"
                  : "hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border border-transparent"
              }`}
            >
              {/* Left: Icon & 2-row info (Name/Currency + Balance underneath) */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: acc.color || "#5C3DF5" }}
                >
                  <IvyIcon name={acc.icon || "wallet"} size={16} />
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold truncate">
                      {acc.name}
                    </span>
                    <span className="text-[9px] font-bold text-[var(--text-muted)] bg-[var(--bg-surface-elevated)] px-1.5 py-0.2 rounded uppercase shrink-0">
                      {acc.currency}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold truncate mt-0.5 ${
                      isSelected
                        ? "text-ivy-purple"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {hideBalance
                      ? "••••••"
                      : formatMoney(acc.balance || 0, acc.currency)}
                  </span>
                </div>
              </div>

              {/* Right: Check Icon */}
              {isSelected && (
                <div className="shrink-0 pl-1">
                  <Check size={16} className="text-ivy-purple stroke-[3]" />
                </div>
              )}
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] hover:border-ivy-purple focus:border-ivy-purple rounded-xl px-3 py-2 text-left flex items-center justify-between gap-2.5 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? "ring-2 ring-ivy-purple/20 border-ivy-purple" : ""
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedAccount ? (
            <>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: selectedAccount.color || "#5C3DF5" }}
              >
                <IvyIcon name={selectedAccount.icon || "wallet"} size={16} />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {selectedAccount.name}
                  </span>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] bg-[var(--bg-surface)] px-1.5 py-0.2 rounded uppercase shrink-0">
                    {selectedAccount.currency}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[var(--text-muted)] truncate mt-0.5">
                  {hideBalance
                    ? "••••••"
                    : formatMoney(
                        selectedAccount.balance || 0,
                        selectedAccount.currency
                      )}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-medium py-1">
              <Wallet size={16} />
              <span>{placeholder}</span>
            </div>
          )}
        </div>

        <ChevronDown
          size={16}
          className={`text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-ivy-purple" : ""
          }`}
        />
      </button>

      {/* Portal Popover outside modal container */}
      {typeof document !== "undefined" && popoverContent && createPortal(popoverContent, document.body)}
    </div>
  );
};
