import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, ProgressBar, StatCard } from "@/components/dashboard/shared";

const STATUS_STEPS = ["PENDING", "AWAITING_FULFILLMENT", "IN_PRODUCTION", "READY_TO_SHIP", "SHIPPED", "DELIVERED"];

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  await auth();
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      channel: true,
      items: { include: { sku: { include: { variant: { include: { product: true } } } }, printJobs: true } },
      shipments: true,
      pickLists: true,
      financial: true,
    },
  });

  if (!order) notFound();

  const timelineProgress = ((Math.max(STATUS_STEPS.indexOf(order.status), 0) + 1) / STATUS_STEPS.length) * 100;

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={`Order ${order.id.slice(-8).toUpperCase()}`} description={order.customerName ?? order.customerEmail ?? "Manual order"} action={<Link href={`/dashboard/shipping/${order.id}`} className={buttonVariants({ variant: "outline" })}>Open shipping</Link>} />
      <div className="grid gap-4 md:grid-cols-3"><StatCard title="Status" value={order.status.replaceAll("_", " ")} hint={order.channel?.name ?? "Manual channel"} /><StatCard title="Total" value={`$${Number(order.total).toFixed(2)}`} hint={`${order.items.length} line item(s)`} /><StatCard title="Net profit" value={order.financial ? `$${Number(order.financial.netProfit).toFixed(2)}` : "—"} hint={order.financial ? `Revenue $${Number(order.financial.revenue).toFixed(2)}` : "No financial snapshot yet"} /></div>
      <Card><CardHeader><CardTitle>Status timeline</CardTitle></CardHeader><CardContent className="space-y-4"><ProgressBar value={timelineProgress} /><div className="grid gap-3 md:grid-cols-6">{STATUS_STEPS.map((step) => { const active = STATUS_STEPS.indexOf(step) <= Math.max(STATUS_STEPS.indexOf(order.status), 0); return <Badge key={step} variant={active ? "default" : "outline"} className="justify-center">{step.replaceAll("_", " ")}</Badge>; })}</div></CardContent></Card>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]"><Card><CardHeader><CardTitle>Line items</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead>Print jobs</TableHead></TableRow></TableHeader><TableBody>{order.items.map((item) => <TableRow key={item.id}><TableCell className="font-mono text-sm">{item.sku.sku}</TableCell><TableCell>{item.sku.variant.product.name} — {item.sku.variant.name}</TableCell><TableCell className="text-right">{item.qty}</TableCell><TableCell className="text-right">${Number(item.unitPrice).toFixed(2)}</TableCell><TableCell>{item.printJobs.length ? `${item.printJobs.length} queued` : "—"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card><div className="space-y-6"><Card><CardHeader><CardTitle>Actions</CardTitle></CardHeader><CardContent className="grid gap-2"><Link href={`/dashboard/shipping/${order.id}`} className={buttonVariants()}>Rate shop / ship</Link><Link href="/dashboard/picking" className={buttonVariants({ variant: "outline" })}>View pick lists</Link><Link href="/dashboard/print-queue" className={buttonVariants({ variant: "outline" })}>View print jobs</Link></CardContent></Card><Card><CardHeader><CardTitle>Shipping</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">{order.shipments.length ? order.shipments.map((shipment) => <div key={shipment.id} className="rounded-lg border p-3"><p className="font-medium">{shipment.serviceLevel ?? shipment.status}</p><p className="text-muted-foreground">Tracking: {shipment.trackingNumber ?? "Pending"}</p>{shipment.labelUrl ? <a href={shipment.labelUrl} className="text-primary underline" target="_blank">Label</a> : null}</div>) : <p className="text-muted-foreground">No shipments created yet.</p>}</CardContent></Card></div></div>
    </div>
  );
}
