export const dynamic = "force-dynamic";
import { OrderStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { routeOrder } from "@/lib/orderRouting";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createOrderSchema = z.object({
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      skuId: z.string(),
      qty: z.number().int().positive(),
      unitPrice: z.number().min(0),
    }),
  ),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const channel = searchParams.get("channel");
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where = {
    ...(status ? { status: status as OrderStatus } : {}),
    ...(channel ? { channelId: channel } : {}),
    ...(dateFrom || dateTo
      ? {
          placedAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
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
              },
            },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { placedAt: "desc" },
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, limit });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const subtotal = parsed.data.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const order = await prisma.order.create({
    data: {
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      shippingAddress: (parsed.data.shippingAddress ?? {}) as Record<string, string>,
      notes: parsed.data.notes,
      subtotal,
      total: subtotal,
      items: { create: parsed.data.items },
    },
  });

  await routeOrder(order.id);

  const updated = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true },
  });

  return NextResponse.json(updated, { status: 201 });
}
