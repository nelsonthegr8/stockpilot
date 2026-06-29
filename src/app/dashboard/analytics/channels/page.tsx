"use client";

import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/shared";

type AnalyticsResponse = { orders: Array<{ total: number; channelId: string | null }> };
type Channel = { id: string; name: string };
const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0f766e"];

export default function ChannelProfitabilityPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  useEffect(() => { Promise.all([fetch("/api/analytics").then((r) => r.json()), fetch("/api/channels").then((r) => r.json())]).then(([analyticsData, channelData]) => { setAnalytics(analyticsData); setChannels(channelData); }); }, []);
  const rows = useMemo(() => {
    if (!analytics) return [];
    const map = new Map<string, { channel: string; orders: number; revenue: number }>();
    analytics.orders.forEach((order) => { const channel = channels.find((item) => item.id === order.channelId)?.name ?? "Manual"; const current = map.get(channel) ?? { channel, orders: 0, revenue: 0 }; current.orders += 1; current.revenue += order.total; map.set(channel, current); });
    return Array.from(map.values());
  }, [analytics, channels]);
  return <div className="space-y-6 p-6"><PageHeader title="Channel Profitability" description="Revenue mix across connected sales channels." /><div className="grid gap-6 xl:grid-cols-[1fr_2fr]"><Card><CardHeader><CardTitle>Revenue Mix</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={rows} dataKey="revenue" nameKey="channel" outerRadius={110}>{rows.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card><Card><CardContent className="pt-4"><Table><TableHeader><TableRow><TableHead>Channel</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.channel}><TableCell>{row.channel}</TableCell><TableCell className="text-right">{row.orders}</TableCell><TableCell className="text-right">${row.revenue.toFixed(2)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div></div>;
}
