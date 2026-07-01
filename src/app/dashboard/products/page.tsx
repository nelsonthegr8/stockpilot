import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { DeleteProductButton } from "@/components/dashboard/DeleteProductButton";
import { PageHeader } from "@/components/dashboard/shared";

const PROFILE_LABELS: Record<string, string> = {
  THREE_D_PRINT: "3D Print",
  RETAIL_ARBITRAGE: "Retail Arb.",
  DROP_SHIP: "Drop Ship",
  WHOLESALE: "Wholesale",
};

const PROFILE_COLORS: Record<string, string> = {
  THREE_D_PRINT: "bg-blue-100 text-blue-800",
  RETAIL_ARBITRAGE: "bg-green-100 text-green-800",
  DROP_SHIP: "bg-yellow-100 text-yellow-800",
  WHOLESALE: "bg-purple-100 text-purple-800",
};

export default async function ProductsPage({ searchParams }: { searchParams: { search?: string; profile?: string; page?: string } }) {
  const session = await auth();
  const search = searchParams.search ?? "";
  const profile = searchParams.profile;
  const page = parseInt(searchParams.page ?? "1", 10);
  const limit = 20;

  const where = {
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(profile && profile !== "ALL" ? { businessProfileType: profile as never } : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, include: { category: true, variants: { include: { skus: true } } }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.product.count({ where }),
  ]);

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = ["ADMIN", "MANAGER"].includes(role ?? "");
  const query = new URLSearchParams({ ...(search ? { search } : {}), ...(profile ? { profile } : {}) });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader title="Products" description="Manage your product catalog" action={canEdit ? <Link href="/dashboard/products/new" className={buttonVariants()}><Plus className="mr-2 h-4 w-4" />New Product</Link> : undefined} />
      </div>
      <Card>
        <CardHeader>
          <form className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input name="search" defaultValue={search} placeholder="Search products…" className="max-w-xs" />
            <select name="profile" defaultValue={profile ?? "ALL"} className="border rounded-md px-3 py-2 text-sm bg-background h-10">
              <option value="ALL">All profiles</option>
              <option value="THREE_D_PRINT">3D Print</option>
              <option value="RETAIL_ARBITRAGE">Retail Arbitrage</option>
              <option value="DROP_SHIP">Drop Ship</option>
              <option value="WHOLESALE">Wholesale</option>
            </select>
            <Button type="submit" variant="outline"><Search className="h-4 w-4" /></Button>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Profile</TableHead><TableHead>Category</TableHead><TableHead>Variants</TableHead><TableHead>SKUs</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {products.map((product) => <TableRow key={product.id}><TableCell className="font-medium">{product.name}</TableCell><TableCell><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PROFILE_COLORS[product.businessProfileType]}`}>{PROFILE_LABELS[product.businessProfileType]}</span></TableCell><TableCell>{product.category?.name ?? "—"}</TableCell><TableCell>{product.variants.length}</TableCell><TableCell>{product.variants.reduce((sum, variant) => sum + variant.skus.length, 0)}</TableCell><TableCell><Badge variant={product.active ? "default" : "secondary"}>{product.active ? "Active" : "Inactive"}</Badge></TableCell><TableCell className="flex items-center gap-1"><Link href={`/dashboard/products/${product.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>View</Link>{role === "ADMIN" ? <DeleteProductButton productId={product.id} productName={product.name} size="sm" /> : null}</TableCell></TableRow>)}
              {products.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No products found</TableCell></TableRow> : null}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {total ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} of {total}</span>
            <div className="flex gap-2">
              {page > 1 ? <Link href={`?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page - 1) }).toString()}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Previous</Link> : null}
              {page * limit < total ? <Link href={`?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page + 1) }).toString()}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Next</Link> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
