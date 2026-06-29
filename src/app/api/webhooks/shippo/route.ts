import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { event, data } = body as { event: string; data: Record<string, unknown> };

  if (event === "transaction_updated") {
    const transactionId = data.object_id as string;
    const trackingStatus = (data.tracking_status as Record<string, string> | undefined)?.status ?? "";

    await prisma.shipment.updateMany({
      where: { shippoTransactionId: transactionId },
      data: {
        status: trackingStatus,
        ...(trackingStatus === "DELIVERED" ? { deliveredAt: new Date() } : {}),
      },
    });
  }

  return NextResponse.json({ received: true });
}
