"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/shared";

type Order = { id: string; customerName: string | null; items: Array<{ sku: { sku: string; weight: number | null } }>; shipments: Array<{ id: string; serviceLevel: string | null; trackingNumber: string | null; labelUrl: string | null }> };

export default function ShippingOrderPage() {
  const params = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [rates, setRates] = useState<Array<{ object_id?: string; provider?: string; servicelevel?: { name?: string }; amount?: string }>>([]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [serviceLevel, setServiceLevel] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetch(`/api/orders/${params.orderId}`).then((res) => res.json()).then(setOrder); }, [params.orderId]);

  async function loadRates() {
    const response = await fetch(`/api/shipping/rates?orderId=${params.orderId}`);
    const data = await response.json();
    if (response.ok) setRates(data.rates ?? []); else setError(data.error ?? "Unable to fetch rates");
  }

  async function createLabel(rateId: string) {
    await fetch("/api/shipping/labels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: params.orderId, rateId }) });
    const refreshed = await fetch(`/api/orders/${params.orderId}`).then((res) => res.json());
    setOrder(refreshed);
  }

  if (!order) return <div className="p-6">Loading…</div>;

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={`Ship Order ${order.id.slice(-8).toUpperCase()}`} description={order.customerName ?? "Manual order"} action={<Button onClick={loadRates}>Shop Shippo Rates</Button>} />
      {error ? <Alert variant="destructive"><AlertTitle>Shipping error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]"><Card><CardHeader><CardTitle>Rates</CardTitle></CardHeader><CardContent className="space-y-3">{rates.length ? rates.map((rate, index) => <div key={rate.object_id ?? index} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{rate.provider} · {rate.servicelevel?.name ?? "Service"}</p><p className="text-sm text-muted-foreground">${rate.amount ?? "0.00"}</p></div>{rate.object_id ? <Button onClick={() => createLabel(rate.object_id!)}>Buy Label</Button> : null}</div>) : <p className="text-muted-foreground">Click “Shop Shippo Rates” to load live rates, or use the manual shipment form.</p>}</CardContent></Card><div className="space-y-6"><Card><CardHeader><CardTitle>Manual entry</CardTitle></CardHeader><CardContent className="space-y-3"><Input value={serviceLevel} onChange={(e) => setServiceLevel(e.target.value)} placeholder="Carrier / service" /><Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking number" /><Button variant="outline" onClick={async () => { await fetch("/api/shipping/manual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: params.orderId, serviceLevel, trackingNumber }) }); const refreshed = await fetch(`/api/orders/${params.orderId}`).then((res) => res.json()); setOrder(refreshed); setError("Manual shipment saved."); }}>Save Manual Shipment</Button></CardContent></Card><Card><CardHeader><CardTitle>Existing Shipments</CardTitle></CardHeader><CardContent className="space-y-3">{order.shipments.map((shipment) => <div key={shipment.id} className="rounded-lg border p-3 text-sm"><p className="font-medium">{shipment.serviceLevel ?? "Label created"}</p><p className="text-muted-foreground">Tracking {shipment.trackingNumber ?? "pending"}</p>{shipment.labelUrl ? <a href={shipment.labelUrl} target="_blank" className="text-primary underline">Open label</a> : null}</div>)}{!order.shipments.length ? <p className="text-muted-foreground">No shipments yet.</p> : null}</CardContent></Card></div></div>
    </div>
  );
}

