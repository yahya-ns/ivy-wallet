import React, { useState, useEffect, useCallback } from "react";
import { Account } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { AccountModal } from "@/components/account/AccountModal";
import { Plus, Edit2, Trash2, Wallet, CheckCircle2 } from "lucide-react";

export const AccountsPage: React.FC = () => {
  const { currency, hideBalance } = useTheme();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) setAccounts(await res.json());
    } catch (e) {
      console.error("Failed to fetch accounts:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreate = () => {
    setSelectedAccount(null);
    setIsModalOpen(true);
  };

  const handleEdit = (acc: Account) => {
    setSelectedAccount(acc);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account? Existing transactions will remain."))
      return;
    try {
      await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      fetchAccounts();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (e) {
      console.error("Failed to delete account:", e);
    }
  };

  const totalIncludedBalance = accounts
    .filter((a) => a.includeInBalance)
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Accounts & Wallets
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Manage your bank accounts, cash wallets, cards, and savings.
          </p>
        </div>

        <IvyButton onClick={handleCreate} variant="primary" size="md">
          <Plus size={18} className="stroke-[2.5]" />
          <span>New Account</span>
        </IvyButton>
      </div>

      {/* Summary Total Card */}
      <IvyCard className="p-6 bg-gradient-to-r from-ivy-purple/15 via-ivy-purple/5 to-transparent border-ivy-purple/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Total Net Worth (Included Accounts)
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] mt-1 tracking-tight">
              {hideBalance ? "••••••••" : formatMoney(totalIncludedBalance, currency)}
            </h2>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-ivy-purple text-white flex items-center justify-center shadow-lg shadow-ivy-purple/25">
            <Wallet size={24} />
          </div>
        </div>
      </IvyCard>

      {/* Accounts Grid */}
      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-[var(--text-muted)]">
          Loading accounts...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {accounts.map((acc) => (
            <IvyCard
              key={acc.id}
              className="p-5 flex flex-col justify-between relative group hover:border-ivy-purple/40"
            >
              <div>
                {/* Account Top Row */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
                    style={{ backgroundColor: acc.color }}
                  >
                    <IvyIcon name={acc.icon || "wallet"} size={22} />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-surface-elevated)] px-2.5 py-1 rounded-full uppercase">
                      {acc.currency}
                    </span>
                    <button
                      onClick={() => handleEdit(acc)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-purple hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Edit Account"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-red hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Delete Account"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Account Name & Balance */}
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                    {acc.name}
                  </h3>
                  <p className="text-2xl font-black text-[var(--text-primary)] mt-1 tracking-tight">
                    {hideBalance ? "••••••" : formatMoney(acc.balance || 0, acc.currency)}
                  </p>
                </div>
              </div>

              {/* Stats & Badges */}
              <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                  {acc.includeInBalance ? (
                    <span className="inline-flex items-center gap-1 text-ivy-green font-semibold">
                      <CheckCircle2 size={13} />
                      <span>In Net Worth</span>
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">Excluded</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-ivy-green font-bold">
                    +{formatMoney(acc.totalIncome || 0, acc.currency)}
                  </span>
                  <span className="text-ivy-red font-bold">
                    -{formatMoney(acc.totalExpense || 0, acc.currency)}
                  </span>
                </div>
              </div>
            </IvyCard>
          ))}

          {/* New Account Button Card */}
          <button
            onClick={handleCreate}
            className="p-6 rounded-[24px] border-2 border-dashed border-[var(--border-color)] hover:border-ivy-purple bg-[var(--bg-surface-elevated)]/40 hover:bg-ivy-purple/5 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer min-h-[190px] group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface-elevated)] group-hover:bg-ivy-purple group-hover:text-white flex items-center justify-center text-[var(--text-muted)] transition-colors mb-2 shadow-inner">
              <Plus size={24} className="stroke-[2.5]" />
            </div>
            <p className="font-bold text-sm text-[var(--text-primary)]">Add New Account</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Create another wallet or bank account
            </p>
          </button>
        </div>
      )}

      {/* Account Modal */}
      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAccounts}
        initialAccount={selectedAccount}
      />
    </div>
  );
};
