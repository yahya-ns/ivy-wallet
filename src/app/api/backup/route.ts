import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    const [accounts, categories, transactions, budgets, loans, settings] = await Promise.all([
      prisma.account.findMany({ where: { isDeleted: false } }),
      prisma.category.findMany({ where: { isDeleted: false } }),
      prisma.transaction.findMany({ where: { isDeleted: false }, orderBy: { dateTime: "desc" } }),
      prisma.budget.findMany(),
      prisma.loan.findMany({ where: { isDeleted: false }, include: { records: true } }),
      prisma.settings.findFirst(),
    ]);

    if (format === "csv") {
      // Export transactions as CSV
      const headers = ["ID", "Date", "Type", "Amount", "Account", "Category", "Title", "Description"];
      const accountMap = new Map(accounts.map((a: any) => [a.id, a.name]));
      const categoryMap = new Map(categories.map((c: any) => [c.id, c.name]));

      const rows = transactions.map((t: any) => [
        `"${t.id}"`,
        `"${new Date(t.dateTime).toISOString()}"`,
        `"${t.type}"`,
        t.amount,
        `"${accountMap.get(t.accountId) || t.accountId}"`,
        `"${t.categoryId ? categoryMap.get(t.categoryId) || "" : ""}"`,
        `"${(t.title || "").replace(/"/g, '""')}"`,
        `"${(t.description || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ivy_wallet_transactions_${Date.now()}.csv"`,
        },
      });
    }

    const backupData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      accounts,
      categories,
      transactions,
      budgets,
      loans,
      settings,
    };

    return new Response(JSON.stringify(backupData, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="ivy_wallet_backup_${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error("Backup export failed:", error);
    return NextResponse.json({ error: "Failed to generate backup" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (!data || (!data.accounts && !data.transactions && !data.categories)) {
      return NextResponse.json({ error: "Invalid backup data format" }, { status: 400 });
    }

    let importedAccounts = 0;
    let importedCategories = 0;
    let importedTransactions = 0;

    // 1. Import or sync categories
    if (Array.isArray(data.categories)) {
      for (const cat of data.categories) {
        if (cat.name) {
          const existing = await prisma.category.findFirst({ where: { name: cat.name } });
          if (!existing) {
            await prisma.category.create({
              data: {
                name: cat.name,
                color: cat.color || "#12B880",
                icon: cat.icon || "tag",
                orderNum: cat.orderNum || 0,
              },
            });
            importedCategories++;
          }
        }
      }
    }

    // 2. Import accounts
    if (Array.isArray(data.accounts)) {
      for (const acc of data.accounts) {
        if (acc.name) {
          const existing = await prisma.account.findFirst({ where: { name: acc.name } });
          if (!existing) {
            await prisma.account.create({
              data: {
                name: acc.name,
                currency: acc.currency || "USD",
                color: acc.color || "#5C3DF5",
                icon: acc.icon || "wallet",
                orderNum: acc.orderNum || 0,
                includeInBalance: acc.includeInBalance ?? true,
              },
            });
            importedAccounts++;
          }
        }
      }
    }

    // 3. Import transactions
    if (Array.isArray(data.transactions)) {
      const allAccounts = await prisma.account.findMany();
      const allCategories = await prisma.category.findMany();
      const defaultAccount = allAccounts[0];

      for (const tx of data.transactions) {
        if (tx.amount && tx.type) {
          // Find matching account or fallback to first account
          const targetAccountId =
            allAccounts.find((a) => a.id === tx.accountId || a.name === tx.accountName)?.id ||
            defaultAccount?.id;

          if (targetAccountId) {
            const targetCatId = tx.categoryId
              ? allCategories.find((c) => c.id === tx.categoryId || c.name === tx.categoryName)?.id
              : null;

            await prisma.transaction.create({
              data: {
                accountId: targetAccountId,
                type: tx.type,
                amount: Math.abs(parseFloat(tx.amount)),
                title: tx.title || null,
                description: tx.description || null,
                dateTime: tx.dateTime ? new Date(tx.dateTime) : new Date(),
                categoryId: targetCatId,
              },
            });
            importedTransactions++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${importedAccounts} accounts, ${importedCategories} categories, and ${importedTransactions} transactions.`,
    });
  } catch (error) {
    console.error("Backup import failed:", error);
    return NextResponse.json({ error: "Failed to import backup data" }, { status: 500 });
  }
}
