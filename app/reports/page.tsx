"use client";

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
  CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Percent, BarChart3 } from "lucide-react";

export default function ReportsPage() {
  const { currency, hideBalance } = useTheme();
  const [report, setReport] = useState<any>(null);
  const [months, setMonths] = useState<number>(6);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?months=${months}`);
      if (res.ok) setReport(await res.json());
    } catch (e) {
      console.error("Failed to fetch report:", e);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Financial Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Analyze your income vs expense trends and spending distribution.
          </p>
        </div>

        {/* Time period selector */}
        <div className="flex items-center gap-2 p-1 bg-[var(--bg-surface-elevated)] rounded-2xl border border-[var(--border-subtle)]">
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

      {loading || !report ? (
        <div className="py-16 text-center text-sm font-semibold text-[var(--text-muted)]">
          Generating financial insights...
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <IvyCard className="p-5 bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2 text-ivy-green mb-2">
                <TrendingUp size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">This Month Income</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                {hideBalance ? "••••••" : `+${formatMoney(report.totalMonthIncome, currency)}`}
              </p>
            </IvyCard>

            <IvyCard className="p-5 bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2 text-ivy-red mb-2">
                <TrendingDown size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">This Month Expense</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                {hideBalance ? "••••••" : `-${formatMoney(report.totalMonthExpense, currency)}`}
              </p>
            </IvyCard>

            <IvyCard className="p-5 bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2 text-ivy-blue mb-2">
                <DollarSign size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Net Savings</span>
              </div>
              <p
                className={`text-xl sm:text-2xl font-black tracking-tight ${
                  report.netSavings >= 0 ? "text-ivy-green" : "text-ivy-red"
                }`}
              >
                {hideBalance ? "••••••" : formatMoney(report.netSavings, currency)}
              </p>
            </IvyCard>

            <IvyCard className="p-5 bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2 text-ivy-purple mb-2">
                <Percent size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Savings Rate</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                {report.savingsRate}%
              </p>
            </IvyCard>
          </div>

          {/* Cashflow Bar Chart */}
          <IvyCard className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={20} className="text-ivy-purple" />
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Income vs Expense Trends
                </h3>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.monthlyTrends} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--border-color)" }}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--border-color)" }}
                    tickFormatter={(v) => `${v >= 1000 ? `${v / 1000}k` : v}`}
                  />
                  <Tooltip
                    formatter={(val: any) => formatMoney(Number(val), currency)}
                    contentStyle={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-color)",
                      borderRadius: "16px",
                      color: "var(--text-primary)",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#12B880" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#F53D3D" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </IvyCard>

          {/* Category Pie Chart */}
          <CategoryPieChart
            categoryStats={report.categoryBreakdown}
            totalExpense={report.totalMonthExpense}
          />
        </>
      )}
    </div>
  );
}
