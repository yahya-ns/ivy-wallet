"use client";

import React from "react";
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip } from "recharts";
import { formatMoney } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { IvyCard } from "@/components/ui/IvyCard";

interface CategoryStat {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  amount: number;
  percentage: number;
}

interface CategoryPieChartProps {
  categoryStats: CategoryStat[];
  totalExpense: number;
}

export function CategoryPieChart({ categoryStats, totalExpense }: CategoryPieChartProps) {
  const { currency, hideBalance } = useTheme();

  if (!categoryStats || categoryStats.length === 0 || totalExpense === 0) {
    return (
      <IvyCard className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface-elevated)] flex items-center justify-center text-[var(--text-muted)] mb-3">
          <IvyIcon name="pie-chart" size={24} />
        </div>
        <p className="text-sm font-bold text-[var(--text-primary)]">No Expense Data</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Add expense transactions this month to see category distribution.
        </p>
      </IvyCard>
    );
  }

  const chartData = categoryStats.map((item) => ({
    name: item.name,
    value: item.amount,
    color: item.color,
  }));

  return (
    <IvyCard className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
          Monthly Expenses Breakdown
        </h3>
        <span className="text-xs font-semibold text-ivy-red bg-ivy-red/10 px-2.5 py-1 rounded-full">
          {hideBalance ? "••••••" : formatMoney(totalExpense, currency)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Donut Chart */}
        <div className="h-56 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
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
            </RePieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Total Spent
            </span>
            <span className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
              {hideBalance ? "••••••" : formatMoney(totalExpense, currency)}
            </span>
          </div>
        </div>

        {/* Category Breakdown List */}
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {categoryStats.slice(0, 5).map((cat) => (
            <div key={cat.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="font-medium text-[var(--text-primary)] text-xs sm:text-sm truncate">
                  {cat.name}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold text-[var(--text-muted)]">
                  {cat.percentage}%
                </span>
                <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">
                  {hideBalance ? "••••••" : formatMoney(cat.amount, currency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </IvyCard>
  );
}
