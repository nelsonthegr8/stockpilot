export interface NormalizedOrder {
  channelOrderId: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: Record<string, unknown>;
  subtotal: number;
  shippingCost: number;
  channelFees: number;
  total: number;
  currency: string;
  items: Array<{ channelListingId: string; qty: number; unitPrice: number; sku?: string }>;
  placedAt: Date;
}

export function normalizeOrder(raw: unknown, channelType: string): NormalizedOrder {
  const r = raw as Record<string, unknown>;
  switch (channelType) {
    case "SHOPIFY":
      return normalizeShopify(r);
    case "ETSY":
      return normalizeEtsy(r);
    case "AMAZON":
      return normalizeAmazon(r);
    case "EBAY":
      return normalizeEbay(r);
    default:
      throw new Error(`Unknown channel type: ${channelType}`);
  }
}

function normalizeShopify(r: Record<string, unknown>): NormalizedOrder {
  const sa = r.shipping_address as Record<string, string> | undefined;
  const customer = r.customer as Record<string, unknown> | undefined;
  const customerName = customer
    ? `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim()
    : (sa?.name ?? "");
  const customerEmail =
    (customer?.email as string) ||
    (r.email as string) ||
    (r.contact_email as string) ||
    "";

  const rawItems = (r.line_items as Record<string, unknown>[]) ?? [];

  // Aggregate items by variant_id — Shopify sometimes sends qty:1 lines for
  // the same variant instead of a single line with qty:N
  const aggregated = new Map<string, { channelListingId: string; qty: number; unitPrice: number; sku?: string }>();
  for (const li of rawItems) {
    const variantId = li.variant_id != null ? String(li.variant_id) : null;
    const key = variantId ?? `li-${li.id}`;
    const qty = (li.quantity as number) ?? 1;
    const unitPrice = parseFloat((li.price as string) ?? "0");
    const skuCode = typeof li.sku === "string" && li.sku.trim() !== "" ? li.sku.trim() : undefined;

    if (aggregated.has(key)) {
      aggregated.get(key)!.qty += qty;
    } else {
      aggregated.set(key, {
        channelListingId: variantId ?? String(li.id),
        qty,
        unitPrice,
        sku: skuCode,
      });
    }
  }

  return {
    channelOrderId: String(r.id),
    customerName,
    customerEmail,
    shippingAddress: sa ?? {},
    subtotal: parseFloat((r.subtotal_price as string) ?? "0"),
    shippingCost: parseFloat(
      (r.total_shipping_price_set as Record<string, Record<string, string>> | undefined)
        ?.shop_money?.amount ?? "0"
    ),
    channelFees: 0,
    total: parseFloat((r.total_price as string) ?? "0"),
    currency: (r.currency as string) ?? "USD",
    items: Array.from(aggregated.values()),
    placedAt: new Date((r.created_at as string) ?? Date.now()),
  };
}

function normalizeEtsy(r: Record<string, unknown>): NormalizedOrder {
  return {
    channelOrderId: String(r.receipt_id ?? r.order_id),
    customerName: (r.name as string) ?? "",
    customerEmail: (r.buyer_email as string) ?? "",
    shippingAddress: (r.shipping_address as Record<string, unknown>) ?? {},
    subtotal: Number((r.subtotal as Record<string, string>)?.amount ?? 0) / 100,
    shippingCost: Number((r.total_shipping_cost as Record<string, string>)?.amount ?? 0) / 100,
    channelFees: 0,
    total: Number((r.grandtotal as Record<string, string>)?.amount ?? 0) / 100,
    currency: (r.currency_code as string) ?? "USD",
    items: ((r.transactions as unknown[]) ?? []).map((t) => {
      const tx = t as Record<string, unknown>;
      return { channelListingId: String(tx.listing_id), qty: tx.quantity as number, unitPrice: Number((tx.price as Record<string, string>)?.amount ?? 0) / 100 };
    }),
    placedAt: new Date((r.create_timestamp as number) * 1000),
  };
}

function normalizeAmazon(r: Record<string, unknown>): NormalizedOrder {
  const sa = r.ShippingAddress as Record<string, string> | undefined;
  return {
    channelOrderId: String(r.AmazonOrderId),
    customerName: sa?.Name ?? "",
    customerEmail: (r.BuyerEmail as string) ?? "",
    shippingAddress: sa ?? {},
    subtotal: parseFloat((r.OrderTotal as Record<string, string>)?.Amount ?? "0"),
    shippingCost: 0,
    channelFees: 0,
    total: parseFloat((r.OrderTotal as Record<string, string>)?.Amount ?? "0"),
    currency: (r.OrderTotal as Record<string, string>)?.CurrencyCode ?? "USD",
    items: ((r.OrderItems as unknown[]) ?? []).map((i) => {
      const item = i as Record<string, unknown>;
      return { channelListingId: String(item.ASIN), qty: parseInt(item.QuantityOrdered as string), unitPrice: parseFloat((item.ItemPrice as Record<string, string>)?.Amount ?? "0"), sku: item.SellerSKU as string };
    }),
    placedAt: new Date(r.PurchaseDate as string),
  };
}

function normalizeEbay(r: Record<string, unknown>): NormalizedOrder {
  return {
    channelOrderId: String(r.orderId),
    customerName: (r.buyer as Record<string, string>)?.username ?? "",
    customerEmail: "",
    shippingAddress: ((r.fulfillmentStartInstructions as Record<string, unknown>[])?.[0]?.shippingStep as Record<string, unknown>) ?? {},
    subtotal: parseFloat((r.pricingSummary as Record<string, Record<string, string>>)?.subtotal?.value ?? "0"),
    shippingCost: parseFloat((r.pricingSummary as Record<string, Record<string, string>>)?.deliveryCost?.value ?? "0"),
    channelFees: 0,
    total: parseFloat((r.pricingSummary as Record<string, Record<string, string>>)?.total?.value ?? "0"),
    currency: (r.pricingSummary as Record<string, Record<string, string>>)?.total?.currency ?? "USD",
    items: ((r.lineItems as unknown[]) ?? []).map((li) => {
      const l = li as Record<string, unknown>;
      return { channelListingId: String(l.lineItemId), qty: l.quantity as number, unitPrice: parseFloat((l.lineItemCost as Record<string, string>)?.value ?? "0") };
    }),
    placedAt: new Date(r.creationDate as string),
  };
}
