import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/shared";

export default async function ShippingPage() {
  const orders = await prisma.order.findMany({ where: { status: "READY_TO_SHIP" }, include: { items: true, shipments: true }, orderBy: { placedAt: "asc" } });
  return <div className="space-y-6 p-6"><PageHeader title="Shipping" description="Orders ready for label creation or manual shipment entry." /><Card><CardContent className="pt-4"><Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Items</TableHead><TableHead>Shipments</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{orders.map((order) => <TableRow key={order.id}><TableCell className="font-mono text-sm">{order.id.slice(-8).toUpperCase()}</TableCell><TableCell>{order.customerName ?? "—"}</TableCell><TableCell>{order.items.length}</TableCell><TableCell>{order.shipments.length}</TableCell><TableCell><Link href={`/dashboard/shipping/${order.id}`} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Ship</Link></TableCell></TableRow>)}{!orders.length ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No orders are ready to ship.</TableCell></TableRow> : null}</TableBody></Table></CardContent></Card></div>;
}

