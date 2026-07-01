export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createPickListSchema = z.object({
  orderIds: z.array(z.string()).min(1),
  assignedTo: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pickLists = await prisma.pickList.findMany({
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          sku: true,
        },
      },
      orders: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(pickLists);
}

export async function POST(request: Request) {
  const session = await auth();
  if (
    !session ||
    !["ADMIN", "MANAGER", "PICKER_PACKER"].includes((session.user as { role?: string }).role ?? "")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createPickListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: {
      id: { in: parsed.data.orderIds },
      status: "AWAITING_FULFILLMENT",
    },
    include: {
      items: {
        where: { stockReserved: true },
        include: { sku: true },
      },
    },
  });

  const pickList = await prisma.pickList.create({
    data: {
      assignedTo: parsed.data.assignedTo,
      orders: { connect: orders.map((order) => ({ id: order.id })) },
      items: {
        create: orders.flatMap((order) =>
          order.items.map((item) => ({
            skuId: item.skuId,
            qtyRequired: item.qty,
          })),
        ),
      },
    },
    include: {
      items: true,
      orders: true,
    },
  });

  return NextResponse.json(pickList, { status: 201 });
}
