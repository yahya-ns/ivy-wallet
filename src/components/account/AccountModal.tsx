"use client";

import React, { useState, useEffect } from "react";
import { IvyModal } from "@/components/ui/IvyModal";
import { IvyButton } from "@/components/ui/IvyButton";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { Account } from "@/lib/types";
import { COLOR_OPTIONS, CURRENCY_LIST, ICON_OPTIONS } from "@/lib/constants";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialAccount?: Account | null;
}

export function AccountModal({
  isOpen,
  onClose,
  onSuccess,
  initialAccount,
}: AccountModalProps) {
  const [name, setName] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [color, setColor] = useState<string>("#5C3DF5");
  const [icon, setIcon] = useState<string>("wallet");
  const [includeInBalance, setIncludeInBalance] = useState<boolean>(true);
  const [initialBalance, setInitialBalance] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAccount) {
      setName(initialAccount.name);
      setCurrency(initialAccount.currency || "USD");
      setColor(initialAccount.color || "#5C3DF5");
      setIcon(initialAccount.icon || "wallet");
      setIncludeInBalance(initialAccount.includeInBalance ?? true);
      setInitialBalance("");
    } else {
      setName("");
      setCurrency("USD");
      setColor("#5C3DF5");
      setIcon("wallet");
      setIncludeInBalance(true);
      setInitialBalance("");
    }
    setError(null);
  }, [initialAccount, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter account name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        currency,
        color,
        icon,
        includeInBalance,
        initialBalance: !initialAccount && initialBalance ? parseFloat(initialBalance) : undefined,
      };

      const url = initialAccount ? `/api/accounts/${initialAccount.id}` : `/api/accounts`;
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
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

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

        {/* Name input */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
            Account Name
          </label>
          <input
            type="text"
            placeholder="e.g. Main Bank, Crypto Wallet, Cash"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            required
          />
        </div>

        {/* Currency & Initial Balance */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            >
              {CURRENCY_LIST.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol}) - {c.name}
                </option>
              ))}
            </select>
          </div>

          {!initialAccount && (
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Initial Balance
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              />
            </div>
          )}
        </div>

        {/* Color picker */}
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
                  color === c.value ? "scale-125 ring-2 ring-offset-2 ring-ivy-purple" : "hover:scale-110"
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Icon picker */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
            Icon
          </label>
          <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto p-1">
            {ICON_OPTIONS.slice(0, 18).map((iconName) => (
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

        {/* Include in Balance switch */}
        <div className="flex items-center justify-between p-3 bg-[var(--bg-surface-elevated)] rounded-xl">
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)]">Include in Total Balance</p>
            <p className="text-[11px] text-[var(--text-muted)]">Count this account in net worth calculation</p>
          </div>
          <input
            type="checkbox"
            checked={includeInBalance}
            onChange={(e) => setIncludeInBalance(e.target.checked)}
            className="w-4 h-4 accent-ivy-purple cursor-pointer"
          />
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <IvyButton type="submit" disabled={loading} className="w-full py-3">
            {loading ? "Saving..." : initialAccount ? "Update Account" : "Create Account"}
          </IvyButton>
        </div>
      </form>
    </IvyModal>
  );
}
