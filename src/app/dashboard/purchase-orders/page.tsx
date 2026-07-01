import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/shared";

export default async function PurchaseOrdersPage() {
  const pos = await prisma.purchaseOrder.findMany({ include: { supplier: true, location: true, items: true }, orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Purchase Orders" description="Track incoming replenishment and production orders." action={<Link href="/dashboard/purchase-orders/new" className={buttonVariants()}>New PO</Link>} />
      <Card><CardContent className="pt-4"><Table><TableHeader><TableRow><TableHead>PO</TableHead><TableHead>Supplier</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead><TableHead>Items</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{pos.map((po) => <TableRow key={po.id}><TableCell className="font-mono text-sm">{po.id.slice(-8).toUpperCase()}</TableCell><TableCell>{po.supplier?.name ?? "Internal"}</TableCell><TableCell>{po.location.name}</TableCell><TableCell>{po.status}</TableCell><TableCell>{po.items.length}</TableCell><TableCell><Link href={`/dashboard/purchase-orders/${po.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>Open</Link></TableCell></TableRow>)}{!pos.length ? <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No purchase orders yet.</TableCell></TableRow> : null}</TableBody></Table></CardContent></Card>
    </div>
  );
}
