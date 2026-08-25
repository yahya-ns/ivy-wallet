"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Account, Category, PlannedPaymentRule } from "@/lib/types";
import { formatMoney, formatRelativeDate } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { IvyModal } from "@/components/ui/IvyModal";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { Plus, Edit2, Trash2, CalendarClock, Play, CheckCircle2, AlertCircle } from "lucide-react";

export default function PlannedPaymentsPage() {
  const { currency, hideBalance } = useTheme();
  const [rules, setRules] = useState<PlannedPaymentRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PlannedPaymentRule | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("EXPENSE");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [intervalN, setIntervalN] = useState("1");
  const [intervalType, setIntervalType] = useState("MONTH");
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, aRes, cRes] = await Promise.all([
        fetch("/api/planned"),
        fetch("/api/accounts"),
        fetch("/api/categories"),
      ]);
      if (rRes.ok) setRules(await rRes.json());
      if (aRes.ok) setAccounts(await aRes.json());
      if (cRes.ok) setCategories(await cRes.json());
    } catch (e) {
      console.error("Failed to fetch planned rules:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleOpenCreate = () => {
    setSelectedRule(null);
    setTitle("");
    setAmount("");
    setType("EXPENSE");
    setAccountId(accounts[0]?.id || "");
    setCategoryId(categories[0]?.id || "");
    setIntervalN("1");
    setIntervalType("MONTH");
    setStartDate(new Date().toISOString().slice(0, 10));
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r: PlannedPaymentRule) => {
    setSelectedRule(r);
    setTitle(r.title || "");
    setAmount(r.amount.toString());
    setType(r.type);
    setAccountId(r.accountId);
    setCategoryId(r.categoryId || categories[0]?.id || "");
    setIntervalN((r.intervalN || 1).toString());
    setIntervalType(r.intervalType || "MONTH");
    setStartDate(r.startDate ? new Date(r.startDate).toISOString().slice(0, 10) : "");
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this planned payment?")) return;
    try {
      await fetch(`/api/planned/${id}`, { method: "DELETE" });
      fetchRules();
    } catch (e) {
      console.error("Failed to delete planned rule:", e);
    }
  };

  const handleExecuteNow = async (r: PlannedPaymentRule) => {
    setExecuting(r.id);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: r.accountId,
          type: r.type,
          amount: r.amount,
          title: r.title || "Planned Payment",
          categoryId: r.categoryId,
          dateTime: new Date().toISOString(),
          recurringRuleId: r.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to record transaction");

      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
      alert(`Recorded ${r.title || "Planned payment"} successfully!`);
    } catch (err: any) {
      alert(err.message || "Failed to execute payment");
    } finally {
      setExecuting(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || parseFloat(amount) <= 0 || !accountId) {
      setError("Please provide a title, amount, and account");
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
        intervalN: parseInt(intervalN) || 1,
        intervalType,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
      };

      const url = selectedRule ? `/api/planned/${selectedRule.id}` : `/api/planned`;
      const method = selectedRule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save planned rule");
      }

      setIsModalOpen(false);
      fetchRules();
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
            Automate recurring bills, rent, subscriptions, and regular income.
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
          <div className="w-14 h-14 rounded-2xl bg-ivy-purple/10 text-ivy-purple flex items-center justify-center mx-auto mb-3">
            <CalendarClock size={28} />
          </div>
          <p className="text-base font-bold text-[var(--text-primary)]">No Planned Payments</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Add recurring subscriptions like Spotify, Netflix, Rent, or Salary.
          </p>
          <IvyButton onClick={handleOpenCreate} size="sm">
            <Plus size={16} />
            <span>Create Planned Rule</span>
          </IvyButton>
        </IvyCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {rules.map((rule) => {
            const isExpense = rule.type === "EXPENSE";
            const catColor = rule.category?.color || "#5C3DF5";

            return (
              <IvyCard key={rule.id} className="p-5 sm:p-6 space-y-4 group hover:border-ivy-purple/40">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: catColor }}
                    >
                      <IvyIcon name={rule.category?.icon || "calendar-clock"} size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[var(--text-primary)]">
                        {rule.title || "Recurring Payment"}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span>{rule.account?.name || "Account"}</span>
                        <span>•</span>
                        <span className="font-semibold text-ivy-purple capitalize">
                          Every {rule.intervalN && rule.intervalN > 1 ? `${rule.intervalN} ` : ""}
                          {rule.intervalType?.toLowerCase()}
                          {rule.intervalN && rule.intervalN > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(rule)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-purple hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-red hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Amount and Pay button */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-muted)]">Amount: </span>
                    <span
                      className={`text-lg font-black ${
                        isExpense ? "text-ivy-red" : "text-ivy-green"
                      }`}
                    >
                      {hideBalance ? "••••••" : `${isExpense ? "-" : "+"}${formatMoney(rule.amount, currency)}`}
                    </span>
                  </div>

                  <IvyButton
                    size="sm"
                    variant="secondary"
                    disabled={executing === rule.id}
                    onClick={() => handleExecuteNow(rule)}
                    className="hover:bg-ivy-purple hover:text-white"
                  >
                    <Play size={13} className="fill-current" />
                    <span>{executing === rule.id ? "Recording..." : "Pay Now"}</span>
                  </IvyButton>
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
        title={selectedRule ? "Edit Planned Rule" : "New Planned Rule"}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-ivy-red/10 border border-ivy-red/30 text-ivy-red rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setType("EXPENSE")}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                type === "EXPENSE"
                  ? "bg-ivy-red text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Expense Rule
            </button>
            <button
              type="button"
              onClick={() => setType("INCOME")}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                type === "INCOME"
                  ? "bg-ivy-green text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Income Rule
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Title / Name
            </label>
            <input
              type="text"
              placeholder="e.g. Netflix, Gym Membership, House Rent, Salary"
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
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Interval
              </label>
              <select
                value={intervalType}
                onChange={(e) => setIntervalType(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              >
                <option value="DAY">Daily</option>
                <option value="WEEK">Weekly</option>
                <option value="MONTH">Monthly</option>
                <option value="YEAR">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
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
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            />
          </div>

          <div className="pt-2">
            <IvyButton type="submit" disabled={saving} className="w-full py-3">
              {saving ? "Saving..." : selectedRule ? "Update Rule" : "Create Planned Rule"}
            </IvyButton>
          </div>
        </form>
      </IvyModal>
    </div>
  );
}
