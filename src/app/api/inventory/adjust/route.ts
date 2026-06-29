import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const adjustSchema = z.object({
  skuId: z.string(),
  locationId: z.string(),
  qty: z.number().int(),
  reason: z.string().min(1),
  notes: z.string().optional(),
  referenceId: z.string().optional(),
  referenceType: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { skuId, locationId, qty, reason, referenceId, referenceType } = parsed.data;

  const [adjustment] = await prisma.$transaction([
    prisma.inventoryAdjustment.create({
      data: {
        skuId,
        locationId,
        qty,
        reason,
        referenceId,
        referenceType,
        userId: (session.user as { id: string }).id,
      },
    }),
    prisma.inventoryLevel.upsert({
      where: { skuId_locationId: { skuId, locationId } },
      create: { skuId, locationId, qty: Math.max(0, qty), reservedQty: 0 },
      update: { qty: { increment: qty } },
    }),
  ]);

  return NextResponse.json(adjustment, { status: 201 });
}
