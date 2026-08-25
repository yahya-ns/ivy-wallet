import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          theme: "DARK",
          currency: "USD",
          bufferAmount: 0.0,
          name: "My Ivy Wallet",
          firstDayOfWeek: 1,
          hideBalance: false,
        },
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          theme: body.theme || "DARK",
          currency: body.currency || "USD",
          bufferAmount: Number(body.bufferAmount) || 0.0,
          name: body.name || "My Ivy Wallet",
          firstDayOfWeek: Number(body.firstDayOfWeek) ?? 1,
          hideBalance: Boolean(body.hideBalance),
        },
      });
    } else {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          ...(body.theme !== undefined && { theme: body.theme }),
          ...(body.currency !== undefined && { currency: body.currency }),
          ...(body.bufferAmount !== undefined && { bufferAmount: Number(body.bufferAmount) }),
          ...(body.name !== undefined && { name: body.name }),
          ...(body.firstDayOfWeek !== undefined && { firstDayOfWeek: Number(body.firstDayOfWeek) }),
          ...(body.hideBalance !== undefined && { hideBalance: Boolean(body.hideBalance) }),
        },
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
