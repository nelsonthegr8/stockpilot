export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const auditSchema = z.object({
  skuId: z.string(),
  locationId: z.string(),
  actualQty: z.number().int(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = auditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { skuId, locationId, actualQty, notes } = parsed.data;
  const safeQty = Math.max(0, actualQty);

  const current = await prisma.inventoryLevel.findUnique({
    where: { skuId_locationId: { skuId, locationId } },
  });

  const delta = safeQty - (current?.qty ?? 0);

  await prisma.$transaction(async (tx) => {
    // Always record the audit adjustment for traceability
    await tx.inventoryAdjustment.create({
      data: {
        skuId,
        locationId,
        qty: delta,
        reason: "PHYSICAL_COUNT",
        referenceId: notes ?? `Audit: set to ${safeQty}`,
        userId: (session.user as { id: string }).id,
      },
    });

    if (safeQty <= 0) {
      // Remove the record entirely — no stock exists
      if (current) {
        await tx.inventoryLevel.delete({
          where: { skuId_locationId: { skuId, locationId } },
        });
      }
    } else {
      await tx.inventoryLevel.upsert({
        where: { skuId_locationId: { skuId, locationId } },
        create: { skuId, locationId, qty: safeQty, reservedQty: 0 },
        update: { qty: safeQty },
      });
    }
  });

  return NextResponse.json({ ok: true, safeQty, delta });
}
