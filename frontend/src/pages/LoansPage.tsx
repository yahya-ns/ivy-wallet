import React, { useState, useEffect, useCallback } from "react";
import { Loan, Account, LoanType } from "@/lib/types";
import { formatMoney, formatRelativeDate } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { IvyModal } from "@/components/ui/IvyModal";
import { Plus, CheckCircle2, HandCoins, ArrowDownLeft, ArrowUpRight, Trash2 } from "lucide-react";

export const LoansPage: React.FC = () => {
  const { currency, hideBalance, formatRelative } = useTheme();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Loan Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<LoanType>("BORROW");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [createTx, setCreateTx] = useState(true);

  // Repayment Modal
  const [isRepayOpen, setIsRepayOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayAccountId, setRepayAccountId] = useState("");
  const [repayNote, setRepayNote] = useState("");
  const [repayCreateTx, setRepayCreateTx] = useState(true);

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
    setName("");
    setAmount("");
    setType("BORROW");
    setAccountId(accounts[0]?.id || "");
    setNote("");
    setDueDate("");
    setCreateTx(true);
    setError(null);
    setIsCreateOpen(true);
  };

  const handleOpenRepay = (l: Loan) => {
    setSelectedLoan(l);
    setRepayAmount(l.remainingAmount?.toString() || "");
    setRepayAccountId(accounts[0]?.id || "");
    setRepayNote("");
    setRepayCreateTx(true);
    setError(null);
    setIsRepayOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this loan record?")) return;
    try {
      await fetch(`/api/loans/${id}`, { method: "DELETE" });
      fetchLoans();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (e) {
      console.error("Delete loan failed:", e);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || parseFloat(amount) <= 0) {
      setError("Please provide a name and positive amount");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        amount: parseFloat(amount),
        type,
        accountId: accountId || null,
        note: note.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        createTransaction: createTx,
      };

      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create loan");
      }

      setIsCreateOpen(false);
      fetchLoans();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || !repayAmount || parseFloat(repayAmount) <= 0) {
      setError("Please provide a valid repayment amount");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        amount: parseFloat(repayAmount),
        accountId: repayAccountId || null,
        note: repayNote.trim() || null,
        createTransaction: repayCreateTx,
      };

      const res = await fetch(`/api/loans/${selectedLoan.id}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add repayment");
      }

      setIsRepayOpen(false);
      fetchLoans();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const totalBorrowed = loans
    .filter((l) => l.type === "BORROW" && !l.isPaid)
    .reduce((sum, l) => sum + (l.remainingAmount || 0), 0);

  const totalLent = loans
    .filter((l) => l.type === "LEND" && !l.isPaid)
    .reduce((sum, l) => sum + (l.remainingAmount || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Loans & Debts
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Keep track of money you borrowed or lent to friends and contacts.
          </p>
        </div>

        <IvyButton onClick={handleOpenCreate} variant="primary" size="md">
          <Plus size={18} className="stroke-[2.5]" />
          <span>New Loan / Debt</span>
        </IvyButton>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Money I Owe (Borrow) */}
        <IvyCard className="p-5 flex items-center justify-between border-ivy-red/30 bg-ivy-red/5">
          <div>
            <span className="text-[11px] font-bold text-ivy-red uppercase tracking-wider">
              You Owe (Borrowed)
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] mt-1">
              {hideBalance ? "••••••" : formatMoney(totalBorrowed, currency)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-ivy-red text-white flex items-center justify-center shadow-md shadow-ivy-red/25">
            <ArrowDownLeft size={20} />
          </div>
        </IvyCard>

        {/* Money Owed to Me (Lend) */}
        <IvyCard className="p-5 flex items-center justify-between border-ivy-green/30 bg-ivy-green/5">
          <div>
            <span className="text-[11px] font-bold text-ivy-green uppercase tracking-wider">
              You are Owed (Lent)
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] mt-1">
              {hideBalance ? "••••••" : formatMoney(totalLent, currency)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-ivy-green text-white flex items-center justify-center shadow-md shadow-ivy-green/25">
            <ArrowUpRight size={20} />
          </div>
        </IvyCard>
      </div>

      {/* Loans List */}
      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-[var(--text-muted)]">
          Loading loans...
        </div>
      ) : loans.length === 0 ? (
        <IvyCard className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-ivy-purple/10 text-ivy-purple flex items-center justify-center mx-auto mb-3">
            <HandCoins size={24} />
          </div>
          <p className="text-base font-bold text-[var(--text-primary)]">No Active Loans</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Track borrowed and lent amounts easily with installments and payment history.
          </p>
          <IvyButton onClick={handleOpenCreate} size="sm">
            <Plus size={16} />
            <span>Add Loan Record</span>
          </IvyButton>
        </IvyCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {loans.map((loan) => {
            const isBorrow = loan.type === "BORROW";
            const remaining = loan.remainingAmount || 0;
            const paid = loan.paidAmount || 0;
            const progress = loan.amount > 0 ? (paid / loan.amount) * 100 : 0;

            return (
              <IvyCard key={loan.id} className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 ${
                        isBorrow ? "bg-ivy-red" : "bg-ivy-green"
                      }`}
                    >
                      {isBorrow ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-[var(--text-primary)] truncate">
                          {loan.name}
                        </h3>
                        {loan.isPaid && (
                          <span className="flex items-center gap-1 text-[10px] font-extrabold bg-ivy-green/10 text-ivy-green px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} />
                            <span>Settled</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                        {isBorrow ? "Borrowed" : "Lent"} • {formatRelative(loan.dateTime)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(loan.id)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-red hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    title="Delete Loan"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="w-full h-2 bg-[var(--bg-surface-elevated)] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all rounded-full ${
                        loan.isPaid ? "bg-ivy-green" : isBorrow ? "bg-ivy-red" : "bg-ivy-purple"
                      }`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[var(--text-muted)]">
                      {loan.isPaid ? "Fully Paid" : `Remaining: ${formatMoney(remaining, currency)}`}
                    </span>
                    <span className="text-[var(--text-primary)]">
                      Total: {formatMoney(loan.amount, currency)}
                    </span>
                  </div>
                </div>

                {/* Actions & Repay Button */}
                {!loan.isPaid && (
                  <div className="pt-2 border-t border-[var(--border-subtle)]">
                    <IvyButton
                      onClick={() => handleOpenRepay(loan)}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      <Plus size={14} />
                      <span>Add Repayment / Partial Pay</span>
                    </IvyButton>
                  </div>
                )}
              </IvyCard>
            );
          })}
        </div>
      )}

      {/* Create Loan Modal */}
      <IvyModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="New Loan / Debt Record"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-ivy-red/10 border border-ivy-red/30 text-ivy-red rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--bg-surface-elevated)] rounded-2xl border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setType("BORROW")}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === "BORROW"
                  ? "bg-ivy-red text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              I Borrowed (Debt)
            </button>
            <button
              type="button"
              onClick={() => setType("LEND")}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === "LEND"
                  ? "bg-ivy-green text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              I Lent (Credit)
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Person / Contact Name
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
                Account (Optional)
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              >
                <option value="">None / External</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
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
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-[var(--bg-surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Record Initial Transaction in Account Balance
            </span>
            <input
              type="checkbox"
              checked={createTx}
              onChange={(e) => setCreateTx(e.target.checked)}
              className="w-4 h-4 accent-ivy-purple cursor-pointer"
            />
          </div>

          <div className="pt-2">
            <IvyButton type="submit" disabled={saving} className="w-full py-3">
              {saving ? "Saving..." : "Create Loan Record"}
            </IvyButton>
          </div>
        </form>
      </IvyModal>

      {/* Repay Modal */}
      <IvyModal
        isOpen={isRepayOpen}
        onClose={() => setIsRepayOpen(false)}
        title={`Add Repayment for ${selectedLoan?.name || ""}`}
        maxWidth="md"
      >
        <form onSubmit={handleRepaySubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-ivy-red/10 border border-ivy-red/30 text-ivy-red rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Repayment Amount
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
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
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            >
              <option value="">None / Cash</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between p-3 bg-[var(--bg-surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Record Transaction in Account
            </span>
            <input
              type="checkbox"
              checked={repayCreateTx}
              onChange={(e) => setRepayCreateTx(e.target.checked)}
              className="w-4 h-4 accent-ivy-purple cursor-pointer"
            />
          </div>

          <div className="pt-2">
            <IvyButton type="submit" disabled={saving} className="w-full py-3" variant="success">
              {saving ? "Saving..." : "Record Repayment"}
            </IvyButton>
          </div>
        </form>
      </IvyModal>
    </div>
  );
};
