"use client";

import React, { useState, useRef } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { CURRENCY_LIST } from "@/lib/constants";
import { ThemeMode } from "@/lib/types";
import {
  Sun,
  Moon,
  Sparkles,
  DollarSign,
  Download,
  Upload,
  FileSpreadsheet,
  Shield,
  Heart,
  CheckCircle2,
  AlertCircle,
  FileJson,
} from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme, currency, setCurrency } = useTheme();

  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    window.open("/api/backup?format=json", "_blank");
  };

  const handleExportCSV = () => {
    window.open("/api/backup?format=csv", "_blank");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus(null);

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to import data");

      setImportStatus(result.message || "Import successful!");
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (err: any) {
      setImportStatus(`Error: ${err.message || "Failed to parse JSON backup"}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
          Customize your theme, primary currency, and manage backups.
        </p>
      </div>

      {/* 1. Appearance / Theme */}
      <IvyCard className="p-6 space-y-4">
        <h2 className="text-base font-bold text-[var(--text-primary)]">Theme & Appearance</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Select your preferred visual mode. True Black is optimized for OLED displays.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Light */}
          <button
            onClick={() => setTheme("LIGHT")}
            className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
              theme === "LIGHT"
                ? "border-ivy-purple bg-ivy-purple/10 text-ivy-purple shadow-sm ring-2 ring-ivy-purple"
                : "border-[var(--border-color)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] hover:border-ivy-purple/50"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-white text-ivy-orange flex items-center justify-center shadow-sm">
              <Sun size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Light</p>
              <p className="text-[11px] text-[var(--text-muted)]">Bright & Clean</p>
            </div>
          </button>

          {/* Dark */}
          <button
            onClick={() => setTheme("DARK")}
            className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
              theme === "DARK"
                ? "border-ivy-purple bg-ivy-purple/10 text-ivy-purple shadow-sm ring-2 ring-ivy-purple"
                : "border-[var(--border-color)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] hover:border-ivy-purple/50"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-ivy-darkGray text-ivy-purple-light flex items-center justify-center shadow-sm">
              <Moon size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Dark</p>
              <p className="text-[11px] text-[var(--text-muted)]">Ivy Default Dark</p>
            </div>
          </button>

          {/* True Black */}
          <button
            onClick={() => setTheme("TRUE_BLACK")}
            className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
              theme === "TRUE_BLACK"
                ? "border-ivy-purple bg-ivy-purple/10 text-ivy-purple shadow-sm ring-2 ring-ivy-purple"
                : "border-[var(--border-color)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] hover:border-ivy-purple/50"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-black text-ivy-green flex items-center justify-center shadow-sm">
              <Sparkles size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">True Black</p>
              <p className="text-[11px] text-[var(--text-muted)]">Pure OLED Black</p>
            </div>
          </button>
        </div>
      </IvyCard>

      {/* 2. Primary Currency */}
      <IvyCard className="p-6 space-y-4">
        <h2 className="text-base font-bold text-[var(--text-primary)]">Primary Currency</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Choose the default currency used for calculating total balances and summaries.
        </p>

        <div className="max-w-md pt-1">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
          >
            {CURRENCY_LIST.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol}) — {c.name}
              </option>
            ))}
          </select>
        </div>
      </IvyCard>

      {/* 3. Data Backup & Restore */}
      <IvyCard className="p-6 space-y-4">
        <h2 className="text-base font-bold text-[var(--text-primary)]">Data Backup & Export</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Export your complete transactions and configurations or restore from a JSON backup.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* JSON Export */}
          <IvyButton onClick={handleExportJSON} variant="secondary" className="justify-start py-3">
            <FileJson size={18} className="text-ivy-purple" />
            <span>Export JSON</span>
          </IvyButton>

          {/* CSV Export */}
          <IvyButton onClick={handleExportCSV} variant="secondary" className="justify-start py-3">
            <FileSpreadsheet size={18} className="text-ivy-green" />
            <span>Export CSV</span>
          </IvyButton>

          {/* JSON Import */}
          <IvyButton
            onClick={() => fileInputRef.current?.click()}
            variant="secondary"
            className="justify-start py-3"
            disabled={importing}
          >
            <Upload size={18} className="text-ivy-blue" />
            <span>{importing ? "Importing..." : "Import Backup"}</span>
          </IvyButton>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>

        {importStatus && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              importStatus.startsWith("Error")
                ? "bg-ivy-red/10 border border-ivy-red/30 text-ivy-red"
                : "bg-ivy-green/10 border border-ivy-green/30 text-ivy-green"
            }`}
          >
            {importStatus.startsWith("Error") ? (
              <AlertCircle size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            <span>{importStatus}</span>
          </div>
        )}
      </IvyCard>

      {/* 4. About Ivy Wallet Web */}
      <IvyCard className="p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-ivy-purple to-ivy-green flex items-center justify-center text-white font-black text-base shadow-md">
            IV
          </div>
          <div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Ivy Wallet Web Edition</h3>
            <p className="text-xs text-[var(--text-muted)]">Open Source Personal Finance App</p>
          </div>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed pt-1">
          Ivy Wallet is designed to help you manage your personal finances with speed, simplicity,
          and a beautiful user experience. All your data is stored securely in your database.
        </p>

        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
          <span>License: GPL-3.0</span>
          <span>•</span>
          <span>Version: 1.0.0</span>
        </div>
      </IvyCard>
    </div>
  );
}
