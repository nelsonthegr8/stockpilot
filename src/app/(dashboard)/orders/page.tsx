import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800",
  AWAITING_FULFILLMENT: "bg-blue-100 text-blue-800",
  IN_PRODUCTION: "bg-orange-100 text-orange-800",
  READY_TO_SHIP: "bg-green-100 text-green-800",
  SHIPPED: "bg-teal-100 text-teal-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-purple-100 text-purple-800",
};

export default async function OrdersPage({ searchParams }: { searchParams: { status?: string; page?: string } }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const status = searchParams.status;
  const page = parseInt(searchParams.page ?? "1", 10);
  const limit = 20;

  const where = status && status !== "ALL" ? { status: status as never } : {};
  const [orders, total, statusCounts] = await Promise.all([
    prisma.order.findMany({ where, include: { channel: true, items: true }, skip: (page - 1) * limit, take: limit, orderBy: { placedAt: "desc" } }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);

  const countMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        {["ADMIN", "MANAGER"].includes(role ?? "") ? <Link href="/dashboard/orders/new" className={buttonVariants()}><Plus className="mr-2 h-4 w-4" />New Order</Link> : null}
      </div>
      <div className="flex flex-wrap gap-2">{["ALL", "PENDING", "AWAITING_FULFILLMENT", "IN_PRODUCTION", "READY_TO_SHIP", "SHIPPED", "DELIVERED"].map((value) => <Link key={value} href={`?status=${value}`}><span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border cursor-pointer transition-colors ${status === value || (!status && value === "ALL") ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}>{value.replaceAll("_", " ")}{value !== "ALL" && countMap[value] ? <span className="ml-1 text-xs">({countMap[value]})</span> : null}</span></Link>)}</div>
      <Card><CardContent className="pt-4"><Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Channel</TableHead><TableHead>Items</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{orders.map((order) => <TableRow key={order.id}><TableCell className="font-mono text-sm">{order.id.slice(-8).toUpperCase()}</TableCell><TableCell>{order.customerName ?? "—"}</TableCell><TableCell>{order.channel?.name ?? "Manual"}</TableCell><TableCell>{order.items.length}</TableCell><TableCell>${Number(order.total).toFixed(2)}</TableCell><TableCell><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status] ?? ""}`}>{order.status.replaceAll("_", " ")}</span></TableCell><TableCell className="text-sm text-muted-foreground">{order.placedAt.toLocaleDateString()}</TableCell><TableCell><Link href={`/dashboard/orders/${order.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>View</Link></TableCell></TableRow>)}{orders.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No orders found</TableCell></TableRow> : null}</TableBody></Table><div className="mt-4 flex justify-between text-sm text-muted-foreground"><span>Showing {total ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} of {total}</span></div></CardContent></Card>
    </div>
  );
}
