"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/shared";

type Location = { id: string; name: string };
type Sku = { id: string; sku: string; barcode: string | null; variant: { product: { name: string } } };

export default function InventoryCountPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [locationId, setLocationId] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [skuId, setSkuId] = useState("");
  const [countedQty, setCountedQty] = useState("0");
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/locations").then((r) => r.json()), fetch("/api/skus").then((r) => r.json())]).then(([locationData, skuData]) => { setLocations(locationData); setSkus(skuData); setLocationId(locationData[0]?.id ?? ""); });
  }, []);

  function matchScan(code: string) {
    const match = skus.find((sku) => sku.sku === code || sku.barcode === code);
    if (match) setSkuId(match.id);
    setScanValue("");
  }

  async function submitCount() {
    await fetch("/api/inventory/adjust", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skuId, locationId, qty: Number(countedQty), reason: "CYCLE_COUNT" }) });
    setMessage("Count adjustment recorded.");
  }

  return <div className="space-y-6 p-6"><PageHeader title="Cycle Count" description="Scan a SKU, enter the counted quantity, and create an adjustment record." /><Card><CardHeader><CardTitle>Count Session</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><Input value={scanValue} onChange={(e) => setScanValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); matchScan(scanValue); } }} placeholder="Scan SKU barcode" /><select value={skuId} onChange={(e) => setSkuId(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2"><option value="">Select SKU</option>{skus.map((sku) => <option key={sku.id} value={sku.id}>{sku.sku} — {sku.variant.product.name}</option>)}</select><Input type="number" value={countedQty} onChange={(e) => setCountedQty(e.target.value)} /><Button onClick={submitCount}>Confirm Count</Button></CardContent></Card>{message ? <Card><CardContent className="p-4 text-sm">{message}</CardContent></Card> : null}</div>;
}
