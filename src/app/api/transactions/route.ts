import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const categoryId = searchParams.get("categoryId");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

    const where: any = {
      isDeleted: false,
    };

    if (accountId) {
      where.OR = [
        { accountId },
        { toAccountId: accountId },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (type && ["EXPENSE", "INCOME", "TRANSFER"].includes(type)) {
      where.type = type;
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
          ],
        },
      ];
    }

    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) {
        where.dateTime.gte = new Date(startDate);
      }
      if (endDate) {
        where.dateTime.lte = new Date(endDate);
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { dateTime: "desc" },
      include: {
        account: {
          select: { id: true, name: true, currency: true, color: true, icon: true },
        },
        toAccount: {
          select: { id: true, name: true, currency: true, color: true, icon: true },
        },
        category: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      accountId,
      type,
      amount,
      toAccountId,
      toAmount,
      title,
      description,
      dateTime,
      categoryId,
      dueDate,
      recurringRuleId,
      loanId,
      loanRecordId,
    } = body;

    if (!accountId || !type || amount === undefined) {
      return NextResponse.json(
        { error: "accountId, type, and amount are required" },
        { status: 400 }
      );
    }

    if (type === "TRANSFER" && !toAccountId) {
      return NextResponse.json(
        { error: "toAccountId is required for TRANSFER type" },
        { status: 400 }
      );
    }

    const parsedAmount = Math.abs(parseFloat(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId,
        type,
        amount: parsedAmount,
        toAccountId: type === "TRANSFER" ? toAccountId : null,
        toAmount: type === "TRANSFER" ? (toAmount ? Math.abs(parseFloat(toAmount)) : parsedAmount) : null,
        title: title ? title.trim() : null,
        description: description ? description.trim() : null,
        dateTime: dateTime ? new Date(dateTime) : new Date(),
        categoryId: type !== "TRANSFER" ? categoryId : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        recurringRuleId: recurringRuleId || null,
        loanId: loanId || null,
        loanRecordId: loanRecordId || null,
      },
      include: {
        account: true,
        toAccount: true,
        category: true,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
