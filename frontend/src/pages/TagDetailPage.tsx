import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { Tag, Transaction, Account, Category } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { IvyModal } from "@/components/ui/IvyModal";
import { IvyConfirmModal } from "@/components/ui/IvyConfirmModal";
import { TransactionItem } from "@/components/transaction/TransactionItem";
import { TransactionModal } from "@/components/transaction/TransactionModal";
import { COLOR_OPTIONS } from "@/lib/constants";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Tag as TagIcon,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  isWithinInterval,
  format,
  subDays,
  startOfYear,
  endOfYear,
} from "date-fns";

type PeriodFilterType =
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "LAST_30_DAYS"
  | "THIS_YEAR"
  | "ALL_TIME";

export const TagDetailPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  const tagId = params?.id;
  const [, setLocation] = useLocation();
  const { currency, hideBalance, formatRelative } = useTheme();

  const [tag, setTag] = useState<Tag | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Time Period state
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [periodType, setPeriodType] = useState<PeriodFilterType>("THIS_MONTH");

  // Search & Type filter
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  // Tag Form
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#5C3DF5");
  const [tagSaving, setTagSaving] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  // Confirm delete modals
  const [confirmDeleteTagOpen, setConfirmDeleteTagOpen] = useState(false);
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(null);

  // Fetch Tag & Transactions
  const fetchData = useCallback(async () => {
    if (!tagId) return;
    setLoading(true);
    try {
      const [tagRes, allTagsRes, accRes, catRes, txRes] = await Promise.all([
        fetch(`/api/tags/${tagId}`),
        fetch(`/api/tags`),
        fetch(`/api/accounts`),
        fetch(`/api/categories`),
        fetch(`/api/transactions?tagId=${tagId}`),
      ]);

      if (tagRes.ok) {
        setTag(await tagRes.json());
      } else if (allTagsRes.ok) {
        const list: Tag[] = await allTagsRes.json();
        const found = list.find((t) => t.id === tagId);
        if (found) setTag(found);
      }

      if (accRes.ok) setAccounts(await accRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
    } catch (e) {
      console.error("Failed to fetch tag details:", e);
    } finally {
      setLoading(false);
    }
  }, [tagId]);

  useEffect(() => {
    fetchData();
    const handleUpdate = () => fetchData();
    window.addEventListener("ivy-data-updated", handleUpdate);
    return () => window.removeEventListener("ivy-data-updated", handleUpdate);
  }, [fetchData]);

  // Handle Month Navigation
  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => subMonths(prev, 1));
    setPeriodType("THIS_MONTH");
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => addMonths(prev, 1));
    setPeriodType("THIS_MONTH");
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = new Date(tx.dateTime);

      // Period Filter
      let matchesPeriod = true;
      if (periodType === "THIS_MONTH") {
        const start = startOfMonth(currentMonthDate);
        const end = endOfMonth(currentMonthDate);
        matchesPeriod = isWithinInterval(txDate, { start, end });
      } else if (periodType === "LAST_MONTH") {
        const start = startOfMonth(subMonths(new Date(), 1));
        const end = endOfMonth(subMonths(new Date(), 1));
        matchesPeriod = isWithinInterval(txDate, { start, end });
      } else if (periodType === "LAST_30_DAYS") {
        const start = subDays(new Date(), 30);
        const end = new Date();
        matchesPeriod = isWithinInterval(txDate, { start, end });
      } else if (periodType === "THIS_YEAR") {
        const start = startOfYear(new Date());
        const end = endOfYear(new Date());
        matchesPeriod = isWithinInterval(txDate, { start, end });
      }

      if (!matchesPeriod) return false;

      // Type Filter
      if (selectedType !== "ALL" && tx.type !== selectedType) {
        return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = tx.title?.toLowerCase().includes(q);
        const descMatch = tx.description?.toLowerCase().includes(q);
        const catMatch = tx.category?.name.toLowerCase().includes(q);
        const accMatch = tx.account?.name.toLowerCase().includes(q);
        const amountMatch = tx.amount.toString().includes(q);
        if (!titleMatch && !descMatch && !catMatch && !accMatch && !amountMatch) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, periodType, currentMonthDate, selectedType, search]);

  // Period statistics
  const { periodIncome, periodExpense, periodIncomeCount, periodExpenseCount } = useMemo(() => {
    let income = 0;
    let expense = 0;
    let inCount = 0;
    let expCount = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === "INCOME") {
        income += tx.amount;
        inCount++;
      } else if (tx.type === "EXPENSE") {
        expense += tx.amount;
        expCount++;
      }
    });

    return {
      periodIncome: income,
      periodExpense: expense,
      periodIncomeCount: inCount,
      periodExpenseCount: expCount,
    };
  }, [filteredTransactions]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach((tx) => {
      const dateLabel = formatRelative(tx.dateTime);
      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(tx);
    });
    return groups;
  }, [filteredTransactions, formatRelative]);

  // Actions
  const handleOpenEditTag = () => {
    if (!tag) return;
    setTagName(tag.name);
    setTagColor(tag.color || "#5C3DF5");
    setTagError(null);
    setIsTagModalOpen(true);
  };

  const handleSubmitEditTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag) return;
    const cleanName = tagName.trim().replace(/^#+/, "");
    if (!cleanName) return;

    setTagSaving(true);
    setTagError(null);
    try {
      const res = await fetch(`/api/tags/${tag.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          color: tagColor,
        }),
      });

      if (!res.ok) throw new Error("Failed to update tag");

      setIsTagModalOpen(false);
      fetchData();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (err: any) {
      setTagError(err.message || "Failed to update tag");
    } finally {
      setTagSaving(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!tag) return;
    try {
      await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
      setLocation("/categories");
    } catch (e) {
      console.error("Failed to delete tag:", e);
    }
  };

  const handleDeleteTx = async (txId: string) => {
    try {
      await fetch(`/api/transactions/${txId}`, { method: "DELETE" });
      fetchData();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (e) {
      console.error("Failed to delete transaction:", e);
    }
  };

  if (loading && !tag) {
    return (
      <div className="py-20 text-center text-sm font-semibold text-[var(--text-muted)] animate-pulse">
        Loading tag details...
      </div>
    );
  }

  if (!tag) {
    return (
      <IvyCard className="p-12 text-center space-y-4">
        <p className="text-lg font-bold text-[var(--text-primary)]">Tag Not Found</p>
        <p className="text-sm text-[var(--text-muted)]">
          The requested tag could not be found or has been deleted.
        </p>
        <IvyButton onClick={() => setLocation("/categories")} variant="primary">
          <ArrowLeft size={16} />
          <span>Back to Tags</span>
        </IvyButton>
      </IvyCard>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Navigation & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setLocation("/categories")}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Categories & Tags</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenEditTag}
            className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-ivy-purple transition-all shadow-sm cursor-pointer"
            title="Edit Tag"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setConfirmDeleteTagOpen(true)}
            className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-ivy-red transition-all shadow-sm cursor-pointer"
            title="Delete Tag"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Tag Hero Banner */}
      <div
        className="rounded-[28px] p-6 sm:p-8 text-white relative overflow-hidden shadow-xl"
        style={{
          backgroundColor: tag.color || "#5C3DF5",
          backgroundImage: `radial-gradient(circle at top right, rgba(255,255,255,0.2) 0%, transparent 70%), linear-gradient(135deg, ${tag.color || "#5C3DF5"} 0%, #1a1a24 100%)`,
        }}
      >
        <div className="relative z-10 space-y-6">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner font-black text-2xl">
                #
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm">
                  #{tag.name}
                </h1>
                <div className="flex items-center gap-2 text-xs text-white/80 mt-1">
                  <span>
                    {filteredTransactions.length}{" "}
                    {filteredTransactions.length === 1 ? "transaction" : "transactions"}
                  </span>
                </div>
              </div>
            </div>

            <IvyButton
              size="sm"
              onClick={() => {
                setSelectedTx(null);
                setIsTxModalOpen(true);
              }}
              className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md font-bold shadow-md cursor-pointer"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Transaction</span>
            </IvyButton>
          </div>

          {/* Period Total in Tag */}
          <div className="pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">
              Total Activity with #{tag.name}
            </p>
            <div className="flex items-baseline gap-3 mt-1">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight drop-shadow-md">
                {hideBalance ? "••••••••" : `-${formatMoney(periodExpense, currency)}`}
              </h2>
              {periodIncome > 0 && (
                <span className="text-sm font-semibold text-emerald-300">
                  (+{formatMoney(periodIncome, currency)} income)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Period Selector Bar */}
      <IvyCard className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Period selector pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {(
              [
                { id: "THIS_MONTH", label: "This Month" },
                { id: "LAST_MONTH", label: "Last Month" },
                { id: "LAST_30_DAYS", label: "Last 30 Days" },
                { id: "THIS_YEAR", label: "This Year" },
                { id: "ALL_TIME", label: "All Time" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodType(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  periodType === p.id
                    ? "bg-ivy-purple text-white shadow-sm"
                    : "bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Month Switcher */}
          {periodType === "THIS_MONTH" && (
            <div className="flex items-center justify-between sm:justify-end gap-2 bg-[var(--bg-surface-elevated)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)]">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)] px-2">
                <Calendar size={13} className="text-ivy-purple" />
                <span>{format(currentMonthDate, "MMMM yyyy")}</span>
              </div>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </IvyCard>

      {/* Expense / Income Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Expense Card */}
        <IvyCard className="p-5 flex flex-col justify-between border-ivy-red/20 bg-gradient-to-br from-ivy-red/10 via-transparent to-transparent relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-ivy-red/20 text-ivy-red flex items-center justify-center">
                <ArrowUpRight size={16} className="stroke-[2.5]" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Total Tag Expenses
              </span>
            </div>
            <span className="text-xs font-semibold text-[var(--text-muted)] bg-[var(--bg-surface-elevated)] px-2 py-0.5 rounded-full">
              {periodExpenseCount} tx
            </span>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-ivy-red tracking-tight">
              {hideBalance ? "••••••" : `-${formatMoney(periodExpense, currency)}`}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Expenses with #{tag.name} in selected period
            </p>
          </div>
        </IvyCard>

        {/* Income Card */}
        <IvyCard className="p-5 flex flex-col justify-between border-ivy-green/20 bg-gradient-to-br from-ivy-green/10 via-transparent to-transparent relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-ivy-green/20 text-ivy-green flex items-center justify-center">
                <ArrowDownLeft size={16} className="stroke-[2.5]" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Total Tag Incomes
              </span>
            </div>
            <span className="text-xs font-semibold text-[var(--text-muted)] bg-[var(--bg-surface-elevated)] px-2 py-0.5 rounded-full">
              {periodIncomeCount} tx
            </span>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-ivy-green tracking-tight">
              {hideBalance ? "••••••" : `+${formatMoney(periodIncome, currency)}`}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Income / refunds tagged with #{tag.name}
            </p>
          </div>
        </IvyCard>
      </div>

      {/* Filter Toolbar */}
      <IvyCard className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              placeholder="Search tagged transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-ivy-purple"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
          >
            <option value="ALL">All Types</option>
            <option value="EXPENSE">Expense Only</option>
            <option value="INCOME">Income Only</option>
          </select>
        </div>
      </IvyCard>

      {/* Transactions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Tagged Activity ({filteredTransactions.length})
          </span>
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Swipe left to delete
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <IvyCard className="p-12 text-center space-y-3">
            <p className="text-base font-bold text-[var(--text-primary)]">No Transactions Found</p>
            <p className="text-xs text-[var(--text-muted)]">
              No transactions with tag #{tag.name} in the selected period.
            </p>
            <IvyButton
              onClick={() => {
                setSelectedTx(null);
                setIsTxModalOpen(true);
              }}
              size="sm"
            >
              <Plus size={16} />
              <span>Create Transaction</span>
            </IvyButton>
          </IvyCard>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedTransactions).map(([dateLabel, txList]) => (
              <div key={dateLabel} className="space-y-2">
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
                      onEdit={(t) => {
                        setSelectedTx(t);
                        setIsTxModalOpen(true);
                      }}
                      onDelete={(id) => setConfirmDeleteTxId(id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Edit Tag */}
      <IvyModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        title="Edit Tag"
        maxWidth="sm"
      >
        <form onSubmit={handleSubmitEditTag} className="space-y-4">
          {tagError && (
            <div className="p-3 bg-ivy-red/10 border border-ivy-red/30 text-ivy-red rounded-xl text-xs font-semibold">
              {tagError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Tag Name
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold text-sm">
                #
              </span>
              <input
                type="text"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl pl-8 pr-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Color selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
              Tag Color
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setTagColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer shadow-sm ${
                    tagColor === c.value
                      ? "scale-125 ring-2 ring-offset-2 ring-ivy-purple"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="pt-2">
            <IvyButton type="submit" disabled={tagSaving} className="w-full py-3">
              {tagSaving ? "Saving..." : "Update Tag"}
            </IvyButton>
          </div>
        </form>
      </IvyModal>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={fetchData}
        initialTransaction={
          selectedTx || {
            type: "EXPENSE",
            amount: 0,
            dateTime: new Date().toISOString(),
          } as any
        }
        accounts={accounts}
        categories={categories}
      />

      {/* Themed Confirm Modal: Delete Tag */}
      <IvyConfirmModal
        isOpen={confirmDeleteTagOpen}
        onClose={() => setConfirmDeleteTagOpen(false)}
        onConfirm={handleDeleteTag}
        title="Delete Tag?"
        message={`Are you sure you want to delete #${tag.name}? Transactions will remain without this tag.`}
        confirmText="Delete Tag"
      />

      {/* Themed Confirm Modal: Delete Transaction */}
      <IvyConfirmModal
        isOpen={!!confirmDeleteTxId}
        onClose={() => setConfirmDeleteTxId(null)}
        onConfirm={() => {
          if (confirmDeleteTxId) return handleDeleteTx(confirmDeleteTxId);
        }}
        title="Delete Transaction?"
        message="Are you sure you want to delete this transaction? Your account balances will be updated accordingly."
        confirmText="Delete Transaction"
      />
    </div>
  );
};
