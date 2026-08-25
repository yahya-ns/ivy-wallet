import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const loans = await prisma.loan.findMany({
      where: { isDeleted: false },
      orderBy: { dateTime: "desc" },
      include: {
        account: true,
        records: {
          orderBy: { dateTime: "desc" },
          include: { account: true },
        },
      },
    });

    const loansWithStats = loans.map((loan: any) => {
      const paidAmount = loan.records.reduce((sum: number, r: { amount: number }) => sum + r.amount, 0);
      const remainingAmount = Math.max(0, loan.amount - paidAmount);
      const isFullyPaid = remainingAmount <= 0.001;

      return {
        ...loan,
        paidAmount,
        remainingAmount,
        isPaid: loan.isPaid || isFullyPaid,
      };
    });

    return NextResponse.json(loansWithStats);
  } catch (error) {
    console.error("Failed to fetch loans:", error);
    return NextResponse.json({ error: "Failed to fetch loans" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, amount, type, color, icon, accountId, note, dateTime, dueDate, createTransaction } = body;

    if (!name || amount === undefined || !type) {
      return NextResponse.json({ error: "Name, amount, and type are required" }, { status: 400 });
    }

    const parsedAmount = Math.abs(parseFloat(amount));

    const loan = await prisma.loan.create({
      data: {
        name: name.trim(),
        amount: parsedAmount,
        type, // BORROW | LEND
        color: color || (type === "BORROW" ? "#F53D3D" : "#12B880"),
        icon: icon || "hand-coins",
        accountId: accountId || null,
        note: note ? note.trim() : null,
        dateTime: dateTime ? new Date(dateTime) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    // If createTransaction is true and account is selected, create corresponding transaction
    if (createTransaction && accountId) {
      await prisma.transaction.create({
        data: {
          accountId,
          type: type === "BORROW" ? "INCOME" : "EXPENSE",
          amount: parsedAmount,
          title: type === "BORROW" ? `Borrowed from ${name}` : `Lent to ${name}`,
          description: note || null,
          dateTime: dateTime ? new Date(dateTime) : new Date(),
          loanId: loan.id,
        },
      });
    }

    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    console.error("Failed to create loan:", error);
    return NextResponse.json({ error: "Failed to create loan" }, { status: 500 });
  }
}
