"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, StatCard } from "@/components/dashboard/shared";

type AnalyticsResponse = { totalRevenue: number; totalOrders: number; avgOrderValue: number; orders: Array<{ total: number; placedAt: string; channelId: string | null }> };
type Channel = { id: string; name: string };
type Sku = { costPrice: number | string; inventoryLevels: Array<{ qty: number }> };

export default function AnalyticsPage() {
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);

  useEffect(() => {
    Promise.all([fetch(`/api/analytics?dateFrom=${from}&dateTo=${to}`).then((r) => r.json()), fetch("/api/channels").then((r) => r.json()), fetch("/api/skus").then((r) => r.json())]).then(([analyticsData, channelData, skuData]) => { setAnalytics(analyticsData); setChannels(channelData); setSkus(skuData); });
  }, [from, to]);

  const revenueByChannel = useMemo(() => {
    if (!analytics) return [];
    const map = new Map<string, number>();
    analytics.orders.forEach((order) => { const label = channels.find((channel) => channel.id === order.channelId)?.name ?? "Manual"; map.set(label, (map.get(label) ?? 0) + order.total); });
    return Array.from(map.entries()).map(([channel, revenue]) => ({ channel, revenue: Number(revenue.toFixed(2)) }));
  }, [analytics, channels]);

  const ordersOverTime = useMemo(() => {
    if (!analytics) return [];
    const map = new Map<string, number>();
    analytics.orders.forEach((order) => { const day = new Date(order.placedAt).toISOString().slice(5, 10); map.set(day, (map.get(day) ?? 0) + 1); });
    return Array.from(map.entries()).map(([day, orders]) => ({ day, orders }));
  }, [analytics]);

  const inventoryValuation = useMemo(() => skus.reduce((sum, sku) => sum + Number(sku.costPrice) * sku.inventoryLevels.reduce((qty, level) => qty + level.qty, 0), 0), [skus]);

  function exportCsv() {
    if (!analytics) return;
    const rows = ["placed_at,channel,total", ...analytics.orders.map((order) => `${order.placedAt},${channels.find((channel) => channel.id === order.channelId)?.name ?? "Manual"},${order.total.toFixed(2)}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stockpilot-analytics-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Analytics" description="Revenue, order, and inventory performance." action={<Button onClick={exportCsv}>Export CSV</Button>} />
      <div className="flex flex-wrap gap-3"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" /><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" /></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><StatCard title="Total Revenue" value={`$${analytics?.totalRevenue.toFixed(2) ?? "0.00"}`} /><StatCard title="Total Orders" value={analytics?.totalOrders ?? 0} /><StatCard title="Avg Order Value" value={`$${analytics?.avgOrderValue.toFixed(2) ?? "0.00"}`} /><StatCard title="Inventory Valuation" value={`$${inventoryValuation.toFixed(2)}`} /></div>
      <div className="grid gap-6 xl:grid-cols-2"><Card><CardHeader><CardTitle>Revenue by Channel</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={revenueByChannel}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="channel" /><YAxis /><Tooltip /><Bar dataKey="revenue" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></CardContent></Card><Card><CardHeader><CardTitle>Orders Over Time</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={ordersOverTime}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} /></LineChart></ResponsiveContainer></CardContent></Card></div>
    </div>
  );
}
