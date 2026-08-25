import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, amount, categoryIds, accountIds, period, orderId } = body;

    const updated = await prisma.budget.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(amount !== undefined && { amount: Math.abs(parseFloat(amount)) }),
        ...(categoryIds !== undefined && {
          categoryIds: typeof categoryIds === "string" ? categoryIds : JSON.stringify(categoryIds),
        }),
        ...(accountIds !== undefined && {
          accountIds: typeof accountIds === "string" ? accountIds : JSON.stringify(accountIds),
        }),
        ...(period && { period }),
        ...(orderId !== undefined && { orderId: Number(orderId) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update budget:", error);
    return NextResponse.json({ error: "Failed to update budget" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete budget:", error);
    return NextResponse.json({ error: "Failed to delete budget" }, { status: 500 });
  }
}
