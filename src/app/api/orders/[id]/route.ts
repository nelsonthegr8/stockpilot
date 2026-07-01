export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { canTransition } from "@/lib/orderRouting";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      channel: true,
      items: {
        include: {
          sku: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
              packSetting: {
                include: {
                  boxPreset: true,
                },
              },
            },
          },
          printJobs: true,
        },
      },
      shipments: true,
      pickLists: true,
      financial: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.order.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (body.status) {
    const current = await prisma.order.findUniqueOrThrow({
      where: { id: params.id },
      select: { status: true, items: { select: { skuId: true, qty: true, stockReserved: true } } },
    });

    if (!canTransition(current.status, body.status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${current.status} to ${body.status}` },
        { status: 400 },
      );
    }

    if (body.status === "SHIPPED") {
      const order = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({ where: { id: params.id }, data: body });
        for (const item of current.items) {
          if (!item.stockReserved) continue;
          const levels = await tx.inventoryLevel.findMany({ where: { skuId: item.skuId } });
          let remaining = item.qty;
          for (const level of levels) {
            if (remaining <= 0) break;
            const dec = Math.min(level.reservedQty, remaining);
            if (dec > 0) {
              await tx.inventoryLevel.update({
                where: { id: level.id },
                data: { qty: { decrement: dec }, reservedQty: { decrement: dec } },
              });
              remaining -= dec;
            }
          }
        }
        return updated;
      });
      return NextResponse.json(order);
    }
  }

  const order = await prisma.order.update({
    where: { id: params.id },
    data: body,
  });

  return NextResponse.json(order);
}
