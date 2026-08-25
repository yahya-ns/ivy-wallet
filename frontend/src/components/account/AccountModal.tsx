import React, { useState, useEffect } from "react";
import { IvyModal } from "@/components/ui/IvyModal";
import { IvyButton } from "@/components/ui/IvyButton";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { AmountInput } from "@/components/ui/AmountInput";
import { useTheme } from "@/components/theme/ThemeProvider";
import { COLOR_OPTIONS, ICON_OPTIONS, CURRENCY_LIST } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";
import { numberToAmountInput, parseAmountInput } from "@/lib/amountUtils";
import { Account } from "@/lib/types";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialAccount?: Account | null;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialAccount = null,
}) => {
  const { currency: defaultCurrency } = useTheme();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency || "USD");
  const [color, setColor] = useState("#5C3DF5");
  const [icon, setIcon] = useState("wallet");
  const [includeInBalance, setIncludeInBalance] = useState(true);
  const [balanceStr, setBalanceStr] = useState("");
  const [balanceValue, setBalanceValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAccount) {
      setName(initialAccount.name);
      setCurrency(initialAccount.currency || defaultCurrency || "USD");
      setColor(initialAccount.color || "#5C3DF5");
      setIcon(initialAccount.icon || "wallet");
      setIncludeInBalance(initialAccount.includeInBalance ?? true);
      const currentBal = initialAccount.balance ?? 0;
      setBalanceStr(numberToAmountInput(currentBal));
      setBalanceValue(currentBal);
    } else {
      setName("");
      setCurrency(defaultCurrency || "USD");
      setColor("#5C3DF5");
      setIcon("wallet");
      setIncludeInBalance(true);
      setBalanceStr("");
      setBalanceValue(0);
    }
    setError(null);
  }, [initialAccount, isOpen, defaultCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide an account name");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        name: name.trim(),
        currency,
        color,
        icon,
        includeInBalance,
      };

      if (initialAccount) {
        payload.balance = parseAmountInput(balanceStr);
      } else {
        const initBal = parseAmountInput(balanceStr);
        if (initBal !== 0) {
          payload.initialBalance = initBal;
        }
      }

      const url = initialAccount ? `/api/accounts/${initialAccount.id}` : "/api/accounts";
      const method = initialAccount ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save account");
      }

      onSuccess();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const initialBalNum = initialAccount?.balance ?? 0;
  const balanceDifference = balanceValue - initialBalNum;
  const hasBalanceChanged = initialAccount && Math.abs(balanceDifference) >= 0.005;

  return (
    <IvyModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialAccount ? "Edit Account" : "New Account"}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-ivy-red/10 border border-ivy-red/30 text-ivy-red rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Account Name & Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Account Name
            </label>
            <input
              type="text"
              placeholder="e.g. Main Bank, Cash, Crypto"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            >
              {CURRENCY_LIST.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Balance Input (Initial for New, Current/Adjust for Edit) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              {initialAccount ? "Account Balance" : "Initial Starting Balance (Optional)"}
            </label>
            {initialAccount && (
              <span className="text-[11px] text-[var(--text-muted)]">
                Perubahan saldo otomatis dicatat sebagai transaksi baru
              </span>
            )}
          </div>
          <AmountInput
            value={balanceStr}
            onChange={(formatted, num) => {
              setBalanceStr(formatted);
              setBalanceValue(num);
            }}
            placeholder="0"
            allowNegative={true}
          />
          {hasBalanceChanged && (
            <div className="mt-2 p-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">Penyesuaian Saldo:</span>
              {balanceDifference > 0 ? (
                <span className="text-ivy-green font-bold">
                  +{formatMoney(balanceDifference, currency)} (Income)
                </span>
              ) : (
                <span className="text-ivy-red font-bold">
                  -{formatMoney(Math.abs(balanceDifference), currency)} (Expense)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Color Palette Picker */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
            Color
          </label>
          <div className="flex flex-wrap gap-2.5">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={`w-7 h-7 rounded-full transition-transform cursor-pointer shadow-sm ${
                  color === c.value
                    ? "scale-125 ring-2 ring-offset-2 ring-ivy-purple"
                    : "hover:scale-110"
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Icon Picker */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
            Icon
          </label>
          <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto p-1">
            {ICON_OPTIONS.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(iconName)}
                className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  icon === iconName
                    ? "border-ivy-purple bg-ivy-purple/10 text-ivy-purple"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-color)]"
                }`}
              >
                <IvyIcon name={iconName} size={18} />
              </button>
            ))}
          </div>
        </div>

        {/* Toggle: Include in Total Balance */}
        <div className="flex items-center justify-between p-3 bg-[var(--bg-surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)]">
              Include in Total Net Worth
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Count this account in total dashboard balance calculations
            </p>
          </div>
          <input
            type="checkbox"
            checked={includeInBalance}
            onChange={(e) => setIncludeInBalance(e.target.checked)}
            className="w-4 h-4 accent-ivy-purple cursor-pointer"
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <IvyButton type="submit" disabled={saving} className="w-full py-3">
            {saving ? "Saving..." : initialAccount ? "Update Account" : "Create Account"}
          </IvyButton>
        </div>
      </form>
    </IvyModal>
  );
};
