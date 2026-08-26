import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { TransactionModal } from "@/components/transaction/TransactionModal";
import { Account, Category } from "@/lib/types";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchMetadata = async () => {
    try {
      const [accRes, catRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/categories"),
      ]);
      if (accRes.ok) setAccounts(await accRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch {}
  };

  useEffect(() => {
    fetchMetadata();
    const handleUpdate = () => fetchMetadata();
    window.addEventListener("ivy-data-updated", handleUpdate);
    return () => window.removeEventListener("ivy-data-updated", handleUpdate);
  }, []);

  const handleSuccess = () => {
    window.dispatchEvent(new CustomEvent("ivy-data-updated"));
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        <Header onQuickAdd={() => setIsQuickAddOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20 md:pb-12">
          {children}
        </main>

        {/* Mobile Bottom Bar */}
        <BottomNav
          onQuickAdd={() => setIsQuickAddOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />
      </div>

      {/* Mobile Slide-out Drawer */}
      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onQuickAdd={() => setIsQuickAddOpen(true)}
      />

      {/* Global Quick Add Transaction Modal */}
      <TransactionModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={handleSuccess}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
};
