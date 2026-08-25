import React, { useState, useEffect, useCallback } from "react";
import { Budget, Category } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { IvyModal } from "@/components/ui/IvyModal";
import { Plus, Edit2, Trash2, Target, AlertTriangle } from "lucide-react";

export const BudgetsPage: React.FC = () => {
  const { currency, hideBalance } = useTheme();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("MONTHLY");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        fetch("/api/budgets"),
        fetch("/api/categories"),
      ]);
      if (bRes.ok) setBudgets(await bRes.json());
      if (cRes.ok) setCategories(await cRes.json());
    } catch (e) {
      console.error("Failed to fetch budgets:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleOpenCreate = () => {
    setSelectedBudget(null);
    setName("");
    setAmount("");
    setPeriod("MONTHLY");
    setSelectedCategories([]);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Budget) => {
    setSelectedBudget(b);
    setName(b.name);
    setAmount(b.amount.toString());
    setPeriod(b.period || "MONTHLY");

    let catList: string[] = [];
    if (b.categoryIds) {
      try {
        catList = JSON.parse(b.categoryIds);
      } catch {
        catList = b.categoryIds.split(",");
      }
    }
    setSelectedCategories(catList);
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this budget?")) return;
    try {
      await fetch(`/api/budgets/${id}`, { method: "DELETE" });
      fetchBudgets();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (e) {
      console.error("Delete budget failed:", e);
    }
  };

  const toggleCategory = (catId: string) => {
    if (selectedCategories.includes(catId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== catId));
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || parseFloat(amount) <= 0) {
      setError("Please provide a name and positive budget amount");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        amount: parseFloat(amount),
        period,
        categoryIds: selectedCategories,
      };

      const url = selectedBudget ? `/api/budgets/${selectedBudget.id}` : `/api/budgets`;
      const method = selectedBudget ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save budget");
      }

      setIsModalOpen(false);
      fetchBudgets();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Budgets & Goals
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Keep your spending under control with real-time monthly budget targets.
          </p>
        </div>

        <IvyButton onClick={handleOpenCreate} variant="primary" size="md">
          <Plus size={18} className="stroke-[2.5]" />
          <span>New Budget</span>
        </IvyButton>
      </div>

      {/* Budgets Grid */}
      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-[var(--text-muted)]">
          Loading budgets...
        </div>
      ) : budgets.length === 0 ? (
        <IvyCard className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-ivy-purple/10 text-ivy-purple flex items-center justify-center mx-auto mb-3">
            <Target size={24} />
          </div>
          <p className="text-base font-bold text-[var(--text-primary)]">No Budgets Created</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Create monthly spending limits for categories like Dining, Shopping, or Groceries.
          </p>
          <IvyButton onClick={handleOpenCreate} size="sm">
            <Plus size={16} />
            <span>Create First Budget</span>
          </IvyButton>
        </IvyCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {budgets.map((b) => {
            const spent = b.spent || 0;
            const percentage = b.percentage || 0;
            const remaining = b.remaining || 0;
            const isOver = spent > b.amount;

            return (
              <IvyCard key={b.id} className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-[var(--text-primary)] truncate">
                        {b.name}
                      </h3>
                      {isOver && (
                        <span className="flex items-center gap-1 text-[10px] font-extrabold bg-ivy-red/10 text-ivy-red px-2 py-0.5 rounded-full">
                          <AlertTriangle size={12} />
                          <span>Overbudget</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                      Period: {b.period}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(b)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-purple hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Edit Budget"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-red hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Delete Budget"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 bg-[var(--bg-surface-elevated)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isOver
                          ? "bg-ivy-red"
                          : percentage > 80
                          ? "bg-ivy-orange"
                          : "bg-ivy-purple"
                      }`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[var(--text-muted)]">{percentage}% spent</span>
                    <span className={isOver ? "text-ivy-red font-bold" : "text-[var(--text-muted)]"}>
                      {hideBalance
                        ? "••••"
                        : isOver
                        ? `Over by ${formatMoney(spent - b.amount, currency)}`
                        : `${formatMoney(remaining, currency)} left`}
                    </span>
                  </div>
                </div>

                {/* Numbers */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Spent</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {hideBalance ? "••••" : formatMoney(spent, currency)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Target</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {hideBalance ? "••••" : formatMoney(b.amount, currency)}
                    </span>
                  </div>
                </div>
              </IvyCard>
            );
          })}
        </div>
      )}

      {/* Budget Modal */}
      <IvyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedBudget ? "Edit Budget" : "New Budget Target"}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-ivy-red/10 border border-ivy-red/30 text-ivy-red rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Budget Name
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly Dining Out, Grocery Target"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Target Amount
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="WEEKLY">Weekly</option>
                <option value="ONE_TIME">One Time</option>
              </select>
            </div>
          </div>

          {/* Included Categories Selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
              Categories to Include (Leave empty for All)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer truncate ${
                      isSelected
                        ? "border-ivy-purple bg-ivy-purple/10 text-ivy-purple"
                        : "border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-color)]"
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <IvyButton type="submit" disabled={saving} className="w-full py-3">
              {saving ? "Saving..." : selectedBudget ? "Update Budget" : "Create Budget"}
            </IvyButton>
          </div>
        </form>
      </IvyModal>
    </div>
  );
};
