import { prisma } from "@/lib/prisma";
import { ProductEditor } from "@/components/dashboard/ProductEditor";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <ProductEditor mode="create" categories={categories} />;
}
