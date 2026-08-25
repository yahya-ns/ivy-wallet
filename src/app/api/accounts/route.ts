import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      where: { isDeleted: false },
      orderBy: { orderNum: "asc" },
      include: {
        transactions: {
          where: { isDeleted: false },
          select: { type: true, amount: true },
        },
        toTransactions: {
          where: { isDeleted: false },
          select: { type: true, toAmount: true, amount: true },
        },
      },
    });

    const accountsWithBalances = accounts.map((account: any) => {
      let balance = 0;
      let totalIncome = 0;
      let totalExpense = 0;

      account.transactions.forEach((tx: any) => {
        if (tx.type === "INCOME") {
          balance += tx.amount;
          totalIncome += tx.amount;
        } else if (tx.type === "EXPENSE") {
          balance -= tx.amount;
          totalExpense += tx.amount;
        } else if (tx.type === "TRANSFER") {
          balance -= tx.amount;
        }
      });

      account.toTransactions.forEach((tx: any) => {
        if (tx.type === "TRANSFER") {
          const transferIn = tx.toAmount ?? tx.amount;
          balance += transferIn;
        }
      });

      return {
        id: account.id,
        name: account.name,
        currency: account.currency || "USD",
        color: account.color,
        icon: account.icon,
        orderNum: account.orderNum,
        includeInBalance: account.includeInBalance,
        isDeleted: account.isDeleted,
        balance,
        totalIncome,
        totalExpense,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      };
    });

    return NextResponse.json(accountsWithBalances);
  } catch (error) {
    console.error("Failed to fetch accounts:", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, currency, color, icon, includeInBalance, initialBalance } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Account name is required" }, { status: 400 });
    }

    const count = await prisma.account.count({ where: { isDeleted: false } });

    const account = await prisma.account.create({
      data: {
        name: name.trim(),
        currency: currency || "USD",
        color: color || "#5C3DF5",
        icon: icon || "wallet",
        includeInBalance: includeInBalance ?? true,
        orderNum: count + 1,
      },
    });

    // If user provided an initial balance, create an initial transaction
    if (initialBalance && Number(initialBalance) !== 0) {
      const amount = Number(initialBalance);
      await prisma.transaction.create({
        data: {
          accountId: account.id,
          type: amount > 0 ? "INCOME" : "EXPENSE",
          amount: Math.abs(amount),
          title: "Initial Balance",
          dateTime: new Date(),
        },
      });
    }

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Failed to create account:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
