import React, { useState, useEffect } from "react";
import { IvyModal } from "@/components/ui/IvyModal";
import { IvyButton } from "@/components/ui/IvyButton";
import { AmountInput } from "@/components/ui/AmountInput";
import { AccountSelect } from "@/components/ui/AccountSelect";
import { CategorySelect } from "@/components/ui/CategorySelect";
import { TagInput } from "@/components/ui/TagInput";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
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
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [dateTime, setDateTime] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Available subcategories for the currently selected main category
  const activeCategory = categories.find((c) => c.id === categoryId);
  const availableSubcategories = categories.filter((c) => c.parentId === categoryId);

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmount(numberToAmountInput(initialTransaction.amount));
      setTitle(initialTransaction.title || "");
      setDescription(initialTransaction.description || "");
      setAccountId(initialTransaction.accountId);
      setToAccountId(initialTransaction.toAccountId || "");
      setCategoryId(initialTransaction.categoryId || "");
      setSubcategoryId(initialTransaction.subcategoryId || "");
      setTagIds(
        initialTransaction.tagIds ||
          initialTransaction.tags?.map((t) => t.id) ||
          []
      );
      setDateTime(initialTransaction.dateTime || new Date().toISOString());
    } else {
      setType(initialType);
      setAmount("");
      setTitle("");
      setDescription("");
      setAccountId(initialAccountId || accounts[0]?.id || "");
      setToAccountId(
        accounts.find((a) => a.id !== (initialAccountId || accounts[0]?.id))?.id ||
          accounts[1]?.id ||
          accounts[0]?.id ||
          ""
      );
      const firstRootCat = categories.find((c) => !c.parentId);
      setCategoryId(firstRootCat?.id || categories[0]?.id || "");
      setSubcategoryId("");
      setTagIds([]);
      setDateTime(new Date().toISOString());
    }
    setError(null);
  }, [initialTransaction, initialType, initialAccountId, accounts, categories, isOpen]);

  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    setSubcategoryId(""); // reset subcategory on main category change
  };

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
        subcategoryId: type !== "TRANSFER" ? subcategoryId || null : null,
        tagIds: type !== "TRANSFER" ? tagIds : [],
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                From Account
              </label>
              <AccountSelect
                value={accountId}
                onChange={setAccountId}
                accounts={accounts}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                To Account
              </label>
              <AccountSelect
                value={toAccountId}
                onChange={setToAccountId}
                accounts={accounts}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Account
                </label>
                <AccountSelect
                  value={accountId}
                  onChange={setAccountId}
                  accounts={accounts}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Category
                </label>
                <CategorySelect
                  value={categoryId}
                  onChange={handleCategoryChange}
                  categories={categories}
                  onlyRoot={true}
                />
              </div>
            </div>

            {/* Subcategory Selector (Appears when category has subcategories) */}
            {availableSubcategories.length > 0 && (
              <div className="p-3 bg-[var(--bg-surface-elevated)]/60 rounded-2xl border border-[var(--border-subtle)] space-y-2">
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Sub-Category (Optional)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSubcategoryId("")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      !subcategoryId
                        ? "bg-ivy-purple text-white shadow-xs"
                        : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                    }`}
                  >
                    General / None
                  </button>
                  {availableSubcategories.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSubcategoryId(sub.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        subcategoryId === sub.id
                          ? "bg-ivy-purple text-white shadow-xs"
                          : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                      }`}
                    >
                      <span>{sub.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
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

        {/* Multi-Tag Input */}
        {type !== "TRANSFER" && (
          <TagInput
            selectedTagIds={tagIds}
            onChange={setTagIds}
            label="Tags"
            placeholder="Type #tag or pick from list..."
          />
        )}

        {/* Date Time */}
        <DateTimePicker
          label="Date & Time"
          value={dateTime}
          onChange={setDateTime}
          mode="datetime"
        />

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

