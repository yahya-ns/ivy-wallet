"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Budget, Category } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { IvyModal } from "@/components/ui/IvyModal";
import { Plus, Edit2, Trash2, Target, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function BudgetsPage() {
  const { currency, hideBalance } = useTheme();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [period, setPeriod] = useState("MONTHLY");
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
    setSelectedCategories([]);
    setPeriod("MONTHLY");
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Budget) => {
    setSelectedBudget(b);
    setName(b.name);
    setAmount(b.amount.toString());
    try {
      setSelectedCategories(b.categoryIds ? JSON.parse(b.categoryIds) : []);
    } catch {
      setSelectedCategories(b.categoryIds ? b.categoryIds.split(",") : []);
    }
    setPeriod(b.period || "MONTHLY");
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this budget?")) return;
    try {
      await fetch(`/api/budgets/${id}`, { method: "DELETE" });
      fetchBudgets();
    } catch (e) {
      console.error("Delete budget error:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || parseFloat(amount) <= 0) {
      setError("Please provide a name and valid budget amount");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        amount: parseFloat(amount),
        categoryIds: selectedCategories.length > 0 ? selectedCategories : null,
        period,
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
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (catId: string) => {
    if (selectedCategories.includes(catId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== catId));
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Budgets
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Set spending limits for categories and track live progress.
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
          <div className="w-14 h-14 rounded-2xl bg-ivy-purple/10 text-ivy-purple flex items-center justify-center mx-auto mb-3">
            <Target size={28} />
          </div>
          <p className="text-base font-bold text-[var(--text-primary)]">No Budgets Configured</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Create monthly budget limits to keep your expenses under control.
          </p>
          <IvyButton onClick={handleOpenCreate} size="sm">
            <Plus size={16} />
            <span>Create Budget</span>
          </IvyButton>
        </IvyCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {budgets.map((b) => {
            const spent = b.spent || 0;
            const percentage = b.percentage || 0;
            const isExceeded = spent > b.amount;
            const isNearLimit = percentage >= 80 && !isExceeded;

            const progressColor = isExceeded
              ? "bg-ivy-red"
              : isNearLimit
              ? "bg-ivy-orange"
              : "bg-ivy-green";

            return (
              <IvyCard key={b.id} className="p-5 sm:p-6 space-y-4 group hover:border-ivy-purple/40">
                {/* Top Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-ivy-purple/10 text-ivy-purple flex items-center justify-center">
                      <Target size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[var(--text-primary)]">{b.name}</h3>
                      <span className="text-[11px] text-[var(--text-muted)] font-medium uppercase">
                        {b.period}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(b)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-purple hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-red hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Numbers */}
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-muted)]">Spent: </span>
                    <span
                      className={`text-lg sm:text-xl font-black ${
                        isExceeded ? "text-ivy-red" : "text-[var(--text-primary)]"
                      }`}
                    >
                      {hideBalance ? "••••••" : formatMoney(spent, currency)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">Limit: </span>
                    <span className="text-sm font-bold text-[var(--text-secondary)]">
                      {hideBalance ? "••••••" : formatMoney(b.amount, currency)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 bg-[var(--bg-surface-elevated)] rounded-full overflow-hidden p-0.5 border border-[var(--border-subtle)]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span
                      className={
                        isExceeded
                          ? "text-ivy-red"
                          : isNearLimit
                          ? "text-ivy-orange"
                          : "text-ivy-green"
                      }
                    >
                      {percentage}% used
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {hideBalance
                        ? "••••••"
                        : isExceeded
                        ? `Over by ${formatMoney(spent - b.amount, currency)}`
                        : `${formatMoney(b.remaining || 0, currency)} remaining`}
                    </span>
                  </div>
                </div>
              </IvyCard>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <IvyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedBudget ? "Edit Budget" : "New Budget"}
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
              placeholder="e.g. Dining Out, Grocery Monthly, Shopping"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Limit Amount
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
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="WEEKLY">Weekly</option>
                <option value="ONE_TIME">One Time</option>
              </select>
            </div>
          </div>

          {/* Categories Selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
              Apply to Categories (Leave empty for All Expenses)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer truncate ${
                      isSelected
                        ? "border-ivy-purple bg-ivy-purple/15 text-ivy-purple"
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
}
