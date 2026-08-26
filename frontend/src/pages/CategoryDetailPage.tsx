import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { Category, Transaction, TransactionType, Account, Tag } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { IvyModal } from "@/components/ui/IvyModal";
import { IvyConfirmModal } from "@/components/ui/IvyConfirmModal";
import { TransactionItem } from "@/components/transaction/TransactionItem";
import { TransactionModal } from "@/components/transaction/TransactionModal";
import { COLOR_OPTIONS, ICON_OPTIONS } from "@/lib/constants";
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
  FolderTree,
  Tags as TagsIcon,
  Layers,
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

export const CategoryDetailPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  const categoryId = params?.id;
  const [, setLocation] = useLocation();
  const { currency, hideBalance, formatRelative } = useTheme();

  const [category, setCategory] = useState<Category | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Time Period state
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [periodType, setPeriodType] = useState<PeriodFilterType>("THIS_MONTH");

  // Search, Type & Subcategory filter
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedSubcatId, setSelectedSubcatId] = useState<string>("ALL");

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Category | null>(null);

  // Forms
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#12B880");
  const [catIcon, setCatIcon] = useState("tag");
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  const [subName, setSubName] = useState("");
  const [subSaving, setSubSaving] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);

  // Confirm delete modals
  const [confirmDeleteCatOpen, setConfirmDeleteCatOpen] = useState(false);
  const [confirmDeleteSubId, setConfirmDeleteSubId] = useState<string | null>(null);
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(null);

  // Fetch Category, Subcategories & Transactions
  const fetchData = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const [catRes, allCatsRes, accRes, tagRes, txRes] = await Promise.all([
        fetch(`/api/categories/${categoryId}`),
        fetch(`/api/categories`),
        fetch(`/api/accounts`),
        fetch(`/api/tags`),
        fetch(`/api/transactions?categoryId=${categoryId}`),
      ]);

      if (catRes.ok) {
        setCategory(await catRes.json());
      } else if (allCatsRes.ok) {
        const list: Category[] = await allCatsRes.json();
        const found = list.find((c) => c.id === categoryId);
        if (found) setCategory(found);
      }

      if (allCatsRes.ok) setAllCategories(await allCatsRes.json());
      if (accRes.ok) setAccounts(await accRes.json());
      if (tagRes.ok) setTags(await tagRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
    } catch (e) {
      console.error("Failed to fetch category details:", e);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

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

  // Filter transactions by Period, Type, Subcategory, Search
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

      // Subcategory Filter
      if (selectedSubcatId !== "ALL" && tx.subcategoryId !== selectedSubcatId) {
        return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = tx.title?.toLowerCase().includes(q);
        const descMatch = tx.description?.toLowerCase().includes(q);
        const subMatch = tx.subcategory?.name.toLowerCase().includes(q);
        const accMatch = tx.account?.name.toLowerCase().includes(q);
        const amountMatch = tx.amount.toString().includes(q);
        if (!titleMatch && !descMatch && !subMatch && !accMatch && !amountMatch) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, periodType, currentMonthDate, selectedType, selectedSubcatId, search]);

  // Calculate Period Statistics
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
  const handleOpenEditCategory = () => {
    if (!category) return;
    setCatName(category.name);
    setCatColor(category.color || "#12B880");
    setCatIcon(category.icon || "tag");
    setCatError(null);
    setIsCatModalOpen(true);
  };

  const handleSubmitEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !catName.trim()) return;

    setCatSaving(true);
    setCatError(null);
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName.trim(),
          color: catColor,
          icon: catIcon,
        }),
      });

      if (!res.ok) throw new Error("Failed to update category");

      setIsCatModalOpen(false);
      fetchData();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (err: any) {
      setCatError(err.message || "Failed to update category");
    } finally {
      setCatSaving(false);
    }
  };

  const handleOpenCreateSub = () => {
    setEditingSub(null);
    setSubName("");
    setSubError(null);
    setIsSubModalOpen(true);
  };

  const handleOpenEditSub = (sub: Category) => {
    setEditingSub(sub);
    setSubName(sub.name);
    setSubError(null);
    setIsSubModalOpen(true);
  };

  const handleSubmitSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !subName.trim()) return;

    setSubSaving(true);
    setSubError(null);
    try {
      const url = editingSub ? `/api/categories/${editingSub.id}` : `/api/categories`;
      const method = editingSub ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subName.trim(),
          parentId: category.id,
          // Color & icon automatically inherit from parent category
          color: category.color,
          icon: category.icon,
        }),
      });

      if (!res.ok) throw new Error("Failed to save subcategory");

      setIsSubModalOpen(false);
      fetchData();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (err: any) {
      setSubError(err.message || "Failed to save subcategory");
    } finally {
      setSubSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!category) return;
    try {
      await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
      setLocation("/categories");
    } catch (e) {
      console.error("Failed to delete category:", e);
    }
  };

  const handleDeleteSub = async (subId: string) => {
    try {
      await fetch(`/api/categories/${subId}`, { method: "DELETE" });
      fetchData();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (e) {
      console.error("Failed to delete subcategory:", e);
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

  if (loading && !category) {
    return (
      <div className="py-20 text-center text-sm font-semibold text-[var(--text-muted)] animate-pulse">
        Loading category details...
      </div>
    );
  }

  if (!category) {
    return (
      <IvyCard className="p-12 text-center space-y-4">
        <p className="text-lg font-bold text-[var(--text-primary)]">Category Not Found</p>
        <p className="text-sm text-[var(--text-muted)]">
          The requested category could not be found or has been deleted.
        </p>
        <IvyButton onClick={() => setLocation("/categories")} variant="primary">
          <ArrowLeft size={16} />
          <span>Back to Categories</span>
        </IvyButton>
      </IvyCard>
    );
  }

  const subcategories = category.subcategories || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Navigation & Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setLocation("/categories")}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Categories</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenEditCategory}
            className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-ivy-purple transition-all shadow-sm cursor-pointer"
            title="Edit Category"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setConfirmDeleteCatOpen(true)}
            className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-ivy-red transition-all shadow-sm cursor-pointer"
            title="Delete Category"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Category Hero Banner */}
      <div
        className="rounded-[28px] p-6 sm:p-8 text-white relative overflow-hidden shadow-xl"
        style={{
          backgroundColor: category.color || "#12B880",
          backgroundImage: `radial-gradient(circle at top right, rgba(255,255,255,0.2) 0%, transparent 70%), linear-gradient(135deg, ${category.color || "#12B880"} 0%, #1a1a24 100%)`,
        }}
      >
        <div className="relative z-10 space-y-6">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                <IvyIcon name={category.icon || "tag"} size={28} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm">
                  {category.name}
                </h1>
                <div className="flex items-center gap-2 text-xs text-white/80 mt-1">
                  <span>
                    {subcategories.length}{" "}
                    {subcategories.length === 1 ? "sub-category" : "sub-categories"}
                  </span>
                  <span>•</span>
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

          {/* Period Total Spent in Category */}
          <div className="pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">
              Total Spent in Selected Period
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

      {/* Sub-Categories Section */}
      <IvyCard className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTree size={16} className="text-ivy-purple" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Registered Sub-Categories ({subcategories.length})
            </span>
          </div>
          <IvyButton onClick={handleOpenCreateSub} size="sm" variant="secondary">
            <Plus size={14} className="stroke-[2.5]" />
            <span>Add Sub-Category</span>
          </IvyButton>
        </div>

        {subcategories.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic py-2">
            No sub-categories registered yet. Click "Add Sub-Category" to create one.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {subcategories.map((sub) => {
              const isSelected = selectedSubcatId === sub.id;
              const subCount = transactions.filter((t) => t.subcategoryId === sub.id).length;

              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubcatId(isSelected ? "ALL" : sub.id)}
                  className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-ivy-purple text-white border-ivy-purple shadow-sm"
                      : "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-ivy-purple/40"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: sub.color || category.color }}
                  />
                  <span>{sub.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-white/20 text-white" : "bg-black/5 dark:bg-white/5 text-[var(--text-muted)]"
                    }`}
                  >
                    {subCount}
                  </span>

                  {/* Sub actions */}
                  <div className="flex items-center gap-0.5 ml-1 opacity-60 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditSub(sub);
                      }}
                      className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-ivy-purple"
                      title="Edit Sub-Category"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteSubId(sub.id);
                      }}
                      className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-ivy-red"
                      title="Delete Sub-Category"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </IvyCard>

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

          {/* Month Switcher (when in Monthly mode) */}
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
                Total Expenses
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
              Category expenses for the selected period
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
                Total Incomes
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
              Category earnings / refunds for the selected period
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
              placeholder="Search category transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-ivy-purple"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            >
              <option value="ALL">All Types</option>
              <option value="EXPENSE">Expense Only</option>
              <option value="INCOME">Income Only</option>
            </select>

            {subcategories.length > 0 && (
              <select
                value={selectedSubcatId}
                onChange={(e) => setSelectedSubcatId(e.target.value)}
                className="bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple max-w-[160px]"
              >
                <option value="ALL">All Sub-Categories</option>
                {subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </IvyCard>

      {/* Transactions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Category Activity ({filteredTransactions.length})
          </span>
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Swipe left to delete
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <IvyCard className="p-12 text-center space-y-3">
            <p className="text-base font-bold text-[var(--text-primary)]">No Transactions Found</p>
            <p className="text-xs text-[var(--text-muted)]">
              No transactions recorded for this category in the selected filter.
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

      {/* Modal: Edit Category */}
      <IvyModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Edit Category"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitEditCategory} className="space-y-4">
          {catError && (
            <div className="p-3 bg-ivy-red/10 border border-ivy-red/30 text-ivy-red rounded-xl text-xs font-semibold">
              {catError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Category Name
            </label>
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              required
              autoFocus
            />
          </div>

          {/* Color selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
              Color
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCatColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer shadow-sm ${
                    catColor === c.value
                      ? "scale-125 ring-2 ring-offset-2 ring-ivy-purple"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Icon selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
              Icon
            </label>
            <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1">
              {ICON_OPTIONS.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setCatIcon(iconName)}
                  className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    catIcon === iconName
                      ? "border-ivy-purple bg-ivy-purple/10 text-ivy-purple"
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-color)]"
                  }`}
                >
                  <IvyIcon name={iconName} size={18} />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <IvyButton type="submit" disabled={catSaving} className="w-full py-3">
              {catSaving ? "Saving..." : "Save Changes"}
            </IvyButton>
          </div>
        </form>
      </IvyModal>

      {/* Modal: Create/Edit Sub-Category (Name Only editable, Color & Icon inherited) */}
      <IvyModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        title={editingSub ? "Edit Sub-Category" : "New Sub-Category"}
        maxWidth="sm"
      >
        <form onSubmit={handleSubmitSub} className="space-y-4">
          {subError && (
            <div className="p-3 bg-ivy-red/10 border border-ivy-red/30 text-ivy-red rounded-xl text-xs font-semibold">
              {subError}
            </div>
          )}

          {/* Parent Category Banner (indicating inherited color & icon) */}
          <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
              style={{ backgroundColor: category.color }}
            >
              <IvyIcon name={category.icon || "tag"} size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Parent Category: {category.name}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Sub-category inherits parent color & icon automatically.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Sub-Category Name
            </label>
            <input
              type="text"
              placeholder="e.g. Coffee, Fast Food, Snacks"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              required
              autoFocus
            />
          </div>

          <div className="pt-2">
            <IvyButton type="submit" disabled={subSaving} className="w-full py-3">
              {subSaving ? "Saving..." : editingSub ? "Update Sub-Category" : "Create Sub-Category"}
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
            categoryId: category.id,
            dateTime: new Date().toISOString(),
          } as any
        }
        accounts={accounts}
        categories={allCategories}
      />

      {/* Themed Confirm Modal: Delete Category */}
      <IvyConfirmModal
        isOpen={confirmDeleteCatOpen}
        onClose={() => setConfirmDeleteCatOpen(false)}
        onConfirm={handleDeleteCategory}
        title="Delete Category?"
        message={`Are you sure you want to delete "${category.name}" and all its sub-categories? Existing transactions will remain.`}
        confirmText="Delete Category"
      />

      {/* Themed Confirm Modal: Delete Sub-Category */}
      <IvyConfirmModal
        isOpen={!!confirmDeleteSubId}
        onClose={() => setConfirmDeleteSubId(null)}
        onConfirm={() => {
          if (confirmDeleteSubId) return handleDeleteSub(confirmDeleteSubId);
        }}
        title="Delete Sub-Category?"
        message="Are you sure you want to delete this sub-category? Transactions will remain in the parent category."
        confirmText="Delete Sub-Category"
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
