import { prisma } from "@/lib/prisma";
import { SuppliersManager } from "@/components/dashboard/SuppliersManager";
import { PageHeader } from "@/components/dashboard/shared";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  return <div className="space-y-6 p-6"><PageHeader title="Suppliers" description="Manage vendor records and lead times." /><SuppliersManager initialSuppliers={suppliers} /></div>;
}
