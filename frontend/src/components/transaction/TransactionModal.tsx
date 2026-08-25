import React, { useState, useEffect } from "react";
import { IvyModal } from "@/components/ui/IvyModal";
import { IvyButton } from "@/components/ui/IvyButton";
import { AmountInput } from "@/components/ui/AmountInput";
import { numberToAmountInput, parseAmountInput } from "@/lib/amountUtils";
import { Account, Category, Transaction, TransactionType } from "@/lib/types";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialType?: TransactionType;
  initialTransaction?: Transaction | null;
  initialAccountId?: string;
  accounts: Account[];
  categories: Category[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialType = "EXPENSE",
  initialTransaction = null,
  initialAccountId,
  accounts = [],
  categories = [],
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [dateTime, setDateTime] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmount(numberToAmountInput(initialTransaction.amount));
      setTitle(initialTransaction.title || "");
      setDescription(initialTransaction.description || "");
      setAccountId(initialTransaction.accountId);
      setToAccountId(initialTransaction.toAccountId || "");
      setCategoryId(initialTransaction.categoryId || "");
      setDateTime(new Date(initialTransaction.dateTime).toISOString().slice(0, 16));
    } else {
      setType(initialType);
      setAmount("");
      setTitle("");
      setDescription("");
      setAccountId(initialAccountId || accounts[0]?.id || "");
      setToAccountId(accounts.find(a => a.id !== (initialAccountId || accounts[0]?.id))?.id || accounts[1]?.id || accounts[0]?.id || "");
      setCategoryId(categories[0]?.id || "");
      setDateTime(new Date().toISOString().slice(0, 16));
    }
    setError(null);
  }, [initialTransaction, initialType, initialAccountId, accounts, categories, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseAmountInput(amount);
    if (!amount || parsedAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }
    if (!accountId) {
      setError("Please select an account");
      return;
    }
    if (type === "TRANSFER" && accountId === toAccountId) {
      setError("Source and destination accounts must be different for transfers");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        type,
        amount: parsedAmount,
        title: title.trim() || null,
        description: description.trim() || null,
        accountId,
        toAccountId: type === "TRANSFER" ? toAccountId : null,
        categoryId: type !== "TRANSFER" ? categoryId || null : null,
        dateTime: dateTime ? new Date(dateTime).toISOString() : new Date().toISOString(),
      };

      const url = initialTransaction ? `/api/transactions/${initialTransaction.id}` : "/api/transactions";
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
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
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
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-ivy-red/10 border border-ivy-red/30 text-ivy-red rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Transaction Type Segmented Toggle */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--bg-surface-elevated)] rounded-2xl border border-[var(--border-subtle)]">
          {(["EXPENSE", "INCOME", "TRANSFER"] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                type === t
                  ? t === "EXPENSE"
                    ? "bg-ivy-red text-white shadow-sm"
                    : t === "INCOME"
                    ? "bg-ivy-green text-white shadow-sm"
                    : "bg-ivy-blue text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
            Amount
          </label>
          <AmountInput
            value={amount}
            onChange={(formatted) => setAmount(formatted)}
            placeholder="0"
            autoFocus
            required
          />
        </div>

        {/* Account Selector (or From/To for transfer) */}
        {type === "TRANSFER" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                From Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                To Account
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Title & Description */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Title (e.g. Lunch at Cafe, Salary, Books)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-ivy-purple"
          />

          <input
            type="text"
            placeholder="Notes or Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-ivy-purple"
          />
        </div>

        {/* Date Time */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
            Date & Time
          </label>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <IvyButton
            type="submit"
            disabled={loading}
            className="w-full py-3 text-base"
            variant={type === "EXPENSE" ? "primary" : type === "INCOME" ? "success" : "secondary"}
          >
            {loading ? "Saving..." : initialTransaction ? "Update Transaction" : "Create Transaction"}
          </IvyButton>
        </div>
      </form>
    </IvyModal>
  );
};
