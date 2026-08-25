import React, { useState, useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { CURRENCY_LIST, DATE_FORMAT_OPTIONS, TIME_FORMAT_OPTIONS } from "@/lib/constants";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { ThemeMode } from "@/lib/types";
import {
  Sun,
  Moon,
  Sparkles,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  Server,
  Zap,
  Calendar,
  Clock,
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  const {
    theme,
    setTheme,
    currency,
    setCurrency,
    hideBalance,
    toggleHideBalance,
    dateFormat,
    setDateFormat,
    timeFormat,
    setTimeFormat,
    formatDate,
    formatTime,
    formatDateTime,
  } = useTheme();

  const [walletName, setWalletName] = useState("My Ivy Wallet");
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((s) => {
        if (s?.name) setWalletName(s.name);
      })
      .catch(() => {});
  }, []);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: walletName }),
      });
      alert("Settings saved successfully!");
    } catch {
      alert("Failed to update settings");
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncStatus("Connecting to Ivy Cloud Server...");
    try {
      const res = await fetch("/api/sync");
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(`Sync successful! ${data.transactions?.length || 0} transactions updated.`);
        window.dispatchEvent(new CustomEvent("ivy-data-updated"));
      } else {
        setSyncStatus("Sync failed. Check connection.");
      }
    } catch {
      setSyncStatus("Sync server unreachable.");
    } finally {
      setSyncing(false);
    }
  };

  const handleExportJson = () => {
    window.location.href = "/api/backup?format=json";
  };

  const handleExportCsv = () => {
    window.location.href = "/api/backup?format=csv";
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      if (res.ok) {
        const result = await res.json();
        setImportStatus(result.message || "Import completed!");
        window.dispatchEvent(new CustomEvent("ivy-data-updated"));
      } else {
        setImportStatus("Import failed. Invalid format.");
      }
    } catch (err: any) {
      setImportStatus("Error reading JSON file.");
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
          Preferences & Settings
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
          Customize themes, currency, sync with mobile apps, and manage backups.
        </p>
      </div>

      {/* Theme Settings */}
      <IvyCard className="p-6 space-y-4">
        <h3 className="text-base font-bold text-[var(--text-primary)]">Theme & Appearance</h3>
        <p className="text-xs text-[var(--text-muted)]">
          Select between clean Light mode, Ivy Dark mode, or ultra battery-saving OLED True Black.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Light */}
          <button
            onClick={() => setTheme("LIGHT")}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              theme === "LIGHT"
                ? "border-ivy-purple ring-2 ring-ivy-purple/30 bg-ivy-purple/5 text-ivy-purple font-bold"
                : "border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-color)]"
            }`}
          >
            <Sun size={24} className="text-ivy-orange" />
            <span className="text-xs font-bold text-[var(--text-primary)]">Light Mode</span>
          </button>

          {/* Dark */}
          <button
            onClick={() => setTheme("DARK")}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              theme === "DARK"
                ? "border-ivy-purple ring-2 ring-ivy-purple/30 bg-ivy-purple/5 text-ivy-purple font-bold"
                : "border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-color)]"
            }`}
          >
            <Moon size={24} className="text-ivy-purple-light" />
            <span className="text-xs font-bold text-[var(--text-primary)]">Dark Theme</span>
          </button>

          {/* OLED Black */}
          <button
            onClick={() => setTheme("TRUE_BLACK")}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              theme === "TRUE_BLACK"
                ? "border-ivy-purple ring-2 ring-ivy-purple/30 bg-ivy-purple/5 text-ivy-purple font-bold"
                : "border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-color)]"
            }`}
          >
            <Sparkles size={24} className="text-ivy-green" />
            <span className="text-xs font-bold text-[var(--text-primary)]">True Black (OLED)</span>
          </button>
        </div>
      </IvyCard>

      {/* Currency & Identity */}
      <IvyCard className="p-6 space-y-4">
        <h3 className="text-base font-bold text-[var(--text-primary)]">Currency & Privacy</h3>

        <form onSubmit={handleUpdateName} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Default Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              >
                {CURRENCY_LIST.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Wallet Title
              </label>
              <input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[var(--bg-surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Privacy Mode (Hide Balance)
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Mask monetary balances with dots on dashboard and cards
              </p>
            </div>
            <input
              type="checkbox"
              checked={hideBalance}
              onChange={toggleHideBalance}
              className="w-4 h-4 accent-ivy-purple cursor-pointer"
            />
          </div>

          <IvyButton type="submit" size="sm">
            Save Preferences
          </IvyButton>
        </form>
      </IvyCard>

      {/* Date & Time Formatting Settings */}
      <IvyCard className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-ivy-purple/10 text-ivy-purple flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Date & Time Display Format
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Choose how dates, timestamps, and clocks are formatted across transactions and summaries.
              </p>
            </div>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-ivy-purple/10 via-ivy-blue/10 to-transparent border border-ivy-purple/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ivy-purple uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} />
              <span>Live Formatting Preview</span>
            </span>
            <span className="text-[10px] bg-ivy-purple/15 text-ivy-purple px-2 py-0.5 rounded-full font-semibold">
              Current Time
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-[var(--bg-surface-elevated)] p-3 rounded-xl border border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                Formatted Date
              </span>
              <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5 truncate">
                {formatDate(new Date())}
              </p>
            </div>

            <div className="bg-[var(--bg-surface-elevated)] p-3 rounded-xl border border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                Formatted Time
              </span>
              <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                {formatTime(new Date())}
              </p>
            </div>

            <div className="bg-[var(--bg-surface-elevated)] p-3 rounded-xl border border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                Full Timestamp
              </span>
              <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5 truncate">
                {formatDateTime(new Date())}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Date Format Selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Date Format Pattern
            </label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            >
              {DATE_FORMAT_OPTIONS.map((df) => (
                <option key={df.code} value={df.code}>
                  {df.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
              Affects transactions list, loan due dates, recurring plans, and exports.
            </p>
          </div>

          {/* Time Format Selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Time System (Clock)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_FORMAT_OPTIONS.map((tf) => (
                <button
                  key={tf.code}
                  type="button"
                  onClick={() => setTimeFormat(tf.code)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    timeFormat === tf.code
                      ? "border-ivy-purple ring-2 ring-ivy-purple/30 bg-ivy-purple/10 text-ivy-purple font-bold"
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-color)]"
                  }`}
                >
                  <span>{tf.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
              Choose between standard 24-hour military clock or 12-hour AM/PM format.
            </p>
          </div>
        </div>
      </IvyCard>

      {/* Cloud Sync & Self-Host Integration */}
      <IvyCard className="p-6 space-y-4 border-ivy-purple/30 bg-gradient-to-br from-ivy-purple/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-ivy-purple text-white flex items-center justify-center shadow-md shadow-ivy-purple/20">
              <Server size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Mobile & Multi-Device Cloud Sync
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                REST Endpoint: <code className="text-ivy-purple font-mono">/api/sync</code>
              </p>
            </div>
          </div>

          <IvyButton
            onClick={handleManualSync}
            disabled={syncing}
            variant="secondary"
            size="sm"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            <span>{syncing ? "Syncing..." : "Sync Now"}</span>
          </IvyButton>
        </div>

        {syncStatus && (
          <div className="p-3 bg-ivy-purple/10 border border-ivy-purple/30 text-ivy-purple rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{syncStatus}</span>
          </div>
        )}

        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Your Ivy Wallet instance is self-hosted, lightweight (~15MB RAM), and provides automatic
          delta synchronization for mobile clients with offline support.
        </p>
      </IvyCard>

      {/* Backup & Export / Import */}
      <IvyCard className="p-6 space-y-4">
        <h3 className="text-base font-bold text-[var(--text-primary)]">Data Backup & Export</h3>
        <p className="text-xs text-[var(--text-muted)]">
          Export your complete database to JSON for safe offline backup, or CSV for Excel/Sheets.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <IvyButton
            onClick={handleExportJson}
            variant="secondary"
            className="w-full justify-start gap-3 py-3"
          >
            <FileCode size={18} className="text-ivy-purple" />
            <div className="text-left">
              <span className="block text-xs font-bold text-[var(--text-primary)]">
                Export JSON Backup
              </span>
              <span className="block text-[10px] text-[var(--text-muted)]">
                Full snapshot with accounts & categories
              </span>
            </div>
          </IvyButton>

          <IvyButton
            onClick={handleExportCsv}
            variant="secondary"
            className="w-full justify-start gap-3 py-3"
          >
            <FileSpreadsheet size={18} className="text-ivy-green" />
            <div className="text-left">
              <span className="block text-xs font-bold text-[var(--text-primary)]">
                Export CSV Spreadsheet
              </span>
              <span className="block text-[10px] text-[var(--text-muted)]">
                Compatible with Excel & Google Sheets
              </span>
            </div>
          </IvyButton>
        </div>

        {/* Restore Section */}
        <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
          <label className="block text-xs font-bold text-[var(--text-primary)]">
            Restore Backup from JSON
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleImportJson}
            className="block w-full text-xs text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-ivy-purple file:text-white hover:file:bg-ivy-purple-light cursor-pointer"
          />
          {importStatus && (
            <p className="text-xs font-bold text-ivy-green mt-1">{importStatus}</p>
          )}
        </div>
      </IvyCard>
    </div>
  );
};
