export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRates } from "@/lib/shippo";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: {
        include: {
          sku: true,
        },
      },
    },
  });
  const shippingAddress = order.shippingAddress as Record<string, string>;
  const totalWeight = order.items.reduce((sum, item) => sum + (item.sku.weight ?? 0) * item.qty, 0);

  try {
    const shipment = await getRates({
      addressFrom: {
        name: "StockPilot",
        street1: "123 Warehouse St",
        city: "Anytown",
        state: "CA",
        zip: "90210",
        country: "US",
      },
      addressTo: {
        name: shippingAddress.name ?? "",
        street1: shippingAddress.street1 ?? shippingAddress.address1 ?? "",
        city: shippingAddress.city ?? "",
        state: shippingAddress.province ?? shippingAddress.state ?? "",
        zip: shippingAddress.zip ?? shippingAddress.postal_code ?? "",
        country: shippingAddress.country_code ?? shippingAddress.country ?? "US",
      },
      parcels: [
        {
          length: "10",
          width: "8",
          height: "4",
          distanceUnit: "in",
          weight: String(totalWeight || 1),
          massUnit: "oz",
        },
      ],
    });

    return NextResponse.json(shipment);
  } catch {
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 });
  }
}
