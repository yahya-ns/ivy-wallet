import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { Account, Category, Transaction, TransactionType } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { TransactionModal } from "@/components/transaction/TransactionModal";
import { AccountModal } from "@/components/account/AccountModal";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
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

export const AccountDetailPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  const accountId = params?.id;
  const [, setLocation] = useLocation();
  const { currency: baseCurrency, hideBalance, formatRelative, formatTime } = useTheme();

  const [account, setAccount] = useState<Account | null>(null);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Time Period state
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [periodType, setPeriodType] = useState<PeriodFilterType>("THIS_MONTH");

  // Search & Type Filter
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [initialTxType, setInitialTxType] = useState<TransactionType>("EXPENSE");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Fetch account data & transactions
  const fetchData = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const [accRes, allAccRes, catRes, txRes] = await Promise.all([
        fetch(`/api/accounts/${accountId}`),
        fetch(`/api/accounts`),
        fetch(`/api/categories`),
        fetch(`/api/transactions?accountId=${accountId}`),
      ]);

      if (accRes.ok) {
        setAccount(await accRes.json());
      } else if (allAccRes.ok) {
        const list: Account[] = await allAccRes.json();
        const found = list.find((a) => a.id === accountId);
        if (found) setAccount(found);
      }

      if (allAccRes.ok) setAllAccounts(await allAccRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
    } catch (e) {
      console.error("Failed to fetch account details:", e);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

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

  // Filter transactions by Period, Search, and Type
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
        const amountMatch = tx.amount.toString().includes(q);
        if (!titleMatch && !descMatch && !catMatch && !amountMatch) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, periodType, currentMonthDate, selectedType, search]);

  // Calculate Period Statistics specifically for this account
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
      } else if (tx.type === "TRANSFER") {
        // If transfer destination is this account, it's incoming
        if (tx.toAccountId === accountId) {
          income += tx.toAmount || tx.amount;
          inCount++;
        } else if (tx.accountId === accountId) {
          // Outgoing transfer
          expense += tx.amount;
          expCount++;
        }
      }
    });

    return {
      periodIncome: income,
      periodExpense: expense,
      periodIncomeCount: inCount,
      periodExpenseCount: expCount,
    };
  }, [filteredTransactions, accountId]);

  // Group transactions by Relative Date
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

  // Action Handlers
  const handleAddTx = (type: TransactionType = "EXPENSE") => {
    setSelectedTx(null);
    setInitialTxType(type);
    setIsTxModalOpen(true);
  };

  const handleEditTx = (tx: Transaction) => {
    setSelectedTx(tx);
    setIsTxModalOpen(true);
  };

  const handleDeleteTx = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      fetchData();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (e) {
      console.error("Failed to delete transaction:", e);
    }
  };

  const handleDeleteAccount = async () => {
    if (!account) return;
    if (
      !confirm(
        `Are you sure you want to delete "${account.name}"? Transactions associated with this account will remain.`
      )
    )
      return;

    try {
      await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
      setLocation("/accounts");
    } catch (e) {
      console.error("Failed to delete account:", e);
    }
  };

  if (loading && !account) {
    return (
      <div className="py-20 text-center text-sm font-semibold text-[var(--text-muted)] animate-pulse">
        Loading account details...
      </div>
    );
  }

  if (!account) {
    return (
      <IvyCard className="p-12 text-center space-y-4">
        <p className="text-lg font-bold text-[var(--text-primary)]">Account Not Found</p>
        <p className="text-sm text-[var(--text-muted)]">
          The requested account could not be found or has been deleted.
        </p>
        <IvyButton onClick={() => setLocation("/accounts")} variant="primary">
          <ArrowLeft size={16} />
          <span>Back to Accounts</span>
        </IvyButton>
      </IvyCard>
    );
  }

  const accountCurrency = account.currency || baseCurrency;
  const isDifferentCurrency = accountCurrency !== baseCurrency;
  const netFlow = periodIncome - periodExpense;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setLocation("/accounts")}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Accounts</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-ivy-purple transition-all shadow-sm cursor-pointer"
            title="Edit Account"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={handleDeleteAccount}
            className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-ivy-red transition-all shadow-sm cursor-pointer"
            title="Delete Account"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Account Hero Banner */}
      <div
        className="rounded-[28px] p-6 sm:p-8 text-white relative overflow-hidden shadow-xl"
        style={{
          backgroundColor: account.color || "#5C3DF5",
          backgroundImage: `radial-gradient(circle at top right, rgba(255,255,255,0.2) 0%, transparent 70%), linear-gradient(135deg, ${account.color || "#5C3DF5"} 0%, #1a1a24 100%)`,
        }}
      >
        <div className="relative z-10 space-y-6">
          {/* Top meta row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                <IvyIcon name={account.icon || "wallet"} size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-sm">
                    {account.name}
                  </h1>
                  <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-black/25 backdrop-blur-sm">
                    {accountCurrency}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/80 mt-0.5">
                  {account.includeInBalance ? (
                    <span className="inline-flex items-center gap-1 font-medium">
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      <span>Included in Net Worth</span>
                    </span>
                  ) : (
                    <span className="text-white/60">Excluded from Net Worth</span>
                  )}
                </div>
              </div>
            </div>

            <IvyButton
              size="sm"
              onClick={() => handleAddTx("EXPENSE")}
              className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md font-bold shadow-md cursor-pointer"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Transaction</span>
            </IvyButton>
          </div>

          {/* Balance display */}
          <div className="pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">
              Current Account Balance
            </p>
            <div className="flex items-baseline gap-3 mt-1">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight drop-shadow-md">
                {hideBalance ? "••••••••" : formatMoney(account.balance || 0, accountCurrency)}
              </h2>
              {isDifferentCurrency && (
                <span className="text-sm font-semibold text-white/70">
                  (Base: {hideBalance ? "••••••" : formatMoney(account.balance || 0, baseCurrency)})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Period Selector Bar */}
      <IvyCard className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Period selector dropdown / pills */}
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

      {/* Income & Expense Stat Cards (Ivy Wallet Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Income Card */}
        <IvyCard className="p-5 flex flex-col justify-between border-ivy-green/20 bg-gradient-to-br from-ivy-green/10 via-transparent to-transparent relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-ivy-green/20 text-ivy-green flex items-center justify-center">
                <ArrowDownLeft size={16} className="stroke-[2.5]" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Period Income
              </span>
            </div>
            <span className="text-xs font-semibold text-[var(--text-muted)] bg-[var(--bg-surface-elevated)] px-2 py-0.5 rounded-full">
              {periodIncomeCount} tx
            </span>
          </div>

          <div>
            <h3 className="text-2xl font-black text-ivy-green tracking-tight">
              {hideBalance ? "••••••" : `+${formatMoney(periodIncome, accountCurrency)}`}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Inflow & incoming transfers
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
            <IvyButton
              size="sm"
              variant="outline"
              onClick={() => handleAddTx("INCOME")}
              className="w-full text-xs font-bold text-ivy-green border-ivy-green/30 hover:bg-ivy-green/10 justify-center py-2"
            >
              <Plus size={14} />
              <span>Add Income</span>
            </IvyButton>
          </div>
        </IvyCard>

        {/* Expense Card */}
        <IvyCard className="p-5 flex flex-col justify-between border-ivy-red/20 bg-gradient-to-br from-ivy-red/10 via-transparent to-transparent relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-ivy-red/20 text-ivy-red flex items-center justify-center">
                <ArrowUpRight size={16} className="stroke-[2.5]" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Period Expenses
              </span>
            </div>
            <span className="text-xs font-semibold text-[var(--text-muted)] bg-[var(--bg-surface-elevated)] px-2 py-0.5 rounded-full">
              {periodExpenseCount} tx
            </span>
          </div>

          <div>
            <h3 className="text-2xl font-black text-ivy-red tracking-tight">
              {hideBalance ? "••••••" : `-${formatMoney(periodExpense, accountCurrency)}`}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Outflow & outgoing transfers
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
            <IvyButton
              size="sm"
              variant="outline"
              onClick={() => handleAddTx("EXPENSE")}
              className="w-full text-xs font-bold text-ivy-red border-ivy-red/30 hover:bg-ivy-red/10 justify-center py-2"
            >
              <Plus size={14} />
              <span>Add Expense</span>
            </IvyButton>
          </div>
        </IvyCard>

        {/* Net Flow & Transfer Quick Action */}
        <IvyCard className="p-5 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-ivy-blue/20 text-ivy-blue flex items-center justify-center">
                <ArrowLeftRight size={16} className="stroke-[2.5]" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Net Cash Flow
              </span>
            </div>
            <div
              className={`flex items-center gap-1 text-xs font-bold ${
                netFlow >= 0 ? "text-ivy-green" : "text-ivy-red"
              }`}
            >
              {netFlow >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{netFlow >= 0 ? "Positive" : "Negative"}</span>
            </div>
          </div>

          <div>
            <h3
              className={`text-2xl font-black tracking-tight ${
                netFlow >= 0 ? "text-ivy-green" : "text-ivy-red"
              }`}
            >
              {hideBalance
                ? "••••••"
                : `${netFlow >= 0 ? "+" : ""}${formatMoney(netFlow, accountCurrency)}`}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Net movement in selected period
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
            <IvyButton
              size="sm"
              variant="outline"
              onClick={() => handleAddTx("TRANSFER")}
              className="w-full text-xs font-bold text-ivy-blue border-ivy-blue/30 hover:bg-ivy-blue/10 justify-center py-2"
            >
              <ArrowLeftRight size={14} />
              <span>Transfer Between Wallets</span>
            </IvyButton>
          </div>
        </IvyCard>
      </div>

      {/* Filter & Search Bar */}
      <IvyCard className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              placeholder={`Search transactions in ${account.name}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-ivy-purple transition-colors"
            />
          </div>

          {/* Type dropdown */}
          <div className="w-full sm:w-48">
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
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
          <span>
            Showing {filteredTransactions.length} of {transactions.length} total transactions
          </span>
          <span className="font-semibold text-ivy-purple">Account: {account.name}</span>
        </div>
      </IvyCard>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <IvyCard className="p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface-elevated)] flex items-center justify-center text-[var(--text-muted)] mx-auto shadow-inner">
            <Layers size={22} />
          </div>
          <p className="text-base font-bold text-[var(--text-primary)]">
            No Transactions Found for {account.name}
          </p>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            There are no recorded transactions in this time period matching your filters.
          </p>
          <div className="pt-2">
            <IvyButton onClick={() => handleAddTx("EXPENSE")} size="sm" variant="primary">
              <Plus size={15} />
              <span>Record Transaction</span>
            </IvyButton>
          </div>
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
                {txList.map((tx) => {
                  const isExpense = tx.type === "EXPENSE";
                  const isIncome = tx.type === "INCOME";
                  const isTransfer = tx.type === "TRANSFER";
                  const isIncomingTransfer = isTransfer && tx.toAccountId === accountId;
                  const isOutgoingTransfer = isTransfer && tx.accountId === accountId;

                  const getIcon = () => {
                    if (isTransfer) return "arrow-left-right";
                    return tx.category?.icon || (isIncome ? "wallet" : "shopping-bag");
                  };

                  const getBg = () => {
                    if (isTransfer) return "#3193F5";
                    return tx.category?.color || (isIncome ? "#12B880" : "#5C3DF5");
                  };

                  const getTitle = () => {
                    if (tx.title) return tx.title;
                    if (isTransfer) {
                      if (isIncomingTransfer) {
                        return `Transfer from ${tx.account?.name || "Account"}`;
                      }
                      return `Transfer to ${tx.toAccount?.name || "Account"}`;
                    }
                    return tx.category?.name || "Uncategorized";
                  };

                  return (
                    <div
                      key={tx.id}
                      className="group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-color)] transition-all duration-200"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: getBg() }}
                        >
                          {isTransfer ? (
                            <ArrowLeftRight size={18} />
                          ) : (
                            <IvyIcon name={getIcon()} size={18} />
                          )}
                        </div>

                        {/* Title & info */}
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-[var(--text-primary)] truncate">
                            {getTitle()}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
                            {isTransfer ? (
                              <span className="font-medium text-ivy-blue">
                                {isIncomingTransfer
                                  ? `From: ${tx.account?.name}`
                                  : `To: ${tx.toAccount?.name}`}
                              </span>
                            ) : (
                              <span className="truncate">{tx.category?.name || "General"}</span>
                            )}
                            {tx.description && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[140px]">{tx.description}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{formatTime(tx.dateTime)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Amount & action controls */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-sm sm:text-base font-extrabold ${
                            isIncome || isIncomingTransfer
                              ? "text-ivy-green"
                              : isExpense || isOutgoingTransfer
                              ? "text-ivy-red"
                              : "text-ivy-blue"
                          }`}
                        >
                          {hideBalance
                            ? "••••••"
                            : `${
                                isIncome || isIncomingTransfer
                                  ? "+"
                                  : isExpense || isOutgoingTransfer
                                  ? "-"
                                  : ""
                              }${formatMoney(
                                isIncomingTransfer && tx.toAmount ? tx.toAmount : tx.amount,
                                accountCurrency
                              )}`}
                        </span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditTx(tx)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-purple hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            title="Edit Transaction"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTx(tx.id)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-red hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            title="Delete Transaction"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={fetchData}
        initialTransaction={selectedTx}
        initialType={initialTxType}
        initialAccountId={account.id}
        accounts={allAccounts}
        categories={categories}
      />

      {/* Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSuccess={fetchData}
        initialAccount={account}
      />
    </div>
  );
};
