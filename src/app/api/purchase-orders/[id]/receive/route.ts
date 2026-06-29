import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const receiveSchema = z.object({
  items: z.array(
    z.object({
      poItemId: z.string(),
      qtyReceived: z.number().int().positive(),
    }),
  ),
  locationId: z.string(),
  landedCost: z.number().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = receiveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: params.id },
    include: { items: true },
  });

  for (const recv of parsed.data.items) {
    const poItem = po.items.find((item) => item.id === recv.poItemId);
    if (!poItem) {
      continue;
    }

    await prisma.purchaseOrderItem.update({
      where: { id: recv.poItemId },
      data: {
        qtyReceived: { increment: recv.qtyReceived },
        landedCost: parsed.data.landedCost ? parsed.data.landedCost / parsed.data.items.length : 0,
      },
    });

    await prisma.inventoryLevel.upsert({
      where: {
        skuId_locationId: {
          skuId: poItem.skuId,
          locationId: parsed.data.locationId,
        },
      },
      create: {
        skuId: poItem.skuId,
        locationId: parsed.data.locationId,
        qty: recv.qtyReceived,
      },
      update: { qty: { increment: recv.qtyReceived } },
    });

    await prisma.inventoryAdjustment.create({
      data: {
        skuId: poItem.skuId,
        locationId: parsed.data.locationId,
        qty: recv.qtyReceived,
        reason: "PURCHASE_ORDER_RECEIVE",
        referenceId: po.id,
        referenceType: "PurchaseOrder",
        userId: (session.user as { id: string }).id,
      },
    });
  }

  const updated = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: params.id },
    include: { items: true },
  });
  const allReceived = updated.items.every((item) => item.qtyReceived >= item.qtyOrdered);
  const anyReceived = updated.items.some((item) => item.qtyReceived > 0);

  if (allReceived) {
    await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: { status: "RECEIVED" },
    });
  } else if (anyReceived) {
    await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: { status: "PARTIAL" },
    });
  }

  return NextResponse.json({ success: true });
}
