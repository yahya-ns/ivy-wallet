import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { formatMoney } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyIcon } from "@/components/ui/IvyIcon";

interface CategoryBreakdown {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  amount: number;
  percentage: number;
}

interface CategoryPieChartProps {
  categoryStats: CategoryBreakdown[];
  totalExpense: number;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  categoryStats = [],
  totalExpense = 0,
}) => {
  const { currency, hideBalance } = useTheme();

  if (!categoryStats || categoryStats.length === 0) {
    return (
      <IvyCard className="p-6 text-center">
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
          Monthly Expenses
        </h3>
        <p className="text-xs text-[var(--text-muted)]">
          No expenses recorded this month yet.
        </p>
      </IvyCard>
    );
  }

  return (
    <IvyCard className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
          Spending Breakdown
        </h3>
        <span className="text-xs font-bold text-ivy-red">
          {hideBalance ? "••••••" : `-${formatMoney(totalExpense, currency)}`}
        </span>
      </div>

      {/* Donut Chart */}
      <div className="h-48 sm:h-56 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryStats}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              stroke="none"
            >
              {categoryStats.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || "#5C3DF5"} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => formatMoney(Number(value), currency)}
              contentStyle={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-color)",
                borderRadius: "16px",
                color: "var(--text-primary)",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Text */}
        <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Total</span>
          <span className="text-xs sm:text-sm font-black text-[var(--text-primary)]">
            {hideBalance ? "••••" : formatMoney(totalExpense, currency)}
          </span>
        </div>
      </div>

      {/* Top 4 Categories List */}
      <div className="space-y-2.5 pt-1">
        {categoryStats.slice(0, 4).map((cat) => (
          <div key={cat.id} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: cat.color }}
              >
                <IvyIcon name={cat.icon || "tag"} size={14} />
              </div>
              <span className="font-bold text-[var(--text-primary)] truncate">
                {cat.name}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-semibold text-[var(--text-muted)]">
                {cat.percentage}%
              </span>
              <span className="font-bold text-[var(--text-primary)]">
                {hideBalance ? "••••" : formatMoney(cat.amount, currency)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </IvyCard>
  );
};
