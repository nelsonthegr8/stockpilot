export const dynamic = "force-dynamic";
import { normalizeOrder } from "@/lib/channels/normalize";
import { verifyShopifyWebhook } from "@/lib/channels/shopify";
import { routeOrder } from "@/lib/orderRouting";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-shopify-hmac-sha256") ?? "";

  const channel = await prisma.salesChannel.findFirst({
    where: { type: "SHOPIFY", active: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "No active Shopify channel" }, { status: 404 });
  }

  const credentials = channel.credentials as Record<string, string>;
  const webhookSecret = credentials.webhook_secret ?? "";

  if (!verifyShopifyWebhook(body, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const rawOrder = JSON.parse(body);
  const normalized = normalizeOrder(rawOrder, "SHOPIFY");

  const existing = await prisma.order.findFirst({
    where: {
      channelId: channel.id,
      channelOrderId: normalized.channelOrderId,
    },
  });

  if (!existing) {
    const order = await prisma.order.create({
      data: {
        channelId: channel.id,
        channelOrderId: normalized.channelOrderId,
        customerName: normalized.customerName,
        customerEmail: normalized.customerEmail,
        shippingAddress: normalized.shippingAddress as Record<string, string>,
        subtotal: normalized.subtotal,
        shippingCost: normalized.shippingCost,
        channelFees: normalized.channelFees,
        total: normalized.total,
        currency: normalized.currency,
        placedAt: normalized.placedAt,
        items: {
          create: normalized.items.map((item) => ({
            skuId: item.sku ? item.sku : "unknown",
            qty: item.qty,
            unitPrice: item.unitPrice,
            channelListingId: item.channelListingId,
          })),
        },
      },
    });

    await routeOrder(order.id);
  }

  return NextResponse.json({ received: true });
}
