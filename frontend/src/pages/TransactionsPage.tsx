import React, { useState, useEffect, useCallback } from "react";
import { TransactionItem } from "@/components/transaction/TransactionItem";
import { TransactionModal } from "@/components/transaction/TransactionModal";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { Account, Category, Transaction } from "@/lib/types";
import { formatRelativeDate, formatMoney } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Search, Plus } from "lucide-react";

export const TransactionsPage: React.FC = () => {
  const { currency, hideBalance, formatRelative } = useTheme();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize filters from URL if present
  const queryParams = new URLSearchParams(window.location.search);
  const initialAccountId = queryParams.get("accountId") || "ALL";
  const initialCategoryId = queryParams.get("categoryId") || "ALL";
  const initialType = queryParams.get("type") || "ALL";

  // Filters
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategoryId);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedType !== "ALL") params.set("type", selectedType);
      if (selectedAccountId !== "ALL") params.set("accountId", selectedAccountId);
      if (selectedCategoryId !== "ALL") params.set("categoryId", selectedCategoryId);

      const [txRes, accRes, catRes] = await Promise.all([
        fetch(`/api/transactions?${params.toString()}`),
        fetch(`/api/accounts`),
        fetch(`/api/categories`),
      ]);

      if (txRes.ok) setTransactions(await txRes.json());
      if (accRes.ok) setAccounts(await accRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (e) {
      console.error("Failed to fetch transactions:", e);
    } finally {
      setLoading(false);
    }
  }, [search, selectedType, selectedAccountId, selectedCategoryId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      fetchTransactions();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const handleEdit = (tx: Transaction) => {
    setSelectedTx(tx);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedTx(null);
    setIsModalOpen(true);
  };

  // Group transactions by date
  const groupedTransactions: Record<string, Transaction[]> = {};
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((tx) => {
    const dateKey = formatRelative(tx.dateTime);
    if (!groupedTransactions[dateKey]) {
      groupedTransactions[dateKey] = [];
    }
    groupedTransactions[dateKey].push(tx);

    if (tx.type === "INCOME") totalIncome += tx.amount;
    if (tx.type === "EXPENSE") totalExpense += tx.amount;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Transactions & Activity
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Track and search your complete financial flow.
          </p>
        </div>

        <IvyButton onClick={handleCreate} variant="primary" size="md">
          <Plus size={18} className="stroke-[2.5]" />
          <span>New Transaction</span>
        </IvyButton>
      </div>

      {/* Filter Toolbar */}
      <IvyCard className="p-4 sm:p-5 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            placeholder="Search by title, description or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-ivy-purple transition-colors"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            >
              <option value="ALL">All Types</option>
              <option value="EXPENSE">Expense Only</option>
              <option value="INCOME">Income Only</option>
              <option value="TRANSFER">Transfer Only</option>
            </select>
          </div>

          {/* Account Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            >
              <option value="ALL">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[var(--text-muted)]">Income: </span>
              <span className="font-bold text-ivy-green">
                {hideBalance ? "••••••" : `+${formatMoney(totalIncome, currency)}`}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Expenses: </span>
              <span className="font-bold text-ivy-red">
                {hideBalance ? "••••••" : `-${formatMoney(totalExpense, currency)}`}
              </span>
            </div>
          </div>
          <span className="text-[var(--text-muted)] font-medium">
            {transactions.length} {transactions.length === 1 ? "entry" : "entries"}
          </span>
        </div>
      </IvyCard>

      {/* Transactions List Grouped by Date */}
      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-[var(--text-muted)]">
          Loading transactions...
        </div>
      ) : transactions.length === 0 ? (
        <IvyCard className="p-12 text-center">
          <p className="text-base font-bold text-[var(--text-primary)]">No Transactions Found</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Try adjusting your search criteria or create a new transaction.
          </p>
          <IvyButton onClick={handleCreate} size="sm">
            <Plus size={16} />
            <span>Create Transaction</span>
          </IvyButton>
        </IvyCard>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTransactions).map(([dateLabel, txList]) => (
            <div key={dateLabel} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  {dateLabel}
                </span>
                <div className="h-px flex-1 bg-[var(--border-subtle)]" />
              </div>

              <div className="space-y-2">
                {txList.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTransactions}
        initialTransaction={selectedTx}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
};
