import React, { useState, useEffect, useCallback } from "react";
import { formatMoney } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyCard } from "@/components/ui/IvyCard";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, PiggyBank, Percent } from "lucide-react";

export const ReportsPage: React.FC = () => {
  const { currency, hideBalance } = useTheme();

  const [months, setMonths] = useState<number>(6);
  const [data, setData] = useState<{
    totalMonthIncome: number;
    totalMonthExpense: number;
    netSavings: number;
    savingsRate: number;
    categoryBreakdown: any[];
    monthlyTrends: any[];
  }>({
    totalMonthIncome: 0,
    totalMonthExpense: 0,
    netSavings: 0,
    savingsRate: 0,
    categoryBreakdown: [],
    monthlyTrends: [],
  });

  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?months=${months}`);
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error("Failed to fetch reports:", e);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Financial Analytics & Reports
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Analyze your income vs expense trends and category breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[var(--bg-surface-elevated)] p-1 rounded-2xl border border-[var(--border-subtle)]">
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                months === m
                  ? "bg-ivy-purple text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {m} Months
            </button>
          ))}
        </div>
      </div>

      {/* 4 Metric Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Income */}
        <IvyCard className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Income This Month</span>
            <TrendingUp size={16} className="text-ivy-green" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-ivy-green">
            {hideBalance ? "••••••" : `+${formatMoney(data.totalMonthIncome, currency)}`}
          </p>
        </IvyCard>

        {/* Total Expense */}
        <IvyCard className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Spent This Month</span>
            <TrendingDown size={16} className="text-ivy-red" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-ivy-red">
            {hideBalance ? "••••••" : `-${formatMoney(data.totalMonthExpense, currency)}`}
          </p>
        </IvyCard>

        {/* Net Savings */}
        <IvyCard className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Net Savings</span>
            <PiggyBank size={16} className="text-ivy-blue" />
          </div>
          <p
            className={`text-xl sm:text-2xl font-black ${
              data.netSavings >= 0 ? "text-ivy-blue" : "text-ivy-red"
            }`}
          >
            {hideBalance ? "••••••" : formatMoney(data.netSavings, currency)}
          </p>
        </IvyCard>

        {/* Savings Rate */}
        <IvyCard className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Savings Rate</span>
            <Percent size={16} className="text-ivy-yellow" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-ivy-yellow">
            {data.savingsRate}%
          </p>
        </IvyCard>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cashflow Trends Bar Chart */}
        <div className="lg:col-span-7 space-y-6">
          <IvyCard className="p-5 sm:p-6 space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Cashflow History ({months} Months)
            </h3>

            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    formatter={(val: any) => formatMoney(Number(val), currency)}
                    contentStyle={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-color)",
                      borderRadius: "16px",
                      color: "var(--text-primary)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#12B880" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#F53D3D" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </IvyCard>
        </div>

        {/* Category Breakdown Donut */}
        <div className="lg:col-span-5 space-y-6">
          <CategoryPieChart
            categoryStats={data.categoryBreakdown}
            totalExpense={data.totalMonthExpense}
          />
        </div>
      </div>
    </div>
  );
};
