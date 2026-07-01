export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom")
    ? new Date(searchParams.get("dateFrom")!)
    : new Date(Date.now() - 30 * 86_400_000);
  const dateTo = searchParams.get("dateTo")
    ? new Date(searchParams.get("dateTo")!)
    : new Date();

  const orders = await prisma.order.findMany({
    where: {
      placedAt: { gte: dateFrom, lte: dateTo },
      status: { notIn: ["CANCELLED", "REFUNDED"] },
    },
    select: {
      total: true,
      placedAt: true,
      channelId: true,
    },
  });

  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

  return NextResponse.json({
    totalRevenue,
    totalOrders,
    avgOrderValue,
    orders: orders.map((order) => ({
      total: Number(order.total),
      placedAt: order.placedAt,
      channelId: order.channelId,
    })),
  });
}
