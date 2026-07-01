export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  skuId: z.string(),
  locationId: z.string(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { skuId } = parsed.data;

  // Find pending order items for this SKU, high priority first, then FIFO
  const pendingItems = await prisma.orderItem.findMany({
    where: {
      skuId,
      stockReserved: false,
      order: { status: { in: ["PENDING", "IN_PRODUCTION"] } },
    },
    include: {
      order: { select: { id: true, status: true, priority: true, placedAt: true } },
    },
    orderBy: [
      { order: { priority: "desc" } },
      { order: { placedAt: "asc" } },
    ],
  });

  for (const item of pendingItems) {
    const levels = await prisma.inventoryLevel.findMany({ where: { skuId } });
    const available = levels.reduce((sum, l) => sum + l.qty - l.reservedQty, 0);
    if (available < item.qty) break;

    let remaining = item.qty;
    for (const level of levels) {
      if (remaining <= 0) break;
      const canReserve = Math.min(level.qty - level.reservedQty, remaining);
      if (canReserve > 0) {
        await prisma.inventoryLevel.update({
          where: { id: level.id },
          data: { reservedQty: { increment: canReserve } },
        });
        remaining -= canReserve;
      }
    }
    await prisma.orderItem.update({ where: { id: item.id }, data: { stockReserved: true } });

    const unreservedCount = await prisma.orderItem.count({
      where: { orderId: item.order.id, stockReserved: false },
    });
    if (unreservedCount === 0) {
      await prisma.order.update({
        where: { id: item.order.id },
        data: { status: "AWAITING_FULFILLMENT" },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
