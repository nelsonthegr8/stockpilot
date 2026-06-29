import { prisma } from "@/lib/prisma";
import { CategoriesManager } from "@/components/dashboard/CategoriesManager";
import { PageHeader } from "@/components/dashboard/shared";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({ where: { parentId: null }, include: { children: true }, orderBy: { name: "asc" } });
  return <div className="space-y-6 p-6"><PageHeader title="Categories" description="Maintain the product taxonomy used throughout StockPilot." /><CategoriesManager initialCategories={categories as never} /></div>;
}
