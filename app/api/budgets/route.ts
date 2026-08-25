import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET() {
  try {
    const budgets = await prisma.budget.findMany({
      orderBy: { orderId: "asc" },
    });

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const budgetsWithProgress = await Promise.all(
      budgets.map(async (budget: any) => {
        let categoryIdList: string[] = [];
        if (budget.categoryIds) {
          try {
            categoryIdList = JSON.parse(budget.categoryIds);
          } catch {
            categoryIdList = budget.categoryIds.split(",").map((s: string) => s.trim());
          }
        }

        const whereCondition: any = {
          isDeleted: false,
          type: "EXPENSE",
          dateTime: {
            gte: monthStart,
            lte: monthEnd,
          },
        };

        if (categoryIdList.length > 0) {
          whereCondition.categoryId = { in: categoryIdList };
        }

        const expenseTx = await prisma.transaction.aggregate({
          where: whereCondition,
          _sum: { amount: true },
        });

        const spent = expenseTx._sum.amount || 0;
        const remaining = Math.max(0, budget.amount - spent);
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

        return {
          id: budget.id,
          name: budget.name,
          amount: budget.amount,
          categoryIds: budget.categoryIds,
          accountIds: budget.accountIds,
          orderId: budget.orderId,
          period: budget.period,
          spent,
          remaining,
          percentage: Number(percentage.toFixed(1)),
          createdAt: budget.createdAt,
          updatedAt: budget.updatedAt,
        };
      })
    );

    return NextResponse.json(budgetsWithProgress);
  } catch (error) {
    console.error("Failed to fetch budgets:", error);
    return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, amount, categoryIds, accountIds, period } = body;

    if (!name || amount === undefined) {
      return NextResponse.json({ error: "Budget name and amount are required" }, { status: 400 });
    }

    const count = await prisma.budget.count();

    const budget = await prisma.budget.create({
      data: {
        name: name.trim(),
        amount: Math.abs(parseFloat(amount)),
        categoryIds: categoryIds ? (typeof categoryIds === "string" ? categoryIds : JSON.stringify(categoryIds)) : null,
        accountIds: accountIds ? (typeof accountIds === "string" ? accountIds : JSON.stringify(accountIds)) : null,
        period: period || "MONTHLY",
        orderId: count + 1,
      },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("Failed to create budget:", error);
    return NextResponse.json({ error: "Failed to create budget" }, { status: 500 });
  }
}
