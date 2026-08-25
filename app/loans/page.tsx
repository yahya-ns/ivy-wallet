"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Account, Loan, LoanType } from "@/lib/types";
import { formatMoney, formatRelativeDate } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { IvyModal } from "@/components/ui/IvyModal";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { Plus, Edit2, Trash2, HandCoins, CheckCircle2 } from "lucide-react";

export default function LoansPage() {
  const { currency, hideBalance } = useTheme();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs: ALL, BORROW, LEND
  const [filterType, setFilterType] = useState<string>("ALL");

  // Modals
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [repayLoan, setRepayLoan] = useState<Loan | null>(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayAccountId, setRepayAccountId] = useState("");
  const [repayNote, setRepayNote] = useState("");
  const [repayCreateTx, setRepayCreateTx] = useState(true);
  const [repaying, setRepaying] = useState(false);

  // Loan Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [loanType, setLoanType] = useState<LoanType>("BORROW");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [createTx, setCreateTx] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, aRes] = await Promise.all([
        fetch("/api/loans"),
        fetch("/api/accounts"),
      ]);
      if (lRes.ok) setLoans(await lRes.json());
      if (aRes.ok) setAccounts(await aRes.json());
    } catch (e) {
      console.error("Failed to fetch loans:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleOpenCreate = () => {
    setSelectedLoan(null);
    setName("");
    setAmount("");
    setLoanType("BORROW");
    setAccountId(accounts[0]?.id || "");
    setNote("");
    setDueDate("");
    setCreateTx(true);
    setError(null);
    setIsLoanModalOpen(true);
  };

  const handleOpenEdit = (l: Loan) => {
    setSelectedLoan(l);
    setName(l.name);
    setAmount(l.amount.toString());
    setLoanType(l.type);
    setAccountId(l.accountId || accounts[0]?.id || "");
    setNote(l.note || "");
    setDueDate(l.dueDate ? new Date(l.dueDate).toISOString().slice(0, 10) : "");
    setCreateTx(false);
    setError(null);
    setIsLoanModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this loan record?")) return;
    try {
      await fetch(`/api/loans/${id}`, { method: "DELETE" });
      fetchLoans();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (e) {
      console.error("Failed to delete loan:", e);
    }
  };

  const handleSubmitLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || parseFloat(amount) <= 0) {
      setError("Please provide a name and valid amount");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        amount: parseFloat(amount),
        type: loanType,
        accountId: accountId || null,
        note: note.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        createTransaction: createTx,
      };

      const url = selectedLoan ? `/api/loans/${selectedLoan.id}` : `/api/loans`;
      const method = selectedLoan ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save loan");
      }

      setIsLoanModalOpen(false);
      fetchLoans();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRepay = (l: Loan) => {
    setRepayLoan(l);
    setRepayAmount(l.remainingAmount ? l.remainingAmount.toString() : l.amount.toString());
    setRepayAccountId(accounts[0]?.id || "");
    setRepayNote("");
    setRepayCreateTx(true);
    setIsRepayModalOpen(true);
  };

  const handleSubmitRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayLoan || !repayAmount || parseFloat(repayAmount) <= 0) return;

    setRepaying(true);
    try {
      const res = await fetch(`/api/loans/${repayLoan.id}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(repayAmount),
          accountId: repayAccountId || null,
          note: repayNote.trim() || null,
          createTransaction: repayCreateTx,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to record payment");
        return;
      }

      setIsRepayModalOpen(false);
      fetchLoans();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setRepaying(false);
    }
  };

  // Summaries
  const totalBorrowed = loans
    .filter((l) => l.type === "BORROW" && !l.isPaid)
    .reduce((sum, l) => sum + (l.remainingAmount ?? l.amount), 0);

  const totalLent = loans
    .filter((l) => l.type === "LEND" && !l.isPaid)
    .reduce((sum, l) => sum + (l.remainingAmount ?? l.amount), 0);

  const filteredLoans = loans.filter((l) => {
    if (filterType === "BORROW") return l.type === "BORROW";
    if (filterType === "LEND") return l.type === "LEND";
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Loans & Debts
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Keep track of money you borrowed or lent to friends and lenders.
          </p>
        </div>

        <IvyButton onClick={handleOpenCreate} variant="primary" size="md">
          <Plus size={18} className="stroke-[2.5]" />
          <span>New Loan / Debt</span>
        </IvyButton>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <IvyCard className="p-5 bg-ivy-red/10 border-ivy-red/25">
          <p className="text-xs font-bold text-ivy-red uppercase tracking-wider">
            I Owe (Borrowed Debts)
          </p>
          <p className="text-2xl sm:text-3xl font-black text-ivy-red mt-1">
            {hideBalance ? "••••••" : formatMoney(totalBorrowed, currency)}
          </p>
        </IvyCard>

        <IvyCard className="p-5 bg-ivy-green/10 border-ivy-green/25">
          <p className="text-xs font-bold text-ivy-green uppercase tracking-wider">
            Owed to Me (Lent Money)
          </p>
          <p className="text-2xl sm:text-3xl font-black text-ivy-green mt-1">
            {hideBalance ? "••••••" : formatMoney(totalLent, currency)}
          </p>
        </IvyCard>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-[var(--bg-surface-elevated)] rounded-2xl w-fit border border-[var(--border-subtle)]">
        {["ALL", "BORROW", "LEND"].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === t
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm font-extrabold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t === "ALL" ? "All Records" : t === "BORROW" ? "Borrowed (I Owe)" : "Lent (Owed to Me)"}
          </button>
        ))}
      </div>

      {/* Loans List */}
      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-[var(--text-muted)]">
          Loading loans...
        </div>
      ) : filteredLoans.length === 0 ? (
        <IvyCard className="p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-ivy-purple/10 text-ivy-purple flex items-center justify-center mx-auto mb-3">
            <HandCoins size={28} />
          </div>
          <p className="text-base font-bold text-[var(--text-primary)]">No Active Loan Records</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Track borrowed and lent amounts with ease.
          </p>
          <IvyButton onClick={handleOpenCreate} size="sm">
            <Plus size={16} />
            <span>Create Loan / Debt</span>
          </IvyButton>
        </IvyCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredLoans.map((loan) => {
            const isBorrow = loan.type === "BORROW";
            const paid = loan.paidAmount || 0;
            const remaining = loan.remainingAmount ?? loan.amount;
            const percentage = loan.amount > 0 ? (paid / loan.amount) * 100 : 0;

            return (
              <IvyCard key={loan.id} className="p-5 sm:p-6 space-y-4 group hover:border-ivy-purple/40">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: isBorrow ? "#F53D3D" : "#12B880" }}
                    >
                      <HandCoins size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[var(--text-primary)]">{loan.name}</h3>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isBorrow
                            ? "bg-ivy-red/15 text-ivy-red"
                            : "bg-ivy-green/15 text-ivy-green"
                        }`}
                      >
                        {isBorrow ? "I Owe" : "Owed to Me"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(loan)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-purple hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(loan.id)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-red hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Amount details */}
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-muted)]">Remaining: </span>
                    <span className="text-xl font-black text-[var(--text-primary)]">
                      {hideBalance ? "••••••" : formatMoney(remaining, currency)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">Total: </span>
                    <span className="text-sm font-bold text-[var(--text-secondary)]">
                      {hideBalance ? "••••••" : formatMoney(loan.amount, currency)}
                    </span>
                  </div>
                </div>

                {/* Repayment Progress */}
                <div className="space-y-1">
                  <div className="w-full h-2.5 bg-[var(--bg-surface-elevated)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                    <div
                      className="h-full bg-ivy-green rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
                    <span>{percentage.toFixed(0)}% paid</span>
                    {loan.isPaid && (
                      <span className="text-ivy-green font-bold flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        <span>Completed</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Action button */}
                {!loan.isPaid && (
                  <div className="pt-2">
                    <IvyButton
                      onClick={() => handleOpenRepay(loan)}
                      size="sm"
                      variant="secondary"
                      className="w-full"
                    >
                      <span>Record Repayment</span>
                    </IvyButton>
                  </div>
                )}
              </IvyCard>
            );
          })}
        </div>
      )}

      {/* Create / Edit Loan Modal */}
      <IvyModal
        isOpen={isLoanModalOpen}
        onClose={() => setIsLoanModalOpen(false)}
        title={selectedLoan ? "Edit Loan / Debt" : "New Loan / Debt"}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitLoan} className="space-y-4">
          {error && (
            <div className="p-3 bg-ivy-red/10 border border-ivy-red/30 text-ivy-red rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setLoanType("BORROW")}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                loanType === "BORROW"
                  ? "bg-ivy-red text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              I Borrowed (Debt)
            </button>
            <button
              type="button"
              onClick={() => setLoanType("LEND")}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                loanType === "LEND"
                  ? "bg-ivy-green text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              I Lent (Lending)
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Person / Entity Name
            </label>
            <input
              type="text"
              placeholder="e.g. John Doe, Bank Loan, Alice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Total Amount
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

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Notes (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-ivy-purple"
            />
          </div>

          {!selectedLoan && (
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface-elevated)] rounded-xl">
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  Create Balance Transaction
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {loanType === "BORROW" ? "Add amount to selected account as income" : "Deduct amount from account as expense"}
                </p>
              </div>
              <input
                type="checkbox"
                checked={createTx}
                onChange={(e) => setCreateTx(e.target.checked)}
                className="w-4 h-4 accent-ivy-purple cursor-pointer"
              />
            </div>
          )}

          <div className="pt-2">
            <IvyButton type="submit" disabled={saving} className="w-full py-3">
              {saving ? "Saving..." : selectedLoan ? "Update Record" : "Create Record"}
            </IvyButton>
          </div>
        </form>
      </IvyModal>

      {/* Record Repayment Modal */}
      <IvyModal
        isOpen={isRepayModalOpen}
        onClose={() => setIsRepayModalOpen(false)}
        title={`Record Repayment: ${repayLoan?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitRepayment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Repayment Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Account
            </label>
            <select
              value={repayAccountId}
              onChange={(e) => setRepayAccountId(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="text"
              placeholder="Note (e.g. Partial installment #1)"
              value={repayNote}
              onChange={(e) => setRepayNote(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-ivy-purple"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-[var(--bg-surface-elevated)] rounded-xl">
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Create Account Transaction
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Sync repayment with account balance
              </p>
            </div>
            <input
              type="checkbox"
              checked={repayCreateTx}
              onChange={(e) => setRepayCreateTx(e.target.checked)}
              className="w-4 h-4 accent-ivy-purple cursor-pointer"
            />
          </div>

          <div className="pt-2">
            <IvyButton type="submit" disabled={repaying} className="w-full py-3" variant="success">
              {repaying ? "Recording..." : "Save Repayment"}
            </IvyButton>
          </div>
        </form>
      </IvyModal>
    </div>
  );
}
