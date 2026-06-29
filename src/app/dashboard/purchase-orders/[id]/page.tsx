"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/shared";

type Po = { id: string; status: string; supplier?: { name: string } | null; location: { id: string; name: string }; items: Array<{ id: string; qtyOrdered: number; qtyReceived: number; sku: { sku: string; variant: { product: { name: string } } } }> };

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [po, setPo] = useState<Po | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});

  useEffect(() => { fetch(`/api/purchase-orders/${params.id}`).then((res) => res.json()).then(setPo); }, [params.id]);

  const receivedAll = useMemo(() => po ? po.items.every((item) => item.qtyReceived >= item.qtyOrdered) : false, [po]);

  async function receiveItems() {
    if (!po) return;
    const items = po.items.map((item) => ({ poItemId: item.id, qtyReceived: Number(receiveQty[item.id] || 0) })).filter((item) => item.qtyReceived > 0);
    await fetch(`/api/purchase-orders/${po.id}/receive`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, locationId: po.location.id }) });
    const refreshed = await fetch(`/api/purchase-orders/${po.id}`).then((res) => res.json());
    setPo(refreshed);
    setReceiveQty({});
  }

  if (!po) return <div className="p-6">Loading…</div>;

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={`PO ${po.id.slice(-8).toUpperCase()}`} description={`${po.supplier?.name ?? "Internal"} → ${po.location.name}`} back={{ href: "/dashboard/purchase-orders", label: "Purchase Orders" }} action={<Button onClick={receiveItems} disabled={receivedAll}>Receive Selected</Button>} />
      <Card><CardHeader><CardTitle>Receiving</CardTitle></CardHeader><CardContent className="space-y-4">{po.items.map((item) => <div key={item.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[2fr_120px_120px_140px]"><div><p className="font-medium">{item.sku.sku}</p><p className="text-sm text-muted-foreground">{item.sku.variant.product.name}</p></div><div><p className="text-xs text-muted-foreground">Ordered</p><p>{item.qtyOrdered}</p></div><div><p className="text-xs text-muted-foreground">Received</p><p>{item.qtyReceived}</p></div><Input type="number" min="0" max={item.qtyOrdered - item.qtyReceived} value={receiveQty[item.id] ?? "0"} onChange={(e) => setReceiveQty((prev) => ({ ...prev, [item.id]: e.target.value }))} /></div>)}</CardContent></Card>
    </div>
  );
}
