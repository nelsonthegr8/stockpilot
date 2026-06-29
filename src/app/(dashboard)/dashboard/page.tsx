import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, AlertTriangle, Boxes } from "lucide-react";

async function getDashboardStats() {
  const [totalProducts, pendingOrders, lowStockCount, totalSKUs] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.order.count({ where: { status: { in: ["PENDING", "AWAITING_FULFILLMENT", "IN_PRODUCTION"] } } }),
    prisma.inventoryLevel.count({
      where: { sku: { reorderPoint: { gt: 0 } }, qty: { lte: 5 } },
    }),
    prisma.sKU.count(),
  ]);
  return { totalProducts, pendingOrders, lowStockCount, totalSKUs };
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session?.user?.name ?? session?.user?.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">{stats.totalSKUs} SKUs total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Items below threshold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inventory Levels</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockCount === 0 ? "✓" : stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.lowStockCount === 0 ? "All stocked" : "Need reorder"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
