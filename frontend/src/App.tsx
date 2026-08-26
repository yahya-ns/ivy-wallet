import React from "react";
import { Route, Switch, useLocation } from "wouter";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider, useAuth } from "@/lib/authContext";
import { AppShell } from "@/components/navigation/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { AccountsPage } from "@/pages/AccountsPage";
import { AccountDetailPage } from "@/pages/AccountDetailPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { CategoryDetailPage } from "@/pages/CategoryDetailPage";
import { TagDetailPage } from "@/pages/TagDetailPage";
import { BudgetsPage } from "@/pages/BudgetsPage";
import { LoansPage } from "@/pages/LoansPage";
import { PlannedPage } from "@/pages/PlannedPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { SettingsPage } from "@/pages/SettingsPage";

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading, authConfig } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--bg-main)] p-4 select-none">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-ivy-purple to-indigo-600 p-0.5 shadow-xl shadow-ivy-purple/30 animate-bounce mb-3 flex items-center justify-center">
          <img
            src="/pwa-192x192.png"
            alt="Ivy Wallet Logo"
            className="w-full h-full object-cover rounded-[14px]"
          />
        </div>
        <p className="text-xs font-bold text-[var(--text-muted)] animate-pulse">
          Loading your workspace...
        </p>
      </div>
    );
  }

  // If on login route or unauthenticated, show LoginPage
  if (location === "/login" || (authConfig?.authEnabled && !isAuthenticated)) {
    return <LoginPage />;
  }

  return (
    <AppShell>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/transactions" component={TransactionsPage} />
        <Route path="/accounts" component={AccountsPage} />
        <Route path="/accounts/:id" component={AccountDetailPage} />
        <Route path="/categories" component={CategoriesPage} />
        <Route path="/categories/:id" component={CategoryDetailPage} />
        <Route path="/tags/:id" component={TagDetailPage} />
        <Route path="/budgets" component={BudgetsPage} />
        <Route path="/loans" component={LoansPage} />
        <Route path="/planned" component={PlannedPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/settings" component={SettingsPage} />
        {/* Fallback route */}
        <Route component={DashboardPage} />
      </Switch>
    </AppShell>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
