"use client";

import React, { useState, useEffect } from "react";
import { IvyModal } from "@/components/ui/IvyModal";
import { IvyButton } from "@/components/ui/IvyButton";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { Account, Category, Transaction, TransactionType } from "@/lib/types";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ArrowLeftRight, Check, Plus, Calendar, FileText } from "lucide-react";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTransaction?: Transaction | null;
  accounts: Account[];
  categories: Category[];
}

export function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialTransaction,
  accounts,
  categories,
}: TransactionModalProps) {
  const { currency } = useTheme();

  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [dateTime, setDateTime] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmount(initialTransaction.amount.toString());
      setAccountId(initialTransaction.accountId);
      setToAccountId(initialTransaction.toAccountId || "");
      setCategoryId(initialTransaction.categoryId || "");
      setTitle(initialTransaction.title || "");
      setDescription(initialTransaction.description || "");
      setDateTime(
        initialTransaction.dateTime
          ? new Date(initialTransaction.dateTime).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16)
      );
    } else {
      setType("EXPENSE");
      setAmount("");
      setAccountId(accounts[0]?.id || "");
      setToAccountId(accounts[1]?.id || "");
      setCategoryId(categories[0]?.id || "");
      setTitle("");
      setDescription("");
      setDateTime(new Date().toISOString().slice(0, 16));
    }
    setError(null);
  }, [initialTransaction, isOpen, accounts, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!accountId) {
      setError("Please select an account");
      return;
    }
    if (type === "TRANSFER" && !toAccountId) {
      setError("Please select a destination account");
      return;
    }
    if (type === "TRANSFER" && accountId === toAccountId) {
      setError("Destination account cannot be the same as source account");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        type,
        amount: parseFloat(amount),
        accountId,
        toAccountId: type === "TRANSFER" ? toAccountId : null,
        categoryId: type !== "TRANSFER" ? categoryId || null : null,
        title: title.trim() || null,
        description: description.trim() || null,
        dateTime: new Date(dateTime).toISOString(),
      };

      const url = initialTransaction
        ? `/api/transactions/${initialTransaction.id}`
        : `/api/transactions`;
      const method = initialTransaction ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save transaction");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <IvyModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTransaction ? "Edit Transaction" : "New Transaction"}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type Switcher */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-[var(--bg-surface-elevated)] rounded-2xl border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setType("EXPENSE")}
            className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
              type === "EXPENSE"
                ? "bg-ivy-red text-white shadow-md shadow-ivy-red/25"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType("INCOME")}
            className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
              type === "INCOME"
                ? "bg-ivy-green text-white shadow-md shadow-ivy-green/25"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => setType("TRANSFER")}
            className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
              type === "TRANSFER"
                ? "bg-ivy-blue text-white shadow-md shadow-ivy-blue/25"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Transfer
          </button>
        </div>

        {/* Amount Input */}
        <div className="text-center py-2">
          <div className="inline-flex items-center justify-center gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-muted)]">
              {accounts.find((a) => a.id === accountId)?.currency || currency}
            </span>
            <input
              type="number"
              step="0.01"
              autoFocus
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-3xl sm:text-5xl font-black bg-transparent text-[var(--text-primary)] focus:outline-none max-w-[200px] sm:max-w-[260px] text-center tracking-tight"
            />
          </div>
        </div>

        {/* Error message if any */}
        {error && (
          <div className="p-3 bg-ivy-red/10 border border-ivy-red/30 text-ivy-red rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Category Picker (if not Transfer) */}
        {type !== "TRANSFER" && (
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
              Category
            </label>
            <div className="grid grid-cols-4 gap-2.5 max-h-36 overflow-y-auto p-1">
              {categories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "border-ivy-purple bg-ivy-purple/10 scale-102"
                        : "border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] hover:border-[var(--border-color)]"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white mb-1 shadow-sm"
                      style={{ backgroundColor: cat.color }}
                    >
                      <IvyIcon name={cat.icon} size={16} />
                    </div>
                    <span className="text-[11px] font-medium text-[var(--text-primary)] truncate max-w-full">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Account Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              {type === "TRANSFER" ? "From Account" : "Account"}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
          </div>

          {type === "TRANSFER" && (
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                To Account
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            />
          </div>
        </div>

        {/* Title and Notes */}
        <div className="space-y-2.5">
          <input
            type="text"
            placeholder="Title (optional, e.g. Lunch at Cafe)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-ivy-purple"
          />
          <input
            type="text"
            placeholder="Note / Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-ivy-purple"
          />
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <IvyButton
            type="submit"
            disabled={loading}
            className="w-full py-3 text-base shadow-lg"
            variant={type === "EXPENSE" ? "danger" : type === "INCOME" ? "success" : "primary"}
          >
            {loading ? "Saving..." : initialTransaction ? "Update Transaction" : "Add Transaction"}
          </IvyButton>
        </div>
      </form>
    </IvyModal>
  );
}
