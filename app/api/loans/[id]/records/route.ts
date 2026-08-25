import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const body = await request.json();
    const { amount, dateTime, note, accountId, createTransaction } = body;

    if (amount === undefined) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    const parsedAmount = Math.abs(parseFloat(amount));

    let createdTxId: string | null = null;
    if (createTransaction && accountId) {
      const tx = await prisma.transaction.create({
        data: {
          accountId,
          type: loan.type === "BORROW" ? "EXPENSE" : "INCOME",
          amount: parsedAmount,
          title: loan.type === "BORROW" ? `Repayment to ${loan.name}` : `Repayment from ${loan.name}`,
          description: note || null,
          dateTime: dateTime ? new Date(dateTime) : new Date(),
          loanId: loan.id,
        },
      });
      createdTxId = tx.id;
    }

    const record = await prisma.loanRecord.create({
      data: {
        loanId,
        amount: parsedAmount,
        dateTime: dateTime ? new Date(dateTime) : new Date(),
        note: note ? note.trim() : null,
        accountId: accountId || null,
        transactionId: createdTxId,
      },
    });

    // Check if fully paid
    const allRecords = await prisma.loanRecord.findMany({ where: { loanId } });
    const totalPaid = allRecords.reduce((sum: number, r: { amount: number }) => sum + r.amount, 0);
    if (totalPaid >= loan.amount) {
      await prisma.loan.update({
        where: { id: loanId },
        data: { isPaid: true },
      });
    }

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Failed to add loan record:", error);
    return NextResponse.json({ error: "Failed to add loan record" }, { status: 500 });
  }
}
