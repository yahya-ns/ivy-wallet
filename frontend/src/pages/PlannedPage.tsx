import React, { useState, useEffect, useCallback } from "react";
import { PlannedPaymentRule, Account, Category } from "@/lib/types";
import { formatMoney, formatRelativeDate } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { IvyModal } from "@/components/ui/IvyModal";
import { Plus, CalendarClock, Trash2, Power } from "lucide-react";

export const PlannedPage: React.FC = () => {
  const { currency, hideBalance, formatRelative } = useTheme();

  const [rules, setRules] = useState<PlannedPaymentRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [intervalType, setIntervalType] = useState("MONTH");
  const [intervalN, setIntervalN] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, aRes, cRes] = await Promise.all([
        fetch("/api/planned"),
        fetch("/api/accounts"),
        fetch("/api/categories"),
      ]);
      if (pRes.ok) setRules(await pRes.json());
      if (aRes.ok) setAccounts(await aRes.json());
      if (cRes.ok) setCategories(await cRes.json());
    } catch (e) {
      console.error("Failed to fetch planned payments:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleOpenCreate = () => {
    setTitle("");
    setAmount("");
    setType("EXPENSE");
    setAccountId(accounts[0]?.id || "");
    setCategoryId(categories[0]?.id || "");
    setIntervalType("MONTH");
    setIntervalN("1");
    setStartDate(new Date().toISOString().slice(0, 10));
    setError(null);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (rule: PlannedPaymentRule) => {
    try {
      await fetch(`/api/planned/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      fetchRules();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (e) {
      console.error("Toggle active failed:", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this planned payment rule?")) return;
    try {
      await fetch(`/api/planned/${id}`, { method: "DELETE" });
      fetchRules();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (e) {
      console.error("Delete planned rule failed:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || parseFloat(amount) <= 0 || !accountId) {
      setError("Please provide title, positive amount, and account");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        amount: parseFloat(amount),
        type,
        accountId,
        categoryId: categoryId || null,
        intervalType,
        intervalN: parseInt(intervalN, 10) || 1,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
      };

      const res = await fetch("/api/planned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create planned payment");
      }

      setIsModalOpen(false);
      fetchRules();
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
            Planned & Subscriptions
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Automate recurring bills, salaries, and subscription reminders.
          </p>
        </div>

        <IvyButton onClick={handleOpenCreate} variant="primary" size="md">
          <Plus size={18} className="stroke-[2.5]" />
          <span>New Planned Rule</span>
        </IvyButton>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-[var(--text-muted)]">
          Loading planned payments...
        </div>
      ) : rules.length === 0 ? (
        <IvyCard className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-ivy-purple/10 text-ivy-purple flex items-center justify-center mx-auto mb-3">
            <CalendarClock size={24} />
          </div>
          <p className="text-base font-bold text-[var(--text-primary)]">No Planned Payments</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Set up automatic reminders for Netflix, Spotify, Rent, or Monthly Salary.
          </p>
          <IvyButton onClick={handleOpenCreate} size="sm">
            <Plus size={16} />
            <span>Create First Rule</span>
          </IvyButton>
        </IvyCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {rules.map((rule) => {
            const isExpense = rule.type === "EXPENSE";

            return (
              <IvyCard
                key={rule.id}
                className={`p-5 sm:p-6 space-y-4 ${
                  !rule.isActive ? "opacity-60 grayscale-[50%]" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 ${
                        isExpense ? "bg-ivy-red" : "bg-ivy-green"
                      }`}
                    >
                      <CalendarClock size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base text-[var(--text-primary)] truncate">
                        {rule.title || "Recurring Payment"}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Every {rule.intervalN > 1 ? `${rule.intervalN} ` : ""}
                        {rule.intervalType.toLowerCase()}
                        {rule.intervalN > 1 ? "s" : ""} • Started {formatRelative(rule.startDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        rule.isActive
                          ? "text-ivy-green hover:bg-ivy-green/10"
                          : "text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                      title={rule.isActive ? "Active (Click to pause)" : "Paused (Click to activate)"}
                    >
                      <Power size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-red hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Delete Rule"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-muted)]">
                      {rule.account?.name || "Account"}
                    </span>
                    {rule.category && (
                      <>
                        <span>•</span>
                        <span className="text-[var(--text-muted)]">{rule.category.name}</span>
                      </>
                    )}
                  </div>

                  <span
                    className={`text-base font-extrabold ${
                      isExpense ? "text-ivy-red" : "text-ivy-green"
                    }`}
                  >
                    {hideBalance
                      ? "••••••"
                      : `${isExpense ? "-" : "+"}${formatMoney(
                          rule.amount,
                          rule.account?.currency || currency
                        )}`}
                  </span>
                </div>
              </IvyCard>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <IvyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Planned Recurring Rule"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-ivy-red/10 border border-ivy-red/30 text-ivy-red rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Type */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--bg-surface-elevated)] rounded-2xl border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setType("EXPENSE")}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === "EXPENSE"
                  ? "bg-ivy-red text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Recurring Expense
            </button>
            <button
              type="button"
              onClick={() => setType("INCOME")}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === "INCOME"
                  ? "bg-ivy-green text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Recurring Income
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Title / Description
            </label>
            <input
              type="text"
              placeholder="e.g. Netflix Subscription, House Rent, Salary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Amount
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
                Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Repeat Every
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={intervalN}
                  onChange={(e) => setIntervalN(e.target.value)}
                  className="w-16 bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
                />
                <select
                  value={intervalType}
                  onChange={(e) => setIntervalType(e.target.value)}
                  className="flex-1 bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
                >
                  <option value="DAY">Days</option>
                  <option value="WEEK">Weeks</option>
                  <option value="MONTH">Months</option>
                  <option value="YEAR">Years</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            />
          </div>

          <div className="pt-2">
            <IvyButton type="submit" disabled={saving} className="w-full py-3">
              {saving ? "Saving..." : "Create Rule"}
            </IvyButton>
          </div>
        </form>
      </IvyModal>
    </div>
  );
};
