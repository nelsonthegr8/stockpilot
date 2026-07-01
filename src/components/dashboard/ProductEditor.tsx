"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import bwipjs from "bwip-js";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/dashboard/shared";
import { DeleteProductButton } from "@/components/dashboard/DeleteProductButton";
import { Plus, Trash2 } from "lucide-react";

type CategoryOption = { id: string; name: string };

type ProductShape = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  businessProfileType: "THREE_D_PRINT" | "RETAIL_ARBITRAGE" | "DROP_SHIP" | "WHOLESALE";
  active: boolean;
  variants: Array<{
    id: string;
    name: string;
    attributes: Record<string, string> | null;
    active: boolean;
    skus: Array<{
      id: string;
      sku: string;
      barcode: string | null;
      weight: number | null;
      length: number | null;
      width: number | null;
      height: number | null;
      costPrice: number | string;
      retailPrice: number | string;
      reorderPoint: number;
      reorderQty: number;
      stlFileUrl: string | null;
      sourceStore: string | null;
      sourcedDate: string | Date | null;
    }>;
  }>;
};

function BarcodeCanvas({ value }: { value: string }) {
  const canvasRef = (node: HTMLCanvasElement | null) => {
    if (!node || !value) return;
    bwipjs.toCanvas(node, {
      bcid: "code128",
      text: value,
      scale: 2,
      height: 10,
      includetext: true,
      textxalign: "center",
    });
  };

  return <canvas ref={canvasRef} className="max-w-full" />;
}

export function ProductEditor({
  mode,
  categories,
  initialProduct,
}: {
  mode: "create" | "edit";
  categories: CategoryOption[];
  initialProduct?: ProductShape;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  const primaryVariant = initialProduct?.variants[0];
  const primarySku = primaryVariant?.skus[0];
  const initialAttributes = useMemo(() => {
    if (!primaryVariant?.attributes) return [{ key: "", value: "" }];
    const entries = Object.entries(primaryVariant.attributes);
    return entries.length ? entries.map(([key, value]) => ({ key, value })) : [{ key: "", value: "" }];
  }, [primaryVariant]);

  const [name, setName] = useState(initialProduct?.name ?? "");
  const [description, setDescription] = useState(initialProduct?.description ?? "");
  const [businessProfileType, setBusinessProfileType] = useState<ProductShape["businessProfileType"]>(initialProduct?.businessProfileType ?? "WHOLESALE");
  const [categoryId, setCategoryId] = useState(initialProduct?.categoryId ?? "");
  const [active, setActive] = useState(initialProduct?.active ?? true);
  const [variantName, setVariantName] = useState(primaryVariant?.name ?? "Default Variant");
  const [attributes, setAttributes] = useState(initialAttributes);
  const [skuCode, setSkuCode] = useState(primarySku?.sku ?? "");
  const [barcode, setBarcode] = useState(primarySku?.barcode ?? "");
  const [weight, setWeight] = useState(primarySku?.weight?.toString() ?? "");
  const [length, setLength] = useState(primarySku?.length?.toString() ?? "");
  const [width, setWidth] = useState(primarySku?.width?.toString() ?? "");
  const [height, setHeight] = useState(primarySku?.height?.toString() ?? "");
  const [costPrice, setCostPrice] = useState(primarySku ? Number(primarySku.costPrice).toFixed(2) : "0.00");
  const [retailPrice, setRetailPrice] = useState(primarySku ? Number(primarySku.retailPrice).toFixed(2) : "0.00");
  const [reorderPoint, setReorderPoint] = useState(primarySku?.reorderPoint?.toString() ?? "0");
  const [reorderQty, setReorderQty] = useState(primarySku?.reorderQty?.toString() ?? "0");
  const [stlFileUrl, setStlFileUrl] = useState(primarySku?.stlFileUrl ?? "");
  const [sourceStore, setSourceStore] = useState(primarySku?.sourceStore ?? "");
  const [sourcedDate, setSourcedDate] = useState(primarySku?.sourcedDate ? new Date(primarySku.sourcedDate).toISOString().slice(0, 10) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [boxPresets, setBoxPresets] = useState<{ id: string; name: string }[]>([]);
  const [skuPackSettings, setSkuPackSettings] = useState<Record<string, { boxPresetId: string; qtyPerBox: string }>>({});

  useEffect(() => {
    fetch("/api/pack-presets").then(r => r.json()).then(setBoxPresets).catch(() => {});
  }, []);

  useEffect(() => {
    if (!primarySku?.id) return;
    fetch(`/api/pack-settings/${primarySku.id}`)
      .then(r => r.json())
      .then(data => {
        if (data?.boxPresetId) {
          setSkuPackSettings(prev => ({ ...prev, [primarySku.id]: { boxPresetId: data.boxPresetId, qtyPerBox: String(data.qtyPerBox ?? 1) } }));
        }
      })
      .catch(() => {});
  }, [primarySku?.id]);

  function updateSkuPackSetting(skuId: string, field: "boxPresetId" | "qtyPerBox", value: string) {
    setSkuPackSettings(prev => ({ ...prev, [skuId]: { ...(prev[skuId] ?? { boxPresetId: "", qtyPerBox: "1" }), [field]: value } }));
  }

  async function submitForm() {
    setSaving(true);
    setError(null);
    try {
      const productPayload = { name, description: description || undefined, categoryId: categoryId || undefined, businessProfileType, active };
      let productId = initialProduct?.id;
      if (mode === "create") {
        const productRes = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(productPayload) });
        const productData = await productRes.json();
        if (!productRes.ok) throw new Error(productData.error ?? "Failed to create product");
        productId = productData.id;
      } else {
        const productRes = await fetch(`/api/products/${initialProduct!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(productPayload) });
        const productData = await productRes.json();
        if (!productRes.ok) throw new Error(productData.error ?? "Failed to update product");
      }

      const attributeMap = Object.fromEntries(attributes.filter((item) => item.key).map((item) => [item.key, item.value]));
      let variantId = primaryVariant?.id;
      if (variantId) {
        const variantRes = await fetch(`/api/variants/${variantId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: variantName, attributes: attributeMap, active }) });
        const variantData = await variantRes.json();
        if (!variantRes.ok) throw new Error(variantData.error ?? "Failed to update variant");
      } else {
        const variantRes = await fetch("/api/variants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, name: variantName, attributes: attributeMap, active }) });
        const variantData = await variantRes.json();
        if (!variantRes.ok) throw new Error(variantData.error ?? "Failed to create variant");
        variantId = variantData.id;
      }

      const skuPayload = {
        variantId,
        sku: skuCode,
        barcode: barcode || undefined,
        weight: weight ? Number(weight) : undefined,
        length: length ? Number(length) : undefined,
        width: width ? Number(width) : undefined,
        height: height ? Number(height) : undefined,
        costPrice: Number(costPrice || 0),
        retailPrice: Number(retailPrice || 0),
        reorderPoint: Number(reorderPoint || 0),
        reorderQty: Number(reorderQty || 0),
        stlFileUrl: businessProfileType === "THREE_D_PRINT" ? stlFileUrl || undefined : undefined,
        sourceStore: businessProfileType === "RETAIL_ARBITRAGE" ? sourceStore || undefined : undefined,
        sourcedDate: businessProfileType === "RETAIL_ARBITRAGE" ? sourcedDate || undefined : undefined,
      };

      if (primarySku?.id) {
        const skuRes = await fetch(`/api/skus/${primarySku.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(skuPayload) });
        const skuData = await skuRes.json();
        if (!skuRes.ok) throw new Error(skuData.error ?? "Failed to update SKU");
      } else {
        const skuRes = await fetch("/api/skus", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(skuPayload) });
        const skuData = await skuRes.json();
        if (!skuRes.ok) throw new Error(skuData.error ?? "Failed to create SKU");
      }

      // Save pack settings
      const resolvedSkuId = primarySku?.id;
      if (resolvedSkuId) {
        const setting = skuPackSettings[resolvedSkuId];
        if (setting?.boxPresetId) {
          await fetch(`/api/pack-settings/${resolvedSkuId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ boxPresetId: setting.boxPresetId, qtyPerBox: parseInt(setting.qtyPerBox) || 1 }),
          });
        } else {
          await fetch(`/api/pack-settings/${resolvedSkuId}`, { method: "DELETE" }).catch(() => {});
        }
      }

      router.push(`/dashboard/products/${productId}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader back={{ href: "/dashboard/products", label: "Products" }} title={mode === "create" ? "New Product" : "Edit Product"} description="Manage product, variant, and SKU data in one place." action={<div className="flex items-center gap-2">{mode === "edit" && initialProduct && isAdmin ? <DeleteProductButton productId={initialProduct.id} productName={initialProduct.name} /> : null}<Button onClick={submitForm} disabled={saving || !name || !skuCode}>{saving ? "Saving…" : mode === "create" ? "Create Product" : "Save Changes"}</Button></div>} />
      {error ? <Alert variant="destructive"><AlertTitle>Unable to save</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Product</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><Label htmlFor="product-name">Name</Label><Input id="product-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bambu Benchy" /></div><div className="md:col-span-2"><Label htmlFor="product-description">Description</Label><Textarea id="product-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Customer-facing product description" /></div><div><Label htmlFor="product-profile">Business profile</Label><select id="product-profile" value={businessProfileType} onChange={(e) => setBusinessProfileType(e.target.value as ProductShape["businessProfileType"])} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="THREE_D_PRINT">3D Print</option><option value="RETAIL_ARBITRAGE">Retail Arbitrage</option><option value="DROP_SHIP">Drop Ship</option><option value="WHOLESALE">Wholesale</option></select></div><div><Label htmlFor="product-category">Category</Label><select id="product-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div className="md:col-span-2 flex items-center justify-between rounded-lg border p-4"><div><p className="font-medium">Active listing</p><p className="text-sm text-muted-foreground">Inactive products remain in history but are hidden from new workflows.</p></div><Switch checked={active} onCheckedChange={setActive} /></div></CardContent></Card>
          <Card><CardHeader><CardTitle>Variant</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="variant-name">Variant name</Label><Input id="variant-name" value={variantName} onChange={(e) => setVariantName(e.target.value)} placeholder="Standard" /></div><div className="space-y-3"><div className="flex items-center justify-between"><Label>Attributes</Label><Button type="button" variant="outline" size="sm" onClick={() => setAttributes((prev) => [...prev, { key: "", value: "" }])}><Plus className="mr-2 h-4 w-4" />Add attribute</Button></div>{attributes.map((attribute, index) => <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"><Input value={attribute.key} onChange={(e) => setAttributes((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, key: e.target.value } : item))} placeholder="Color" /><Input value={attribute.value} onChange={(e) => setAttributes((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, value: e.target.value } : item))} placeholder="Black" /><Button type="button" variant="ghost" size="icon" onClick={() => setAttributes((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>SKU</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><div><Label htmlFor="sku-code">SKU code</Label><Input id="sku-code" value={skuCode} onChange={(e) => setSkuCode(e.target.value)} placeholder="SKU-1001" /></div><div><Label htmlFor="sku-barcode">Barcode</Label><Input id="sku-barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="012345678905" /></div><div><Label htmlFor="sku-cost">Cost price</Label><Input id="sku-cost" type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} /></div><div><Label htmlFor="sku-retail">Retail price</Label><Input id="sku-retail" type="number" step="0.01" value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} /></div><div><Label htmlFor="sku-reorder-point">Reorder point</Label><Input id="sku-reorder-point" type="number" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} /></div><div><Label htmlFor="sku-reorder-qty">Reorder qty</Label><Input id="sku-reorder-qty" type="number" value={reorderQty} onChange={(e) => setReorderQty(e.target.value)} /></div><div><Label htmlFor="sku-weight">Weight (oz)</Label><Input id="sku-weight" type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} /></div><div><Label htmlFor="sku-length">Length (in)</Label><Input id="sku-length" type="number" step="0.01" value={length} onChange={(e) => setLength(e.target.value)} /></div><div><Label htmlFor="sku-width">Width (in)</Label><Input id="sku-width" type="number" step="0.01" value={width} onChange={(e) => setWidth(e.target.value)} /></div><div><Label htmlFor="sku-height">Height (in)</Label><Input id="sku-height" type="number" step="0.01" value={height} onChange={(e) => setHeight(e.target.value)} /></div>{primarySku?.id ? <div className="md:col-span-2 xl:col-span-3 border-t pt-3 mt-1"><p className="text-sm font-medium mb-2">Box Preset</p><div className="grid grid-cols-2 gap-2"><select value={skuPackSettings[primarySku.id]?.boxPresetId ?? ""} onChange={(e) => updateSkuPackSetting(primarySku.id, "boxPresetId", e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="">No preset</option>{boxPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" min="1" placeholder="Qty per box" value={skuPackSettings[primarySku.id]?.qtyPerBox ?? ""} onChange={(e) => updateSkuPackSetting(primarySku.id, "qtyPerBox", e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" /></div></div> : null}</CardContent></Card>
          {businessProfileType === "THREE_D_PRINT" ? <Card><CardHeader><CardTitle>3D print settings</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="stl-file">STL file URL</Label><Input id="stl-file" value={stlFileUrl} onChange={(e) => setStlFileUrl(e.target.value)} placeholder="https://.../model.stl" /></div><Badge>Print queue will use this SKU when mapped to BambuBuddy archives.</Badge></CardContent></Card> : null}
          {businessProfileType === "RETAIL_ARBITRAGE" ? <Card><CardHeader><CardTitle>Sourcing details</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div><Label htmlFor="source-store">Source store</Label><Input id="source-store" value={sourceStore} onChange={(e) => setSourceStore(e.target.value)} placeholder="Target" /></div><div><Label htmlFor="sourced-date">Sourced date</Label><Input id="sourced-date" type="date" value={sourcedDate} onChange={(e) => setSourcedDate(e.target.value)} /></div></CardContent></Card> : null}
          {businessProfileType === "DROP_SHIP" ? <Alert><AlertTitle>Drop ship workflow</AlertTitle><AlertDescription>Use the SKU code as the internal catalog number and store the supplier SKU in purchasing or channel notes.</AlertDescription></Alert> : null}
        </div>
        <div className="space-y-6"><Card><CardHeader><CardTitle>Preview</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><div><p className="text-muted-foreground">Profile</p><p className="font-medium">{businessProfileType.replaceAll("_", " ")}</p></div><div><p className="text-muted-foreground">Pricing</p><p className="font-medium">${Number(retailPrice || 0).toFixed(2)} retail / ${Number(costPrice || 0).toFixed(2)} cost</p></div><div><p className="text-muted-foreground">Barcode</p>{barcode ? <BarcodeCanvas value={barcode} /> : <p className="text-muted-foreground">Add a barcode to preview labels.</p>}</div></CardContent></Card>{initialProduct?.variants.length ? <Card><CardHeader><CardTitle>Existing SKUs</CardTitle></CardHeader><CardContent className="space-y-3">{initialProduct.variants.flatMap((variant) => variant.skus.map((sku) => <div key={sku.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><div><p className="font-medium">{sku.sku}</p><p className="text-xs text-muted-foreground">{variant.name} · ${Number(sku.retailPrice).toFixed(2)}</p></div>{sku.barcode ? <Badge variant="outline">{sku.barcode}</Badge> : null}</div></div>))}</CardContent></Card> : null}</div>
      </div>
    </div>
  );
}
