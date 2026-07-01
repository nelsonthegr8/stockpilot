"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/shared";

type Location = { id: string; name: string };
type Sku = { id: string; sku: string; barcode: string | null; variant: { product: { name: string } } };

export default function PrintedPartsReceivePage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [locationId, setLocationId] = useState("");
  const [search, setSearch] = useState("");
  const [skuId, setSkuId] = useState("");
  const [qty, setQty] = useState("1");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/locations").then((r) => r.json()),
      fetch("/api/skus?limit=500").then((r) => r.json()),
    ])
      .then(([locationData, skuData]) => {
        setLocations(Array.isArray(locationData) ? locationData : []);
        // /api/skus returns { skus: [], total: N } — extract the array
        const skuArray = Array.isArray(skuData) ? skuData : (skuData?.skus ?? []);
        setSkus(skuArray);
        setLocationId(locationData[0]?.id ?? "");
      })
      .catch((err) => {
        console.error("Failed to load receive data:", err);
        setMessage("Failed to load data. Please refresh.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = skus.filter((sku) => !search || sku.sku.toLowerCase().includes(search.toLowerCase()) || sku.barcode?.includes(search));

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  async function confirmReceipt() {
    await fetch("/api/inventory/adjust", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skuId, locationId, qty: Number(qty), reason: "PRINTED_PARTS_RECEIVE" }) });
    setMessage(`Received ${qty} units and generated ready-to-print label data for ${filtered.find((item) => item.id === skuId)?.sku ?? "SKU"}.`);
  }

  return <div className="space-y-6 p-6"><PageHeader back={{ href: "/dashboard/inventory", label: "Inventory" }} title="Receive Printed Parts" description="Quick-flow for freshly printed inventory with label prep." /><Card><CardHeader><CardTitle>Printed Part Intake</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Scan barcode or search SKU" /><select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><select value={skuId} onChange={(e) => setSkuId(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2"><option value="">Select SKU</option>{filtered.map((sku) => <option key={sku.id} value={sku.id}>{sku.sku} — {sku.variant.product.name}</option>)}</select><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /><Button onClick={confirmReceipt}>Confirm & Generate Labels</Button></CardContent></Card>{message ? <Card><CardContent className="p-4 text-sm">{message}</CardContent></Card> : null}</div>;
}
