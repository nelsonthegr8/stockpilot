import crypto from "crypto";
import { prisma } from "../prisma";
import { decrypt } from "../encrypt";
import { normalizeOrder } from "./normalize";

export function verifyShopifyWebhook(body: string, signature: string, secret: string): boolean {
  const hash = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  return hash === signature;
}

export async function fetchShopifyOrders(channelId: string) {
  const channel = await prisma.salesChannel.findUniqueOrThrow({ where: { id: channelId } });
  const creds = channel.credentials as Record<string, string>;
  const accessToken = creds.encrypted ? decrypt(creds.access_token) : creds.access_token;
  const shop = creds.shop;
  const res = await fetch(`https://${shop}/admin/api/2024-01/orders.json?status=any&limit=250`, {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
  const { orders } = await res.json();
  return orders.map((o: unknown) => normalizeOrder(o, "SHOPIFY"));
}

export async function pushShopifyInventory(channelId: string, skuId: string, qty: number) {
  return { success: true, skuId, qty };
}
