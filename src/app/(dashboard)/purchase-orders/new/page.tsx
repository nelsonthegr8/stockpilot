"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/shared";

type Supplier = { id: string; name: string };
type Location = { id: string; name: string };
type Sku = { id: string; sku: string; variant: { product: { name: string } } };

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ skuId: "", qtyOrdered: 1, unitCost: "0.00" }]);

  useEffect(() => {
    Promise.all([fetch("/api/suppliers").then((r) => r.json()), fetch("/api/locations").then((r) => r.json()), fetch("/api/skus").then((r) => r.json())]).then(([supplierData, locationData, skuData]) => { setSuppliers(supplierData); setLocations(locationData); setSkus(skuData); setLocationId(locationData[0]?.id ?? ""); });
  }, []);

  async function createPo() {
    const response = await fetch("/api/purchase-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId: supplierId || undefined, locationId, expectedDate: expectedDate || undefined, notes, items: items.filter((item) => item.skuId).map((item) => ({ skuId: item.skuId, qtyOrdered: item.qtyOrdered, unitCost: Number(item.unitCost) })) }) });
    const data = await response.json();
    router.push(`/dashboard/purchase-orders/${data.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="New Purchase Order" description="Create a replenishment PO or internal production batch." action={<Button onClick={createPo}>Create PO</Button>} />
      <Card><CardHeader><CardTitle>Header</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">No supplier / internal</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} /><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" /></CardContent></Card>
      <Card><CardHeader><CardTitle>Items</CardTitle></CardHeader><CardContent className="space-y-4">{items.map((item, index) => <div key={index} className="grid gap-3 md:grid-cols-[2fr_120px_140px]"><select value={item.skuId} onChange={(e) => setItems((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, skuId: e.target.value } : row))} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select SKU</option>{skus.map((sku) => <option key={sku.id} value={sku.id}>{sku.sku} — {sku.variant.product.name}</option>)}</select><Input type="number" min="1" value={item.qtyOrdered} onChange={(e) => setItems((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, qtyOrdered: Number(e.target.value) } : row))} /><Input type="number" step="0.01" value={item.unitCost} onChange={(e) => setItems((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, unitCost: e.target.value } : row))} /></div>)}<Button variant="outline" onClick={() => setItems((prev) => [...prev, { skuId: "", qtyOrdered: 1, unitCost: "0.00" }])}>Add item</Button></CardContent></Card>
    </div>
  );
}
