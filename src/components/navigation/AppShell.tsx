"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { TransactionModal } from "@/components/transaction/TransactionModal";
import { AccountModal } from "@/components/account/AccountModal";
import { Account, Category, Transaction, TransactionType } from "@/lib/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const loadBaseData = async () => {
    try {
      const [accRes, catRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/categories"),
      ]);
      if (accRes.ok) setAccounts(await accRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (e) {
      console.error("Failed to load base data in AppShell:", e);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  const handleOpenAddTx = (type?: TransactionType) => {
    setSelectedTx(null);
    setIsTxModalOpen(true);
  };

  const handleTxSuccess = () => {
    loadBaseData();
    // Dispatch custom event for child pages to refresh
    window.dispatchEvent(new CustomEvent("ivy-data-updated"));
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)]">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenAddModal={() => handleOpenAddTx()} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto safe-pb">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav onOpenAddModal={() => handleOpenAddTx()} />

      {/* Global Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={handleTxSuccess}
        initialTransaction={selectedTx}
        accounts={accounts}
        categories={categories}
      />

      {/* Global Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSuccess={handleTxSuccess}
      />
    </div>
  );
}
