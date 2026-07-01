export const dynamic = "force-dynamic";
import { normalizeOrder } from "@/lib/channels/normalize";
import { verifyShopifyWebhook } from "@/lib/channels/shopify";
import { routeOrder } from "@/lib/orderRouting";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-shopify-hmac-sha256") ?? "";
  const topic = request.headers.get("x-shopify-topic") ?? "unknown";

  const channel = await prisma.salesChannel.findFirst({
    where: { type: "SHOPIFY", active: true },
  });

  if (!channel) {
    return NextResponse.json({ received: true });
  }

  const credentials = channel.credentials as Record<string, string>;
  const webhookSecret = credentials.webhook_secret ?? "";

  if (webhookSecret && !verifyShopifyWebhook(body, signature, webhookSecret)) {
    return NextResponse.json({ received: true });
  }

  // Parse raw payload safely
  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(body);
  } catch {
    await prisma.webhookLog.create({
      data: { source: "SHOPIFY", topic, status: "error", rawPayload: { raw: body }, errorMsg: "Invalid JSON body" },
    });
    return NextResponse.json({ received: true });
  }

  // Log the inbound payload immediately
  const log = await prisma.webhookLog.create({
    data: { source: "SHOPIFY", topic, status: "received", rawPayload: rawPayload as object },
  });

  try {
    const normalized = normalizeOrder(rawPayload, "SHOPIFY");

    const existing = await prisma.order.findFirst({
      where: { channelId: channel.id, channelOrderId: normalized.channelOrderId },
    });

    if (existing) {
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: { status: "skipped", orderId: existing.id },
      });
      return NextResponse.json({ received: true });
    }

    const skuCodes = normalized.items.map((i) => i.sku).filter(Boolean) as string[];
    const skuRecords = skuCodes.length
      ? await prisma.sKU.findMany({ where: { sku: { in: skuCodes } } })
      : [];
    const skuByCode = Object.fromEntries(skuRecords.map((s) => [s.sku, s.id]));

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
          create: normalized.items
            .filter((item) => item.sku && skuByCode[item.sku])
            .map((item) => ({
              skuId: skuByCode[item.sku!],
              qty: item.qty,
              unitPrice: item.unitPrice,
              channelListingId: item.channelListingId,
            })),
        },
      },
    });

    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { status: "processed", orderId: order.id },
    });

    await routeOrder(order.id);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { status: "error", errorMsg },
    });
  }

  return NextResponse.json({ received: true });
}

