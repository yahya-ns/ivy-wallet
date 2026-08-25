import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, amount, type, color, icon, accountId, note, dueDate, isPaid } = body;

    const updated = await prisma.loan.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(amount !== undefined && { amount: Math.abs(parseFloat(amount)) }),
        ...(type && { type }),
        ...(color && { color }),
        ...(icon && { icon }),
        ...(accountId !== undefined && { accountId }),
        ...(note !== undefined && { note: note ? note.trim() : null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(isPaid !== undefined && { isPaid: Boolean(isPaid) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update loan:", error);
    return NextResponse.json({ error: "Failed to update loan" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await prisma.loan.update({
      where: { id },
      data: { isDeleted: true },
    });
    return NextResponse.json(deleted);
  } catch (error) {
    console.error("Failed to delete loan:", error);
    return NextResponse.json({ error: "Failed to delete loan" }, { status: 500 });
  }
}
