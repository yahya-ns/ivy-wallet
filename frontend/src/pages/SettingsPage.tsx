import React, { useState, useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/lib/authContext";
import { CURRENCY_LIST, DATE_FORMAT_OPTIONS, TIME_FORMAT_OPTIONS } from "@/lib/constants";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { ThemeMode } from "@/lib/types";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
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
  User as UserIcon,
  LogOut,
  KeyRound,
  Lock,
  AlertCircle,
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
    formatRelative,
  } = useTheme();

  const { user, authConfig, logout, changePassword } = useAuth();

  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    isInstallable,
    isInstalled,
    syncNow,
    installPwa,
  } = useNetworkStatus();

  const [walletName, setWalletName] = useState("My Ivy Wallet");
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Change Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [isChangingPw, setIsChangingPw] = useState(false);

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

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (!newPassword || newPassword.length < 6) {
      setPwError("New password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }

    setIsChangingPw(true);
    try {
      await changePassword(oldPassword, newPassword);
      setPwSuccess("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setShowPasswordForm(false), 2000);
    } catch (err: any) {
      setPwError(err.message || "Failed to update password");
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleManualSync = async () => {
    setSyncStatus("Connecting to Ivy Server and synchronizing deltas...");
    try {
      const success = await syncNow();
      if (success) {
        setSyncStatus("Sync completed successfully! Local database and cloud are in sync.");
      } else {
        setSyncStatus("Sync could not complete. Check network or server status.");
      }
    } catch {
      setSyncStatus("Sync failed unexpectedly.");
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

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
          Preferences & Settings
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
          Customize themes, multi-user accounts, currency, sync with mobile apps, and manage backups.
        </p>
      </div>

      {/* User Account & Session Card */}
      {user && (
        <IvyCard className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-ivy-purple/30 shadow-md"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-ivy-purple to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                  {initials}
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{user.name}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-ivy-purple/10 text-ivy-purple border border-ivy-purple/20">
                    <ShieldCheck size={12} />
                    {user.provider ? user.provider.toUpperCase() : "LOCAL"}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]">
                    Role: {user.role || "user"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {user.provider === "local" && (
                <IvyButton
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  variant="secondary"
                  size="sm"
                >
                  <KeyRound size={14} />
                  <span>{showPasswordForm ? "Cancel" : "Change Password"}</span>
                </IvyButton>
              )}

              <IvyButton
                onClick={logout}
                variant="danger"
                size="sm"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </IvyButton>
            </div>
          </div>

          {/* Change Password Collapsible Form */}
          {showPasswordForm && (
            <form onSubmit={handleChangePasswordSubmit} className="pt-4 mt-2 border-t border-[var(--border-subtle)] space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Update Account Password
              </h4>

              {pwError && (
                <div className="p-2.5 rounded-xl bg-ivy-red/10 border border-ivy-red/30 text-xs text-ivy-red font-medium flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{pwError}</span>
                </div>
              )}
              {pwSuccess && (
                <div className="p-2.5 rounded-xl bg-ivy-green/10 border border-ivy-green/30 text-xs text-ivy-green font-medium flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{pwSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                    className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <IvyButton type="submit" size="sm" variant="primary" disabled={isChangingPw}>
                  <Lock size={14} />
                  <span>{isChangingPw ? "Saving..." : "Update Password"}</span>
                </IvyButton>
              </div>
            </form>
          )}
        </IvyCard>
      )}

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
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Date & Time Formatting
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Choose your preferred date and time display conventions across transactions, reports, and history.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              <Calendar size={13} className="inline mr-1.5 text-ivy-purple" />
              Date Format
            </label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            >
              {DATE_FORMAT_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label} ({opt.example})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              <Clock size={13} className="inline mr-1.5 text-ivy-orange" />
              Time Format
            </label>
            <select
              value={timeFormat}
              onChange={(e) => setTimeFormat(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            >
              {TIME_FORMAT_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label} ({opt.example})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            Live Preview
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[var(--text-muted)] block text-[11px]">Formatted Date:</span>
              <span className="font-bold text-[var(--text-primary)]">{formatDate(new Date())}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block text-[11px]">Formatted Time:</span>
              <span className="font-bold text-[var(--text-primary)]">{formatTime(new Date())}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block text-[11px]">Complete Timestamp:</span>
              <span className="font-bold text-ivy-purple">{formatDateTime(new Date())}</span>
            </div>
          </div>
        </div>
      </IvyCard>

      {/* Cloud & PWA Offline Sync Engine Card */}
      <IvyCard className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Offline Sync Engine</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-ivy-purple/10 text-ivy-purple border border-ivy-purple/20">
                PWA Cloud Sync
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Automatic background bi-directional delta synchronization between your browser and Ivy backend.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isInstallable && (
              <IvyButton
                onClick={installPwa}
                variant="secondary"
                size="sm"
                className="shadow-sm font-bold border-ivy-emerald/40 text-ivy-emerald"
              >
                <Download size={14} />
                <span>Install PWA</span>
              </IvyButton>
            )}

            <IvyButton
              onClick={handleManualSync}
              variant="primary"
              size="sm"
              disabled={isSyncing}
              className="shadow-sm font-bold"
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
              <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
            </IvyButton>
          </div>
        </div>

        {/* Status Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-[var(--bg-surface-elevated)] p-3 rounded-xl border border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                Network Status
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  {isOnline ? "Online & Connected" : "Offline Mode"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-surface-elevated)] p-3 rounded-xl border border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                Offline Outbox
              </span>
              <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">
                {pendingCount > 0 ? (
                  <span className="text-amber-400 font-bold">{pendingCount} mutations pending</span>
                ) : (
                  <span className="text-emerald-400">All changes synced</span>
                )}
              </p>
            </div>
          </div>

          <div className="bg-[var(--bg-surface-elevated)] p-3 rounded-xl border border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                Last Cloud Sync
              </span>
              <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5 truncate">
                {lastSyncTime ? formatRelative(new Date(lastSyncTime)) : "Synced with local session"}
              </p>
            </div>
          </div>
        </div>

        {syncStatus && (
          <div className="p-3 bg-ivy-purple/10 border border-ivy-purple/30 text-ivy-purple rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{syncStatus}</span>
          </div>
        )}

        <div className="text-xs text-[var(--text-muted)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]">
          <span>Storage Engine: <strong>IndexedDB (idb)</strong> + Service Worker Cache</span>
          <span>App State: <strong>{isInstalled ? "Installed (Standalone PWA)" : "Web App (Installable)"}</strong></span>
        </div>
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
