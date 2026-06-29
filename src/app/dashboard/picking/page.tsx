import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/shared";

export default async function PickingPage() {
  await auth();
  const [pickLists, users, eligibleOrders] = await Promise.all([
    prisma.pickList.findMany({ include: { assignee: true, items: true, orders: true }, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, email: true } }),
    prisma.order.findMany({ where: { status: "AWAITING_FULFILLMENT" }, take: 10, orderBy: { placedAt: "asc" }, select: { id: true, customerName: true } }),
  ]);

  async function createSuggestedPickList() {
    "use server";
    const orders = await prisma.order.findMany({ where: { status: "AWAITING_FULFILLMENT" }, take: 10, include: { items: { where: { stockReserved: true } } } });
    const orderIds = orders.filter((order) => order.items.length > 0).map((order) => order.id);
    if (!orderIds.length) return;
    const pickList = await prisma.pickList.create({ data: { orders: { connect: orderIds.map((id) => ({ id })) }, items: { create: orders.flatMap((order) => order.items.map((item) => ({ skuId: item.skuId, qtyRequired: item.qty }))) } } });
    redirect(`/dashboard/picking/${pickList.id}`);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Pick Lists" description="Assign and execute warehouse picks." action={<form action={createSuggestedPickList}><Button type="submit">Create New Pick List</Button></form>} />
      <Card><CardContent className="pt-4"><Table><TableHeader><TableRow><TableHead>Pick List</TableHead><TableHead>Status</TableHead><TableHead>Assignee</TableHead><TableHead>Orders</TableHead><TableHead>Items</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{pickLists.map((pickList) => <TableRow key={pickList.id}><TableCell className="font-mono text-sm">{pickList.id.slice(-8).toUpperCase()}</TableCell><TableCell>{pickList.status}</TableCell><TableCell>{pickList.assignee?.name ?? pickList.assignee?.email ?? "Unassigned"}</TableCell><TableCell>{pickList.orders.length}</TableCell><TableCell>{pickList.items.length}</TableCell><TableCell><a href={`/dashboard/picking/${pickList.id}`} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 hover:bg-accent hover:text-accent-foreground transition-colors">Open</a></TableCell></TableRow>)}{!pickLists.length ? <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No pick lists yet. {eligibleOrders.length ? "Create one from awaiting orders." : "No eligible orders."}</TableCell></TableRow> : null}</TableBody></Table></CardContent></Card>
      <Card><CardContent className="grid gap-4 p-4 md:grid-cols-2"><div><p className="font-medium">Available pickers</p><p className="text-sm text-muted-foreground">{users.map((user) => user.name ?? user.email).join(", ") || "No active users"}</p></div><div><p className="font-medium">Awaiting fulfillment orders</p><p className="text-sm text-muted-foreground">{eligibleOrders.map((order) => order.customerName ?? order.id.slice(-8)).join(", ") || "None"}</p></div></CardContent></Card>
    </div>
  );
}

