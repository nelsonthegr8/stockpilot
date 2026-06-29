import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function InventoryPage() {
  await auth();
  const levels = await prisma.inventoryLevel.findMany({
    include: { sku: { include: { variant: { include: { product: true } } } }, location: true },
    orderBy: [{ sku: { sku: "asc" } }],
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory Levels</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/dashboard/inventory/count">Cycle Count</Link></Button>
          <Button variant="outline" asChild><Link href="/dashboard/inventory/receive/printed-parts">Receive Printed Parts</Link></Button>
          <Button asChild><Link href="/dashboard/inventory/receive">Receive</Link></Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Product</TableHead><TableHead>Location</TableHead><TableHead className="text-right">On Hand</TableHead><TableHead className="text-right">Reserved</TableHead><TableHead className="text-right">Available</TableHead><TableHead className="text-right">Reorder At</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {levels.map((level) => {
                const available = level.qty - level.reservedQty;
                const isLow = level.sku.reorderPoint > 0 && level.qty <= level.sku.reorderPoint;
                const isOut = level.qty === 0;
                return <TableRow key={level.id} className={isOut ? "bg-red-50" : isLow ? "bg-yellow-50" : ""}><TableCell className="font-mono text-sm">{level.sku.sku}</TableCell><TableCell>{level.sku.variant.product.name} — {level.sku.variant.name}</TableCell><TableCell>{level.location.name}</TableCell><TableCell className="text-right">{level.qty}</TableCell><TableCell className="text-right">{level.reservedQty}</TableCell><TableCell className="text-right font-medium">{available}</TableCell><TableCell className="text-right">{level.sku.reorderPoint || "—"}</TableCell><TableCell>{isOut ? <Badge variant="destructive">Out of Stock</Badge> : isLow ? <Badge className="bg-yellow-500 text-white">Low Stock</Badge> : <Badge variant="outline">OK</Badge>}</TableCell></TableRow>;
              })}
              {levels.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No inventory levels found</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
