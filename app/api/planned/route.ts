import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rules = await prisma.plannedPaymentRule.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      include: {
        account: true,
        category: true,
      },
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error("Failed to fetch planned payments:", error);
    return NextResponse.json({ error: "Failed to fetch planned payments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      startDate,
      intervalN,
      intervalType,
      oneTime,
      type,
      accountId,
      amount,
      categoryId,
      title,
      description,
    } = body;

    if (!accountId || amount === undefined || !type) {
      return NextResponse.json({ error: "accountId, amount, and type are required" }, { status: 400 });
    }

    const rule = await prisma.plannedPaymentRule.create({
      data: {
        startDate: startDate ? new Date(startDate) : new Date(),
        intervalN: intervalN ? parseInt(intervalN) : 1,
        intervalType: intervalType || "MONTH",
        oneTime: Boolean(oneTime),
        type: type || "EXPENSE",
        accountId,
        amount: Math.abs(parseFloat(amount)),
        categoryId: categoryId || null,
        title: title ? title.trim() : null,
        description: description ? description.trim() : null,
        isActive: true,
      },
      include: {
        account: true,
        category: true,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("Failed to create planned payment rule:", error);
    return NextResponse.json({ error: "Failed to create planned payment rule" }, { status: 500 });
  }
}
