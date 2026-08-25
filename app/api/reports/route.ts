import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthsBack = parseInt(searchParams.get("months") || "6");
    const accountId = searchParams.get("accountId");

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    // 1. Current Month Category Breakdown (Expenses)
    const categoryWhere: any = {
      isDeleted: false,
      type: "EXPENSE",
      dateTime: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
    };

    if (accountId) {
      categoryWhere.accountId = accountId;
    }

    const currentMonthExpenses = await prisma.transaction.findMany({
      where: categoryWhere,
      include: {
        category: true,
      },
    });

    const categoryMap: Record<
      string,
      { id: string; name: string; color: string; icon: string | null; amount: number }
    > = {};

    let totalMonthExpense = 0;
    currentMonthExpenses.forEach((tx: any) => {
      totalMonthExpense += tx.amount;
      const catId = tx.categoryId || "uncategorized";
      const catName = tx.category?.name || "Uncategorized";
      const catColor = tx.category?.color || "#74747A";
      const catIcon = tx.category?.icon || "circle-dot";

      if (!categoryMap[catId]) {
        categoryMap[catId] = {
          id: catId,
          name: catName,
          color: catColor,
          icon: catIcon,
          amount: 0,
        };
      }
      categoryMap[catId].amount += tx.amount;
    });

    const categoryBreakdown = Object.values(categoryMap)
      .map((cat: any) => ({
        ...cat,
        percentage: totalMonthExpense > 0 ? Number(((cat.amount / totalMonthExpense) * 100).toFixed(1)) : 0,
      }))
      .sort((a: any, b: any) => b.amount - a.amount);

    // 2. Multi-Month Trend (Cashflow: Income vs Expense)
    const monthlyTrends = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, "MMM yyyy");

      const baseTxWhere: any = {
        isDeleted: false,
        dateTime: { gte: mStart, lte: mEnd },
      };

      if (accountId) {
        baseTxWhere.accountId = accountId;
      }

      const [incomeSum, expenseSum] = await Promise.all([
        prisma.transaction.aggregate({
          where: { ...baseTxWhere, type: "INCOME" },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { ...baseTxWhere, type: "EXPENSE" },
          _sum: { amount: true },
        }),
      ]);

      const income = incomeSum._sum.amount || 0;
      const expense = expenseSum._sum.amount || 0;
      const net = income - expense;

      monthlyTrends.push({
        month: monthLabel,
        income,
        expense,
        net,
      });
    }

    // 3. Current Month Totals
    const currentMonthIncomeAggr = await prisma.transaction.aggregate({
      where: {
        isDeleted: false,
        type: "INCOME",
        dateTime: { gte: currentMonthStart, lte: currentMonthEnd },
        ...(accountId && { accountId }),
      },
      _sum: { amount: true },
    });

    const totalMonthIncome = currentMonthIncomeAggr._sum.amount || 0;
    const netSavings = totalMonthIncome - totalMonthExpense;
    const savingsRate =
      totalMonthIncome > 0 ? Number(((netSavings / totalMonthIncome) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      totalMonthIncome,
      totalMonthExpense,
      netSavings,
      savingsRate,
      categoryBreakdown,
      monthlyTrends,
    });
  } catch (error) {
    console.error("Failed to generate report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
