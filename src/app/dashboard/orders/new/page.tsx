"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/dashboard/shared";
import { Plus, Trash2 } from "lucide-react";

type SkuOption = { id: string; sku: string; barcode: string | null; retailPrice: number | string; variant: { name: string; product: { name: string } } };

export default function NewOrderPage() {
  const router = useRouter();
  const [skus, setSkus] = useState<SkuOption[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ skuId: "", qty: 1, unitPrice: "0.00" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/skus").then((res) => res.json()).then((data) => setSkus(Array.isArray(data) ? data : [])).catch(() => setSkus([]));
  }, []);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.unitPrice || 0) * item.qty, 0), [items]);

  async function createOrder() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName, customerEmail, notes, shippingAddress: { street1: address1, city, state: stateCode, zip, country: "US", name: customerName }, items: items.filter((item) => item.skuId).map((item) => ({ skuId: item.skuId, qty: item.qty, unitPrice: Number(item.unitPrice) })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to create order");
      router.push(`/dashboard/orders/${data.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="New Order" description="Create a manual order and immediately route it into fulfillment." back={{ href: "/dashboard/orders", label: "Orders" }} action={<Button onClick={createOrder} disabled={saving}>{saving ? "Saving…" : "Create Order"}</Button>} />
      {error ? <Alert variant="destructive"><AlertTitle>Order creation failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]"><div className="space-y-6"><Card><CardHeader><CardTitle>Customer</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div><Label>Name</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div><div><Label>Email</Label><Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} /></div><div className="md:col-span-2"><Label>Address</Label><Input value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="123 Main St" /></div><div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div><div className="grid gap-4 md:grid-cols-2"><div><Label>State</Label><Input value={stateCode} onChange={(e) => setStateCode(e.target.value)} /></div><div><Label>ZIP</Label><Input value={zip} onChange={(e) => setZip(e.target.value)} /></div></div><div className="md:col-span-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div></CardContent></Card><Card><CardHeader><CardTitle>Items</CardTitle></CardHeader><CardContent className="space-y-4">{items.map((item, index) => <div key={index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[2fr_120px_140px_auto]"><select value={item.skuId} onChange={(e) => { const chosen = skus.find((sku) => sku.id === e.target.value); setItems((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, skuId: e.target.value, unitPrice: chosen ? Number(chosen.retailPrice).toFixed(2) : row.unitPrice } : row)); }} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select SKU</option>{skus.map((sku) => <option key={sku.id} value={sku.id}>{sku.sku} — {sku.variant.product.name}</option>)}</select><Input type="number" min="1" value={item.qty} onChange={(e) => setItems((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, qty: Number(e.target.value) } : row))} /><Input type="number" step="0.01" value={item.unitPrice} onChange={(e) => setItems((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, unitPrice: e.target.value } : row))} /><Button type="button" variant="ghost" size="icon" onClick={() => setItems((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}<Button type="button" variant="outline" onClick={() => setItems((prev) => [...prev, { skuId: "", qty: 1, unitPrice: "0.00" }])}><Plus className="mr-2 h-4 w-4" />Add Item</Button></CardContent></Card></div><Card><CardHeader><CardTitle>Summary</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><div className="flex justify-between"><span>Line items</span><span>{items.filter((item) => item.skuId).length}</span></div><div className="flex justify-between text-lg font-semibold"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div></CardContent></Card></div>
    </div>
  );
}
