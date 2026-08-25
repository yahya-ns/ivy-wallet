import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, currency, color, icon, includeInBalance, orderNum } = body;

    const updated = await prisma.account.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(currency && { currency }),
        ...(color && { color }),
        ...(icon && { icon }),
        ...(includeInBalance !== undefined && { includeInBalance: Boolean(includeInBalance) }),
        ...(orderNum !== undefined && { orderNum: Number(orderNum) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update account:", error);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await prisma.account.update({
      where: { id },
      data: { isDeleted: true },
    });
    return NextResponse.json(deleted);
  } catch (error) {
    console.error("Failed to delete account:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
