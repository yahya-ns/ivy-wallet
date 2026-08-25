import React, { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { AccountCardCarousel } from "@/components/dashboard/AccountCardCarousel";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { TransactionItem } from "@/components/transaction/TransactionItem";
import { TransactionModal } from "@/components/transaction/TransactionModal";
import { AccountModal } from "@/components/account/AccountModal";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { Account, Category, Transaction, TransactionType } from "@/lib/types";
import { ArrowRight, Plus } from "lucide-react";

export const DashboardPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reportData, setReportData] = useState<{
    totalMonthIncome: number;
    totalMonthExpense: number;
    categoryBreakdown: any[];
  }>({
    totalMonthIncome: 0,
    totalMonthExpense: 0,
    categoryBreakdown: [],
  });

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [initialTxType, setInitialTxType] = useState<TransactionType>("EXPENSE");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [accRes, catRes, txRes, repRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/categories"),
        fetch("/api/transactions?limit=8"),
        fetch("/api/reports?months=1"),
      ]);

      if (accRes.ok) setAccounts(await accRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
      if (repRes.ok) {
        const rep = await repRes.json();
        setReportData({
          totalMonthIncome: rep.totalMonthIncome || 0,
          totalMonthExpense: rep.totalMonthExpense || 0,
          categoryBreakdown: rep.categoryBreakdown || [],
        });
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const handleUpdate = () => fetchData();
    window.addEventListener("ivy-data-updated", handleUpdate);
    return () => window.removeEventListener("ivy-data-updated", handleUpdate);
  }, [fetchData]);

  // Calculate total balance from all active accounts configured with includeInBalance
  const totalBalance = accounts
    .filter((a) => a.includeInBalance)
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const handleQuickAction = (type: TransactionType) => {
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
      console.error("Delete failed:", e);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Hero: Balance Card */}
      <BalanceCard
        totalBalance={totalBalance}
        totalIncomeMonth={reportData.totalMonthIncome}
        totalExpenseMonth={reportData.totalMonthExpense}
        onQuickAction={handleQuickAction}
      />

      {/* Accounts Slider */}
      <AccountCardCarousel
        accounts={accounts}
        onAddAccount={() => setIsAccountModalOpen(true)}
      />

      {/* Two Column Layout: Monthly Spending Chart & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Spending Breakdown Chart */}
        <div className="lg:col-span-6 space-y-6">
          <CategoryPieChart
            categoryStats={reportData.categoryBreakdown}
            totalExpense={reportData.totalMonthExpense}
          />
        </div>

        {/* Right Column: Recent Transactions */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Recent Transactions
            </h3>
            <Link
              href="/transactions"
              className="text-xs font-semibold text-ivy-purple hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {transactions.length === 0 ? (
            <IvyCard className="p-8 text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No Transactions Yet
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
                Record your expenses and incomes to get started.
              </p>
              <IvyButton
                size="sm"
                onClick={() => handleQuickAction("EXPENSE")}
                variant="primary"
              >
                <Plus size={15} />
                <span>Add First Transaction</span>
              </IvyButton>
            </IvyCard>
          ) : (
            <div className="space-y-2.5">
              {transactions.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  onEdit={handleEditTx}
                  onDelete={handleDeleteTx}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={fetchData}
        initialTransaction={selectedTx}
        initialType={initialTxType}
        accounts={accounts}
        categories={categories}
      />

      {/* Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
};
