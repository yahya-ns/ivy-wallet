import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        account: true,
        toAccount: true,
        category: true,
      },
    });

    if (!transaction || transaction.isDeleted) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Failed to fetch transaction:", error);
    return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    } = body;

    const parsedAmount = amount !== undefined ? Math.abs(parseFloat(amount)) : undefined;

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(accountId && { accountId }),
        ...(type && { type }),
        ...(parsedAmount !== undefined && { amount: parsedAmount }),
        ...(toAccountId !== undefined && { toAccountId: type === "TRANSFER" ? toAccountId : null }),
        ...(toAmount !== undefined && { toAmount: type === "TRANSFER" ? Math.abs(parseFloat(toAmount)) : null }),
        ...(title !== undefined && { title: title ? title.trim() : null }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
        ...(dateTime && { dateTime: new Date(dateTime) }),
        ...(categoryId !== undefined && { categoryId: type !== "TRANSFER" ? categoryId : null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
      include: {
        account: true,
        toAccount: true,
        category: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update transaction:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await prisma.transaction.update({
      where: { id },
      data: { isDeleted: true },
    });
    return NextResponse.json(deleted);
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
