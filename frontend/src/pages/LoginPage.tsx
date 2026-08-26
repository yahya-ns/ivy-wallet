import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/authContext";
import { IvyButton } from "@/components/ui/IvyButton";
import {
  ShieldCheck,
  LogIn,
  KeyRound,
  Sparkles,
  AlertCircle,
  UserCheck,
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon,
} from "lucide-react";

export const LoginPage: React.FC = () => {
  const { user, authConfig, loginOIDC, loginLocal, devLogin, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<"sso" | "local" | "dev">("sso");
  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read error param from URL
  const queryParams = new URLSearchParams(window.location.search);
  const urlError = queryParams.get("error");

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setLocalError("Please enter your email address");
      return;
    }
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await loginLocal(email);
      setLocation("/");
    } catch (err: any) {
      setLocalError(err.message || "Failed to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevLogin = async (devEmail: string, devName: string) => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await devLogin(devEmail, devName);
      setLocation("/");
    } catch (err: any) {
      setLocalError(err.message || "Failed to login test user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[var(--bg-main)] relative overflow-hidden select-none">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-ivy-purple/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-ivy-emerald/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative z-10 transition-all">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-7">
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
            Multi-User Personal Money Management & OpenID Connect
          </p>
        </div>

        {/* Error Alert if any */}
        {(urlError || localError) && (
          <div className="mb-6 p-3.5 rounded-2xl bg-ivy-red/10 border border-ivy-red/30 flex items-start gap-3 text-xs text-ivy-red font-medium leading-relaxed animate-in fade-in">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{localError || decodeURIComponent(urlError || "")}</span>
          </div>
        )}

        {/* Tab Switcher if multiple auth options are available */}
        {(authConfig?.localAuthEnabled || authConfig?.devLoginEnabled) && authConfig?.oidcEnabled && (
          <div className="flex p-1 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] mb-6 text-xs font-semibold">
            {authConfig.oidcEnabled && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab("sso");
                  setLocalError(null);
                }}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  activeTab === "sso"
                    ? "bg-ivy-purple text-white shadow-sm font-bold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                OIDC / SSO
              </button>
            )}
            {authConfig?.localAuthEnabled && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab("local");
                  setLocalError(null);
                }}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  activeTab === "local"
                    ? "bg-ivy-purple text-white shadow-sm font-bold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                Local Account
              </button>
            )}
            {authConfig?.devLoginEnabled && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab("dev");
                  setLocalError(null);
                }}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  activeTab === "dev"
                    ? "bg-ivy-purple text-white shadow-sm font-bold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                Test Users
              </button>
            )}
          </div>
        )}

        {/* 1. OIDC SSO Tab */}
        {activeTab === "sso" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-center">
              <div className="w-10 h-10 rounded-full bg-ivy-purple/10 text-ivy-purple mx-auto mb-2 flex items-center justify-center">
                <ShieldCheck size={22} />
              </div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Single Sign-On (SSO)
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Sign in securely with your Identity Provider (Keycloak, Authentik, Authelia, Google OIDC)
              </p>
            </div>

            <button
              onClick={loginOIDC}
              disabled={isLoading || isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-ivy-purple to-indigo-600 hover:from-ivy-purple-hover hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-ivy-purple/25 transition-all transform active:scale-[0.98] cursor-pointer"
            >
              <KeyRound size={18} className="stroke-[2.5]" />
              <span>Sign in with {authConfig?.oidcProviderName || "OIDC / SSO"}</span>
              <ArrowRight size={16} className="ml-auto opacity-75" />
            </button>
          </div>
        )}

        {/* 2. Local Account Sign In */}
        {activeTab === "local" && (
          <form onSubmit={handleLocalSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
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
                  className="w-full pl-10 pr-4 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple transition-all"
                />
              </div>
            </div>

            <IvyButton
              type="submit"
              size="lg"
              variant="primary"
              className="w-full"
              disabled={isSubmitting || isLoading}
            >
              <LogIn size={18} />
              <span>{isSubmitting ? "Signing in..." : "Continue to Workspace"}</span>
            </IvyButton>
          </form>
        )}

        {/* 3. Dev Quick User Switcher */}
        {activeTab === "dev" && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)] font-medium text-center mb-2">
              Select a demo profile to test isolated multi-user workspaces:
            </p>

            <button
              onClick={() => handleDevLogin("admin@ivy.local", "Default Admin")}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-main)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] hover:border-ivy-purple/50 transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-ivy-purple text-white flex items-center justify-center font-bold text-xs">
                  DA
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Default Admin
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)]">admin@ivy.local</p>
                </div>
              </div>
              <UserCheck size={16} className="text-ivy-purple" />
            </button>

            <button
              onClick={() => handleDevLogin("alice@family.local", "Alice (Personal)")}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-main)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] hover:border-ivy-purple/50 transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-ivy-emerald text-white flex items-center justify-center font-bold text-xs">
                  AL
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Alice (Personal)
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)]">alice@family.local</p>
                </div>
              </div>
              <Sparkles size={16} className="text-ivy-emerald" />
            </button>

            <button
              onClick={() => handleDevLogin("bob@business.local", "Bob (Business)")}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-main)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] hover:border-ivy-purple/50 transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-ivy-orange text-white flex items-center justify-center font-bold text-xs">
                  BO
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Bob (Business)
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)]">bob@business.local</p>
                </div>
              </div>
              <UserIcon size={16} className="text-ivy-orange" />
            </button>
          </div>
        )}

        {/* Security badge footer */}
        <div className="mt-8 pt-5 border-t border-[var(--border-subtle)] flex items-center justify-center gap-2 text-[11px] text-[var(--text-muted)] font-medium">
          <Lock size={13} className="text-ivy-emerald" />
          <span>Encrypted Session & Isolated Multi-Tenant Storage</span>
        </div>
      </div>
    </div>
  );
};
