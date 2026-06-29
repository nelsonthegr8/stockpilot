export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLabel } from "@/lib/shippo";
import { NextResponse } from "next/server";
import { z } from "zod";

const createLabelSchema = z.object({
  orderId: z.string(),
  rateId: z.string(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createLabelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const transaction = (await createLabel(parsed.data.rateId)) as {
    objectId?: string;
    labelUrl?: string;
  };

  const shipment = await prisma.shipment.create({
    data: {
      orderId: parsed.data.orderId,
      shippoTransactionId: transaction.objectId,
      labelUrl: transaction.labelUrl,
      status: "LABEL_CREATED",
    },
  });

  await prisma.order.update({
    where: { id: parsed.data.orderId },
    data: { status: "SHIPPED" },
  });

  return NextResponse.json(shipment, { status: 201 });
}
