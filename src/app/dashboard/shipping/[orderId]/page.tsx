"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/shared";

type BoxPreset = { id: string; name: string; lengthIn: number; widthIn: number; heightIn: number; maxWeightOz: number };
type PackSetting = { boxPreset: BoxPreset; qtyPerBox: number; packingNotes: string | null } | null;
type OrderItem = { id: string; qty: number; sku: { id: string; sku: string; name?: string; weight: number | null }; packSetting?: PackSetting };
type Shipment = { id: string; serviceLevel: string | null; trackingNumber: string | null; labelUrl: string | null };
type Order = {
  id: string;
  customerName: string | null;
  packingMode: "GUIDED" | "FREESTYLE";
  packingNotes: string | null;
  items: OrderItem[];
  shipments: Shipment[];
};

type BoxGroup = { preset: BoxPreset; items: Array<{ item: OrderItem; boxCount: number }>; totalBoxes: number };

function computeBoxGroups(items: OrderItem[]): { groups: BoxGroup[]; unassigned: OrderItem[] } {
  const groups = new Map<string, BoxGroup>();
  const unassigned: OrderItem[] = [];
  for (const item of items) {
    const ps = item.packSetting;
    if (!ps?.boxPreset) { unassigned.push(item); continue; }
    const { boxPreset, qtyPerBox } = ps;
    const boxCount = Math.ceil(item.qty / (qtyPerBox || 1));
    if (!groups.has(boxPreset.id)) groups.set(boxPreset.id, { preset: boxPreset, items: [], totalBoxes: 0 });
    const g = groups.get(boxPreset.id)!;
    g.items.push({ item, boxCount });
    g.totalBoxes = Math.max(g.totalBoxes, boxCount);
  }
  return { groups: Array.from(groups.values()), unassigned };
}

export default function ShippingOrderPage() {
  const params = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [mode, setMode] = useState<"GUIDED" | "FREESTYLE">("GUIDED");
  const [rates, setRates] = useState<Array<{ object_id?: string; provider?: string; servicelevel?: { name?: string }; amount?: string }>>([]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [serviceLevel, setServiceLevel] = useState("");
  const [dims, setDims] = useState({ length: "", width: "", height: "", weight: "" });
  const [error, setError] = useState<string | null>(null);
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${params.orderId}`)
      .then((r) => r.json())
      .then((o: Order) => { setOrder(o); setMode(o.packingMode ?? "GUIDED"); });
  }, [params.orderId]);

  async function toggleMode() {
    const next = mode === "GUIDED" ? "FREESTYLE" : "GUIDED";
    setMode(next);
    await fetch(`/api/orders/${params.orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packingMode: next }),
    });
  }

  async function loadRates() {
    setError(null);
    const res = await fetch(`/api/shipping/rates?orderId=${params.orderId}`);
    const data = await res.json();
    if (res.ok) setRates(data.rates ?? []); else setError(data.error ?? "Unable to fetch rates");
  }

  async function createLabel(rateId: string) {
    await fetch("/api/shipping/labels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: params.orderId, rateId }) });
    const refreshed = await fetch(`/api/orders/${params.orderId}`).then((r) => r.json());
    setOrder(refreshed);
  }

  async function saveManual() {
    setSavingManual(true);
    try {
      await fetch("/api/shipping/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: params.orderId, serviceLevel, trackingNumber }),
      });
      const refreshed = await fetch(`/api/orders/${params.orderId}`).then((r) => r.json());
      setOrder(refreshed);
      setError("Manual shipment saved.");
    } finally {
      setSavingManual(false);
    }
  }

  if (!order) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const { groups, unassigned } = computeBoxGroups(order.items);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Ship Order ${order.id.slice(-8).toUpperCase()}`}
        description={order.customerName ?? "Manual order"}
        back={{ href: "/dashboard/shipping", label: "Shipping" }}
        action={
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mode:</span>
            <button
              onClick={toggleMode}
              className={`relative inline-flex h-8 w-36 items-center rounded-full border-2 text-xs font-semibold transition-all ${
                mode === "GUIDED"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-transparent text-foreground"
              }`}
            >
              <span className={`absolute left-0 flex h-full w-1/2 items-center justify-center rounded-full transition-transform ${mode === "GUIDED" ? "translate-x-0" : "translate-x-full bg-foreground text-background"}`}>
                {mode === "GUIDED" ? "🗂 Guided" : "✏️ Freestyle"}
              </span>
              <span className="w-full text-center">{mode === "GUIDED" ? "🗂 Guided" : "✏️ Freestyle"}</span>
            </button>
            <Button onClick={loadRates} variant="outline">Shop Shippo Rates</Button>
          </div>
        }
      />

      {error && (
        <Alert variant={error.toLowerCase().includes("error") ? "destructive" : "default"}>
          <AlertTitle>{error.toLowerCase().includes("error") ? "Error" : "Info"}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {/* Packing instructions */}
          {mode === "GUIDED" ? (
            <Card>
              <CardHeader>
                <CardTitle>📦 Packing Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {groups.length === 0 && unassigned.length === 0 && (
                  <p className="text-sm text-muted-foreground">No items on this order.</p>
                )}
                {groups.map((group) => (
                  <div key={group.preset.id} className="rounded-lg border-2 border-border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-semibold">{group.preset.name}</p>
                      <span className="text-sm text-muted-foreground">
                        {group.preset.lengthIn}&quot;×{group.preset.widthIn}&quot;×{group.preset.heightIn}&quot; · max {group.preset.maxWeightOz} oz
                      </span>
                    </div>
                    <div className="space-y-1">
                      {group.items.map(({ item, boxCount }) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span>{item.sku.sku} × {item.qty}</span>
                          <span className="text-muted-foreground">{boxCount} box{boxCount !== 1 ? "es" : ""}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-right text-xs font-medium text-muted-foreground">
                      Total: {group.totalBoxes} box{group.totalBoxes !== 1 ? "es" : ""} of this type
                    </p>
                  </div>
                ))}
                {unassigned.length > 0 && (
                  <div className="rounded-lg border-2 border-dashed border-border p-4">
                    <p className="mb-1 text-sm font-semibold text-muted-foreground">⚠️ No box preset assigned</p>
                    {unassigned.map((item) => (
                      <p key={item.id} className="text-sm">{item.sku.sku} × {item.qty} — assign a box preset in Product Settings</p>
                    ))}
                  </div>
                )}
                {order.packingNotes && (
                  <div className="rounded-lg bg-muted/60 p-3 text-sm">
                    <strong>Notes:</strong> {order.packingNotes}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>✏️ Freestyle Packing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Items to fulfill — choose your own box and dimensions below.</p>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <span className="font-medium">{item.sku.sku}</span>
                      <span className="text-muted-foreground">qty {item.qty}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <Label htmlFor="dim-l">Length (in)</Label>
                    <Input id="dim-l" type="number" step="0.1" value={dims.length} onChange={(e) => setDims((d) => ({ ...d, length: e.target.value }))} placeholder="12.0" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dim-w">Width (in)</Label>
                    <Input id="dim-w" type="number" step="0.1" value={dims.width} onChange={(e) => setDims((d) => ({ ...d, width: e.target.value }))} placeholder="9.0" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dim-h">Height (in)</Label>
                    <Input id="dim-h" type="number" step="0.1" value={dims.height} onChange={(e) => setDims((d) => ({ ...d, height: e.target.value }))} placeholder="4.0" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dim-wt">Weight (oz)</Label>
                    <Input id="dim-wt" type="number" step="0.5" value={dims.weight} onChange={(e) => setDims((d) => ({ ...d, weight: e.target.value }))} placeholder="16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rates */}
          <Card>
            <CardHeader><CardTitle>Shipping Rates</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {rates.length ? (
                rates.map((rate, i) => (
                  <div key={rate.object_id ?? i} className="flex items-center justify-between rounded-lg border-2 border-border p-3">
                    <div>
                      <p className="font-medium">{rate.provider} · {rate.servicelevel?.name ?? "Service"}</p>
                      <p className="text-sm text-muted-foreground">${rate.amount ?? "0.00"}</p>
                    </div>
                    {rate.object_id && <Button onClick={() => createLabel(rate.object_id!)}>Buy Label</Button>}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Click &quot;Shop Shippo Rates&quot; to load live rates, or use the manual entry below.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Manual Entry</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="man-svc">Carrier / service</Label>
                <Input id="man-svc" value={serviceLevel} onChange={(e) => setServiceLevel(e.target.value)} placeholder="e.g. USPS First Class" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="man-trk">Tracking number</Label>
                <Input id="man-trk" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="9400111899223418964..."/>
              </div>
              <Button className="w-full" variant="outline" onClick={saveManual} disabled={savingManual}>
                {savingManual ? "Saving…" : "Save Manual Shipment"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Shipments</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {order.shipments.map((s) => (
                <div key={s.id} className="rounded-lg border-2 border-border p-3 text-sm">
                  <p className="font-semibold">{s.serviceLevel ?? "Label created"}</p>
                  <p className="text-muted-foreground">Tracking: {s.trackingNumber ?? "pending"}</p>
                  {s.labelUrl && <a href={s.labelUrl} target="_blank" rel="noreferrer" className="text-primary underline">Open label ↗</a>}
                </div>
              ))}
              {!order.shipments.length && <p className="text-sm text-muted-foreground">No shipments yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
