/**
 * test-shopify-webhook.ts
 *
 * Simulates a Shopify orders/create webhook POST to StockPilot.
 * Run: npx tsx test-shopify-webhook.ts
 *
 * Steps performed:
 *  1. Creates (or finds) a SHOPIFY SalesChannel in the DB with a known webhook_secret
 *  2. Builds a realistic Shopify order payload using your real SKUs
 *  3. Computes the HMAC-SHA256 signature Shopify would send
 *  4. POSTs to http://localhost:3000/api/webhooks/shopify
 *  5. Prints the response and the resulting Order + PrintJobs from the DB
 */

import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const BASE_URL = "http://localhost:3000";
const WEBHOOK_SECRET = "test-webhook-secret-local-dev";

// Real SKU from your seed data — 3D Print type so routeOrder queues a PrintJob
const TEST_SKU_CODE   = "3DP-WIDGET-BLK-001";
const TEST_VARIANT_ID = "9876543210"; // fictional Shopify variant ID

const prisma = new PrismaClient();

async function ensureChannel() {
  let channel = await prisma.salesChannel.findFirst({
    where: { type: "SHOPIFY", active: true },
  });

  if (!channel) {
    channel = await prisma.salesChannel.create({
      data: {
        name: "Test Shopify Store",
        type: "SHOPIFY",
        active: true,
        credentials: {
          shop: "test-store.myshopify.com",
          access_token: "shpat_test_token",
          webhook_secret: WEBHOOK_SECRET,
        },
      },
    });
    console.log("✅ Created SHOPIFY channel:", channel.id);
  } else {
    const creds = channel.credentials as Record<string, string>;
    if (creds.webhook_secret !== WEBHOOK_SECRET) {
      channel = await prisma.salesChannel.update({
        where: { id: channel.id },
        data: { credentials: { ...creds, webhook_secret: WEBHOOK_SECRET } },
      });
      console.log("✅ Patched webhook_secret on existing channel:", channel.id);
    } else {
      console.log("✅ Using existing SHOPIFY channel:", channel.id);
    }
  }
  return channel;
}

function buildShopifyOrder(orderId: string) {
  return {
    id: orderId,
    email: "jane.tester@example.com",
    created_at: new Date().toISOString(),
    currency: "USD",
    subtotal_price: "29.99",
    total_price: "34.99",
    total_shipping_price_set: {
      shop_money: { amount: "5.00", currency_code: "USD" },
    },
    shipping_address: {
      first_name: "Jane",
      last_name: "Tester",
      address1: "123 Test St",
      city: "Atlanta",
      province: "Georgia",
      zip: "30301",
      country: "US",
    },
    customer: { first_name: "Jane", last_name: "Tester", email: "jane.tester@example.com" },
    line_items: [
      {
        id: 11111,
        variant_id: TEST_VARIANT_ID,
        sku: TEST_SKU_CODE,
        title: "Sample 3D Print Widget - Black",
        quantity: 2,
        price: "14.99",
      },
    ],
  };
}

async function sendWebhook(body: string): Promise<number> {
  const sig = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body, "utf8").digest("base64");

  console.log("\n📤 POST", `${BASE_URL}/api/webhooks/shopify`);
  const res = await fetch(`${BASE_URL}/api/webhooks/shopify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-shopify-hmac-sha256": sig,
      "x-shopify-topic": "orders/create",
    },
    body,
  });

  const text = await res.text();
  console.log(`📥 HTTP ${res.status}:`, text);
  return res.status;
}

async function showResult(channelOrderId: string) {
  const order = await prisma.order.findFirst({
    where: { channelOrderId },
    include: { items: { include: { sku: true } }, printJobs: true },
  });

  if (!order) {
    console.log("\n❌ Order not found in DB — check server logs for errors");
    return;
  }

  console.log("\n✅ Order in DB:");
  console.log(`   id:       ${order.id}`);
  console.log(`   status:   ${order.status}`);
  console.log(`   customer: ${order.customerName} <${order.customerEmail}>`);
  console.log(`   total:    $${order.total} ${order.currency}`);
  console.log(`   items:`);
  for (const item of order.items) {
    console.log(`     • ${item.sku?.sku ?? item.skuId}  qty=${item.qty}  $${item.unitPrice}  reserved=${item.stockReserved}`);
  }
  if (order.printJobs.length > 0) {
    console.log(`   print jobs queued: ${order.printJobs.length} (3D print item with no pre-built stock)`);
    for (const j of order.printJobs) {
      console.log(`     • ${j.id}  status=${j.status}`);
    }
    console.log("\n   ➡ Check /dashboard/print-queue to see the job");
  } else {
    console.log(`   print jobs: none (stock was reserved from existing inventory)`);
    console.log("\n   ➡ Check /dashboard/orders to see the order");
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const SHOPIFY_ORDER_ID = `test-${Date.now()}`;

  await ensureChannel();
  const payload = buildShopifyOrder(SHOPIFY_ORDER_ID);
  const body = JSON.stringify(payload);
  const status = await sendWebhook(body);

  if (status === 200) {
    await showResult(SHOPIFY_ORDER_ID);
  } else if (status === 401) {
    console.log("\n❌ Signature mismatch — the WEBHOOK_SECRET in the script doesn't match the channel DB record");
  } else if (status === 404) {
    console.log("\n❌ No active SHOPIFY channel found — channel creation may have failed");
  } else {
    console.log("\n❌ Unexpected error — check the Next.js dev server terminal for the stack trace");
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
