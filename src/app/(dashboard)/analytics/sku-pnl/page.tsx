"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/shared";

type OrderResponse = { orders: Array<{ items: Array<{ qty: number; unitPrice: number | string; sku: { sku: string; costPrice: number | string; variant: { product: { name: string } } } }> }> };

export default function SkuPnlPage() {
  const [orders, setOrders] = useState<OrderResponse["orders"]>([]);
  useEffect(() => { fetch("/api/orders?limit=100").then((res) => res.json()).then((data) => setOrders(data.orders ?? [])); }, []);
  const rows = useMemo(() => {
    const map = new Map<string, { sku: string; product: string; revenue: number; cogs: number; qty: number }>();
    orders.forEach((order) => order.items.forEach((item) => { const current = map.get(item.sku.sku) ?? { sku: item.sku.sku, product: item.sku.variant.product.name, revenue: 0, cogs: 0, qty: 0 }; current.qty += item.qty; current.revenue += Number(item.unitPrice) * item.qty; current.cogs += Number(item.sku.costPrice) * item.qty; map.set(item.sku.sku, current); }));
    return Array.from(map.values()).map((row) => ({ ...row, profit: row.revenue - row.cogs })).sort((a, b) => b.profit - a.profit);
  }, [orders]);
  return <div className="space-y-6 p-6"><PageHeader title="SKU P&L" description="Contribution margin by SKU." /><Card><CardHeader><CardTitle>Top SKU Profit</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows.slice(0, 10)}><XAxis dataKey="sku" hide /><YAxis /><Tooltip /><Bar dataKey="profit" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></CardContent></Card><Card><CardContent className="pt-4"><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">COGS</TableHead><TableHead className="text-right">Profit</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.sku}><TableCell className="font-mono text-sm">{row.sku}</TableCell><TableCell>{row.product}</TableCell><TableCell className="text-right">{row.qty}</TableCell><TableCell className="text-right">${row.revenue.toFixed(2)}</TableCell><TableCell className="text-right">${row.cogs.toFixed(2)}</TableCell><TableCell className="text-right">${row.profit.toFixed(2)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div>;
}
