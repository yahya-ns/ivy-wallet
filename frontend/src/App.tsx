import React from "react";
import { Route, Switch } from "wouter";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppShell } from "@/components/navigation/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { AccountsPage } from "@/pages/AccountsPage";
import { AccountDetailPage } from "@/pages/AccountDetailPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { BudgetsPage } from "@/pages/BudgetsPage";
import { LoansPage } from "@/pages/LoansPage";
import { PlannedPage } from "@/pages/PlannedPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  return (
    <ThemeProvider>
      <AppShell>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/transactions" component={TransactionsPage} />
          <Route path="/accounts" component={AccountsPage} />
          <Route path="/accounts/:id" component={AccountDetailPage} />
          <Route path="/categories" component={CategoriesPage} />
          <Route path="/budgets" component={BudgetsPage} />
          <Route path="/loans" component={LoansPage} />
          <Route path="/planned" component={PlannedPage} />
          <Route path="/reports" component={ReportsPage} />
          <Route path="/settings" component={SettingsPage} />
          {/* Fallback route */}
          <Route component={DashboardPage} />
        </Switch>
      </AppShell>
    </ThemeProvider>
  );
}
