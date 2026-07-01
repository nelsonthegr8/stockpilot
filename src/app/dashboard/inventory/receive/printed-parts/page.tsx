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

  useEffect(() => {
    Promise.all([fetch("/api/locations").then((r) => r.json()), fetch("/api/skus").then((r) => r.json())]).then(([locationData, skuData]) => { setLocations(locationData); setSkus(skuData); setLocationId(locationData[0]?.id ?? ""); });
  }, []);

  const filtered = skus.filter((sku) => !search || sku.sku.toLowerCase().includes(search.toLowerCase()) || sku.barcode?.includes(search));

  async function confirmReceipt() {
    const res = await fetch("/api/inventory/adjust", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skuId, locationId, qty: Number(qty), reason: "PRINTED_PARTS_RECEIVE" }) });
    if (!res.ok) { setMessage("Failed to record receipt."); return; }
    await fetch("/api/inventory/fulfill-pending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skuId, locationId }),
    });
    setMessage(`Received ${qty} units. Checked pending orders for fulfillment.`);
  }

  return <div className="space-y-6 p-6"><PageHeader back={{ href: "/dashboard/inventory", label: "Inventory" }} title="Receive Printed Parts" description="Quick-flow for freshly printed inventory with label prep." /><Card><CardHeader><CardTitle>Printed Part Intake</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Scan barcode or search SKU" /><select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><select value={skuId} onChange={(e) => setSkuId(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2"><option value="">Select SKU</option>{filtered.map((sku) => <option key={sku.id} value={sku.id}>{sku.sku} — {sku.variant.product.name}</option>)}</select><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /><Button onClick={confirmReceipt}>Confirm & Generate Labels</Button></CardContent></Card>{message ? <Card><CardContent className="p-4 text-sm">{message}</CardContent></Card> : null}</div>;
}
