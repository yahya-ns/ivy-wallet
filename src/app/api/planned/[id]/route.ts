import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      isActive,
    } = body;

    const updated = await prisma.plannedPaymentRule.update({
      where: { id },
      data: {
        ...(startDate && { startDate: new Date(startDate) }),
        ...(intervalN !== undefined && { intervalN: parseInt(intervalN) }),
        ...(intervalType && { intervalType }),
        ...(oneTime !== undefined && { oneTime: Boolean(oneTime) }),
        ...(type && { type }),
        ...(accountId && { accountId }),
        ...(amount !== undefined && { amount: Math.abs(parseFloat(amount)) }),
        ...(categoryId !== undefined && { categoryId }),
        ...(title !== undefined && { title: title ? title.trim() : null }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
      include: {
        account: true,
        category: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update planned payment:", error);
    return NextResponse.json({ error: "Failed to update planned payment" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await prisma.plannedPaymentRule.update({
      where: { id },
      data: { isDeleted: true },
    });
    return NextResponse.json(deleted);
  } catch (error) {
    console.error("Failed to delete planned payment:", error);
    return NextResponse.json({ error: "Failed to delete planned payment" }, { status: 500 });
  }
}
