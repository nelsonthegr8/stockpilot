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

    // Resolve SKUs by sku code first, then fall back to channelVariantId
    const skuCodes = normalized.items.map((i) => i.sku).filter(Boolean) as string[];
    const variantIds = normalized.items.map((i) => i.channelListingId).filter(Boolean) as string[];

    const [skuByCode, variantPrintConfigs] = await Promise.all([
      skuCodes.length
        ? prisma.sKU.findMany({ where: { sku: { in: skuCodes } } }).then((rows) =>
            Object.fromEntries(rows.map((s) => [s.sku, s.id]))
          )
        : Promise.resolve({} as Record<string, string>),
      variantIds.length
        ? prisma.variantPrintConfig.findMany({
            where: { channelVariantId: { in: variantIds } },
            select: { channelVariantId: true, skuId: true },
          })
        : Promise.resolve([]),
    ]);

    const skuByVariantId = Object.fromEntries(
      variantPrintConfigs.map((c) => [c.channelVariantId, c.skuId])
    );

    const resolvedItems = normalized.items
      .map((item) => {
        const skuId = (item.sku && skuByCode[item.sku]) || skuByVariantId[item.channelListingId];
        return skuId ? { skuId, qty: item.qty, unitPrice: item.unitPrice, channelListingId: item.channelListingId } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

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
          create: resolvedItems,
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

