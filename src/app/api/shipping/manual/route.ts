export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const manualSchema = z.object({ orderId: z.string(), serviceLevel: z.string().min(1), trackingNumber: z.string().min(1) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const parsed = manualSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const shipment = await prisma.shipment.create({ data: { orderId: parsed.data.orderId, serviceLevel: parsed.data.serviceLevel, trackingNumber: parsed.data.trackingNumber, status: "MANUAL_ENTRY", shippedAt: new Date() } });
  await prisma.order.update({ where: { id: parsed.data.orderId }, data: { status: "SHIPPED" } });
  return NextResponse.json(shipment, { status: 201 });
}
