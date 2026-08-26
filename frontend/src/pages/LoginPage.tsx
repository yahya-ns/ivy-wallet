import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/authContext";
import { IvyButton } from "@/components/ui/IvyButton";
import {
  ShieldCheck,
  LogIn,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  UserCheck,
  Lock,
  Mail,
  User as UserIcon,
  HelpCircle,
  X,
} from "lucide-react";

export const LoginPage: React.FC = () => {
  const { user, authConfig, login, register, loginOIDC, devLogin, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdminHint, setShowAdminHint] = useState(true);

  // Read error param from URL
  const queryParams = new URLSearchParams(window.location.search);
  const urlError = queryParams.get("error");

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim()) {
      setErrorMsg("Please enter your email address");
      return;
    }
    if (!password) {
      setErrorMsg("Please enter your password");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        await register(email, name, password);
      } else {
        await login(email, password);
      }
      setLocation("/");
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevLogin = async (devEmail: string, devName: string) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await devLogin(devEmail, devName);
      setLocation("/");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to login test user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const prefillDefaultAdmin = () => {
    setEmail("admin@ivy.local");
    setPassword("admin123");
    setMode("signin");
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[var(--bg-main)] relative overflow-hidden select-none">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-ivy-purple/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-ivy-emerald/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative z-10 transition-all">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-ivy-purple via-ivy-purple/80 to-ivy-emerald p-0.5 shadow-lg shadow-ivy-purple/20 mb-3 flex items-center justify-center">
            <img
              src="/pwa-192x192.png"
              alt="Ivy Wallet"
              className="w-full h-full object-cover rounded-[14px]"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Ivy Wallet
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
            Personal Money Manager & Multi-User Expense Tracker
          </p>
        </div>

        {/* Default Admin Credential Hint Banner */}
        {showAdminHint && mode === "signin" && (
          <div className="mb-5 p-3 rounded-2xl bg-ivy-purple/10 border border-ivy-purple/30 flex items-center justify-between gap-2 text-xs text-ivy-purple animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <HelpCircle size={15} className="shrink-0" />
              <div className="truncate">
                <span>Default admin: </span>
                <button
                  type="button"
                  onClick={prefillDefaultAdmin}
                  className="font-bold underline hover:opacity-80 cursor-pointer"
                >
                  admin@ivy.local / admin123
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAdminHint(false)}
              className="p-1 hover:bg-ivy-purple/20 rounded-lg text-ivy-purple/80 hover:text-ivy-purple cursor-pointer shrink-0"
              title="Dismiss hint"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Error Alert if any */}
        {(urlError || errorMsg) && (
          <div className="mb-5 p-3.5 rounded-2xl bg-ivy-red/10 border border-ivy-red/30 flex items-start gap-3 text-xs text-ivy-red font-medium leading-relaxed animate-in fade-in">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg || decodeURIComponent(urlError || "")}</span>
          </div>
        )}

        {/* Sign In vs Create Account Tab Switcher */}
        {authConfig?.allowRegistration !== false && (
          <div className="flex p-1 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                mode === "signin"
                  ? "bg-ivy-purple text-white shadow-sm font-bold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                mode === "signup"
                  ? "bg-ivy-purple text-white shadow-sm font-bold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Primary Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <UserIcon
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Create a secure password (min 6 chars)" : "Enter your password"}
                required
                className="w-full pl-10 pr-10 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <IvyButton
            type="submit"
            size="lg"
            variant="primary"
            className="w-full mt-2"
            disabled={isSubmitting || isLoading}
          >
            {mode === "signup" ? (
              <>
                <UserPlus size={18} />
                <span>{isSubmitting ? "Creating Account..." : "Create Account"}</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>{isSubmitting ? "Signing in..." : "Sign In"}</span>
              </>
            )}
          </IvyButton>
        </form>

        {/* Optional OIDC SSO Provider Button */}
        {authConfig?.oidcEnabled && (
          <div className="mt-5 pt-5 border-t border-[var(--border-subtle)] space-y-3">
            <div className="relative flex items-center justify-center">
              <span className="bg-[var(--bg-surface)] px-3 text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] relative z-10">
                Or Continue With
              </span>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border-subtle)]" />
              </div>
            </div>

            <button
              onClick={loginOIDC}
              disabled={isLoading || isSubmitting}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-[var(--bg-main)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] hover:border-ivy-purple/50 text-[var(--text-primary)] font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <KeyRound size={16} className="text-ivy-purple stroke-[2.5]" />
              <span>{authConfig.oidcProviderName || "Single Sign-On (OIDC)"}</span>
            </button>
          </div>
        )}

        {/* Dev Quick Test User Switcher */}
        {authConfig?.devLoginEnabled && (
          <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] space-y-2">
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider text-center mb-1">
              Dev Mode • 1-Click Quick Login
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDevLogin("alice@family.local", "Alice")}
                className="p-2 rounded-xl bg-[var(--bg-main)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-2 cursor-pointer transition-all truncate"
              >
                <div className="w-5 h-5 rounded-full bg-ivy-emerald text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                  AL
                </div>
                <span className="truncate">Alice</span>
              </button>

              <button
                type="button"
                onClick={() => handleDevLogin("bob@business.local", "Bob")}
                className="p-2 rounded-xl bg-[var(--bg-main)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-2 cursor-pointer transition-all truncate"
              >
                <div className="w-5 h-5 rounded-full bg-ivy-orange text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                  BO
                </div>
                <span className="truncate">Bob</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-center gap-2 text-[11px] text-[var(--text-muted)] font-medium">
          <Lock size={13} className="text-ivy-emerald" />
          <span>Encrypted Session & Multi-User Data Isolation</span>
        </div>
      </div>
    </div>
  );
};
