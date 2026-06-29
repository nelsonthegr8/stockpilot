"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/shared";

type PO = { id: string; supplier?: { name: string } | null; location: { id: string; name: string }; items: Array<{ id: string; sku: { sku: string; barcode: string | null; variant: { product: { name: string } } }; qtyOrdered: number; qtyReceived: number }> };
type Location = { id: string; name: string };
type Sku = { id: string; sku: string; barcode: string | null; variant: { product: { name: string } } };

export default function InventoryReceivePage() {
  const [mode, setMode] = useState<"po" | "adhoc">("po");
  const [purchaseOrders, setPurchaseOrders] = useState<PO[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [selectedPoId, setSelectedPoId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [adhocSkuId, setAdhocSkuId] = useState("");
  const [adhocQty, setAdhocQty] = useState("1");
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/purchase-orders").then((r) => r.json()), fetch("/api/locations").then((r) => r.json()), fetch("/api/skus").then((r) => r.json())]).then(([poData, locationData, skuData]) => { setPurchaseOrders(poData); setLocations(locationData); setSkus(skuData); setSelectedLocationId(locationData[0]?.id ?? ""); });
  }, []);

  const selectedPo = useMemo(() => purchaseOrders.find((po) => po.id === selectedPoId) ?? null, [purchaseOrders, selectedPoId]);

  function registerScan(code: string) {
    if (!selectedPo) return;
    const match = selectedPo.items.find((item) => item.sku.sku === code || item.sku.barcode === code);
    if (match) setCounts((prev) => ({ ...prev, [match.id]: String(Number(prev[match.id] ?? 0) + 1) }));
    setScanValue("");
  }

  async function receiveSelectedPo() {
    if (!selectedPo) return;
    const items = selectedPo.items.map((item) => ({ poItemId: item.id, qtyReceived: Number(counts[item.id] ?? 0) })).filter((item) => item.qtyReceived > 0);
    await fetch(`/api/purchase-orders/${selectedPo.id}/receive`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, locationId: selectedLocationId || selectedPo.location.id }) });
    setMessage("Receipt confirmed.");
  }

  async function receiveWithoutPo() {
    await fetch("/api/inventory/adjust", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skuId: adhocSkuId, locationId: selectedLocationId, qty: Number(adhocQty), reason: "ADHOC_RECEIVE" }) });
    setMessage("Inventory received without PO.");
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Receiving" description="Receive against a PO or add inventory without a PO." />
      <div className="flex gap-2"><Button variant={mode === "po" ? "default" : "outline"} onClick={() => setMode("po")}>Receive Against PO</Button><Button variant={mode === "adhoc" ? "default" : "outline"} onClick={() => setMode("adhoc")}>Receive Without PO</Button></div>
      {message ? <Card><CardContent className="p-4 text-sm">{message}</CardContent></Card> : null}
      {mode === "po" ? <div className="grid gap-6 xl:grid-cols-[2fr_1fr]"><Card><CardHeader><CardTitle>PO Selection</CardTitle></CardHeader><CardContent className="space-y-4"><select value={selectedPoId} onChange={(e) => setSelectedPoId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select purchase order</option>{purchaseOrders.map((po) => <option key={po.id} value={po.id}>{po.id.slice(-8).toUpperCase()} — {po.supplier?.name ?? "Internal"}</option>)}</select><select value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><Input value={scanValue} onChange={(e) => setScanValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); registerScan(scanValue); } }} placeholder="Scan barcode (camera or keyboard wedge)" /></CardContent></Card><Card><CardHeader><CardTitle>Receipt</CardTitle></CardHeader><CardContent className="space-y-3">{selectedPo?.items.map((item) => <div key={item.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[2fr_120px_120px_120px]"><div><p className="font-medium">{item.sku.sku}</p><p className="text-sm text-muted-foreground">{item.sku.variant.product.name}</p></div><div><p className="text-xs text-muted-foreground">Ordered</p><p>{item.qtyOrdered}</p></div><div><p className="text-xs text-muted-foreground">Received</p><p>{item.qtyReceived}</p></div><Input type="number" min="0" value={counts[item.id] ?? "0"} onChange={(e) => setCounts((prev) => ({ ...prev, [item.id]: e.target.value }))} /></div>)}<Button onClick={receiveSelectedPo} disabled={!selectedPo}>Confirm Receipt</Button></CardContent></Card></div> : <div className="grid gap-6 xl:grid-cols-[2fr_1fr]"><Card><CardHeader><CardTitle>Quick receive</CardTitle></CardHeader><CardContent className="space-y-4"><select value={adhocSkuId} onChange={(e) => setAdhocSkuId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select SKU</option>{skus.map((sku) => <option key={sku.id} value={sku.id}>{sku.sku} — {sku.variant.product.name}</option>)}</select><select value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><Input type="number" value={adhocQty} onChange={(e) => setAdhocQty(e.target.value)} /><Button onClick={receiveWithoutPo}>Receive Inventory</Button></CardContent></Card></div>}
    </div>
  );
}
